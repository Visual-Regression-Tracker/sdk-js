import {
  Config,
  BuildResponse,
  TestRun,
  TestRunResponse,
  TestStatus,
} from "./types";
import { readFileSync, existsSync } from "fs";
import TestRunResult from "./testRunResult";
import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";

const CONFIG_FILE_PATH = "./vrt.json";
const REQUIRE_CONFIG_FIELDS = ["apiUrl", "branchName", "project", "apiKey"];
const CONFIG_ENV_MAPPING = {
  apiUrl: "VRT_APIURL",
  ciBuildId: "VRT_CIBUILDID",
  branchName: "VRT_BRANCHNAME",
  project: "VRT_PROJECT",
  apiKey: "VRT_APIKEY",
  enableSoftAssert: "VRT_ENABLESOFTASSERT",
};

export class VisualRegressionTracker {
  private config: Config = {
    apiUrl: "",
    apiKey: "",
    project: "",
    branchName: "",
    ciBuildId: "",
    enableSoftAssert: false,
  };
  private buildId: string | undefined;
  private projectId: string | undefined;
  private axiosConfig: AxiosRequestConfig;

  constructor(explicitConfig?: Config) {
    if (explicitConfig) {
      this.config = explicitConfig;
    } else {
      this.readConfigFromFile();
      this.readConfigFromEnv();
    }
    this.validateConfig();
    this.axiosConfig = {
      headers: {
        apiKey: this.config.apiKey,
      },
    };
  }

  private isStarted() {
    return !!this.buildId && !!this.projectId;
  }

  async start() {
    const data = {
      branchName: this.config.branchName,
      project: this.config.project,
      ciBuildId: this.config.ciBuildId,
    };

    const build: BuildResponse = await axios
      .post(`${this.config.apiUrl}/builds`, data, this.axiosConfig)
      .then(this.handleResponse)
      .catch(this.handleException);

    this.buildId = build.id;
    this.projectId = build.projectId;
  }

  async stop() {
    if (!this.isStarted()) {
      throw new Error("Visual Regression Tracker has not been started");
    }

    await axios
      .patch(
        `${this.config.apiUrl}/builds/${this.buildId}`,
        {},
        this.axiosConfig
      )
      .then(this.handleResponse)
      .catch(this.handleException);
  }

  private async submitTestResult(test: TestRun): Promise<TestRunResponse> {
    if (!this.isStarted()) {
      throw new Error("Visual Regression Tracker has not been started");
    }

    const data = {
      buildId: this.buildId,
      projectId: this.projectId,
      branchName: this.config.branchName,
      ...test,
    };

    return axios
      .post(`${this.config.apiUrl}/test-runs`, data, this.axiosConfig)
      .then(this.handleResponse)
      .catch(this.handleException);
  }

  private async handleResponse(response: AxiosResponse) {
    return response.data;
  }

  private async handleException(error: AxiosError) {
    if (!error.response) {
      throw new Error("No response from server");
    }
    const status = error.response.status;
    switch (status) {
      case 401:
        throw new Error("Unauthorized");
      case 403:
        throw new Error("Api key not authenticated");
      case 404:
        throw new Error("Project not found");
      default:
        throw new Error(JSON.stringify(error.response.data, null, "\t"));
    }
  }

  async track(test: TestRun): Promise<TestRunResult> {
    const testRunResponse = await this.submitTestResult(test);

    this.processTestRun(testRunResponse);

    return new TestRunResult(testRunResponse, this.config.apiUrl);
  }

  private processTestRun(testRunResponse: TestRunResponse): void {
    let errorMessage: string | undefined;
    switch (testRunResponse.status) {
      case TestStatus.new: {
        errorMessage = `No baseline: ${testRunResponse.url}`;
        break;
      }
      case TestStatus.unresolved: {
        errorMessage = `Difference found: ${testRunResponse.url}`;
        break;
      }
    }

    if (errorMessage) {
      if (this.config.enableSoftAssert) {
        // eslint-disable-next-line no-console
        console.error(errorMessage);
      } else {
        throw new Error(errorMessage);
      }
    }
  }

  private readConfigFromFile() {
    if (existsSync(CONFIG_FILE_PATH)) {
      const fileConfig = JSON.parse(readFileSync(CONFIG_FILE_PATH).toString());
      this.config = {
        apiKey: fileConfig.apiKey,
        apiUrl: fileConfig.apiUrl,
        branchName: fileConfig.branchName,
        project: fileConfig.project,
        enableSoftAssert: fileConfig.enableSoftAssert,
        ciBuildId: fileConfig.ciBuildId,
      };
    }
  }

  private readConfigFromEnv() {
    Object.entries(CONFIG_ENV_MAPPING).forEach(([k, v]) => {
      if (process.env[v]) {
        this.config[k] = process.env[v];
      }
    });
  }

  private validateConfig() {
    REQUIRE_CONFIG_FIELDS.forEach((field) => {
      if (!this.config[field]) {
        throw new Error(
          `Visual Regression Tracker config is not valid. ${field} is specified`
        );
      }
    });
  }
}

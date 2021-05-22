import {
  Config,
  BuildResponse,
  TestRunResponse,
  TestStatus,
  TestRunMultipart,
  TestRunBase64,
} from "./types";
import TestRunResult from "./testRunResult";
import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import {
  instanceOfTestRunBase64,
  readConfigFromEnv,
  readConfigFromFile,
  multipartDtoToFormData,
  validateConfig,
} from "./helpers";
import { TestRunBase64Dto } from "types/request";

export class VisualRegressionTracker {
  private config: Config = {
    apiUrl: "",
    apiKey: "",
    project: "",
    branchName: "",
  };
  private buildId: string = "";
  private projectId: string = "";
  private axiosConfig: AxiosRequestConfig;

  constructor(explicitConfig?: Config) {
    if (explicitConfig) {
      this.config = explicitConfig;
    } else {
      this.config = readConfigFromFile(this.config);
      this.config = readConfigFromEnv(this.config);
    }
    validateConfig(this.config);
    this.axiosConfig = {
      headers: {
        apiKey: this.config.apiKey,
      },
    };
  }

  private isStarted() {
    return !!this.buildId && !!this.projectId;
  }

  async start(): Promise<BuildResponse> {
    const data = {
      branchName: this.config.branchName,
      project: this.config.project,
      ciBuildId: this.config.ciBuildId,
    };

    return axios
      .post(`${this.config.apiUrl}/builds`, data, this.axiosConfig)
      .then(this.handleResponse)
      .catch(this.handleException)
      .then((build: BuildResponse) => {
        this.buildId = build.id;
        this.projectId = build.projectId;
        return build;
      });
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

  private async submitTestRunBase64(
    test: TestRunBase64
  ): Promise<TestRunResponse> {
    const data: TestRunBase64Dto = {
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

  private async submitTestRunMultipart(
    test: TestRunMultipart
  ): Promise<TestRunResponse> {
    const data = multipartDtoToFormData({
      buildId: this.buildId,
      projectId: this.projectId,
      branchName: this.config.branchName,
      ...test,
    });

    return axios
      .post(`${this.config.apiUrl}/test-runs/multipart`, data, {
        headers: {
          ...data.getHeaders(),
          "Content-Length": data.getLengthSync(),
          apiKey: this.config.apiKey,
        },
      })
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

  async track(test: TestRunBase64 | TestRunMultipart): Promise<TestRunResult> {
    if (!this.isStarted()) {
      throw new Error("Visual Regression Tracker has not been started");
    }

    let testRunResponse;
    if (instanceOfTestRunBase64(test)) {
      testRunResponse = await this.submitTestRunBase64(test);
    } else {
      testRunResponse = await this.submitTestRunMultipart(test);
    }

    this.processTestRun(testRunResponse);

    return new TestRunResult(testRunResponse, this.config.apiUrl);
  }

  private processTestRun(testRunResponse: TestRunResponse) {
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
}

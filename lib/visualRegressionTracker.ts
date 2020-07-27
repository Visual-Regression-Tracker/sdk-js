import { Config, Build, TestRun, TestRunResult, TestRunStatus } from "./types";
import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";

export class VisualRegressionTracker {
  config: Config;
  buildId: string | undefined;
  projectId: string | undefined;
  axiosConfig: AxiosRequestConfig;

  constructor(config: Config) {
    this.config = config;
    this.axiosConfig = {
      headers: {
        apiKey: this.config.apiKey,
      },
    };
  }

  private async startBuild() {
    if (!this.buildId) {
      const data = {
        branchName: this.config.branchName,
        project: this.config.project,
      };

      const build: Build = await axios
        .post(`${this.config.apiUrl}/builds`, data, this.axiosConfig)
        .then(this.handleResponse)
        .catch(this.handleException);

      if (build.id) {
        this.buildId = build.id;
      } else {
        throw new Error("Build id is not defined");
      }
      if (build.projectId) {
        this.projectId = build.projectId;
      } else {
        throw new Error("Project id is not defined");
      }
    }
  }

  private async submitTestResult(test: TestRun): Promise<TestRunResult> {
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
    const status = error.response?.status;
    if (status === 401) {
      return Promise.reject("Unauthorized");
    }
    if (status === 403) {
      return Promise.reject("Api key not authenticated");
    }
    if (status === 404) {
      return Promise.reject("Project not found");
    }

    return Promise.reject(error.message);
  }

  async track(test: TestRun) {
    await this.startBuild();

    const result = await this.submitTestResult(test);

    if (result.status === TestRunStatus.new) {
      throw new Error(`No baseline: ${result.url}`);
    }
    if (result.status === TestRunStatus.unresolved) {
      throw new Error(`Difference found: ${result.url}`);
    }
  }
}

import FormData from "form-data";
import axios, { AxiosRequestConfig, AxiosResponse, AxiosError, RawAxiosRequestHeaders, AxiosHeaders, AxiosRequestHeaders } from "axios";

import {
  Config,
  BuildResponse,
  TestRunResponse,
  TestRunMultipart,
  TestRunBase64,
  TestRunBuffer,
  TestRunBase64Dto,
} from "./types";
import TestRunResult from "./testRunResult";
import {
  instanceOfTestRunBase64,
  readConfigFromEnv,
  readConfigFromFile,
  multipartDtoToFormData,
  validateConfig,
  instanceOfTestRunBuffer,
  bufferDtoToFormData,
  trackWithRetry,
  instanceOfTestRunMultipart,
} from "./helpers";

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
        project: this.config.project,
      },
    };
  }

  private isStarted() {
    return !!this.buildId && !!this.projectId;
  }

  async start(): Promise<BuildResponse> {
    const data = {
      branchName: this.config.branchName,
      baselineBranchName: this.config.baselineBranchName,
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
      baselineBranchName: this.config.baselineBranchName,
      ...test,
    };

    return axios
      .post(`${this.config.apiUrl}/test-runs`, data, this.axiosConfig)
      .then(this.handleResponse)
      .catch(this.handleException);
  }

  private async submitTestRunMultipart(
    data: FormData
  ): Promise<TestRunResponse> {
    
    const config: AxiosRequestConfig = {
      headers: {
        ...data.getHeaders(),
        "Content-Length": data.getLengthSync(),
        ...this.axiosConfig.headers,
      },
    };
    return axios
      .post(`${this.config.apiUrl}/test-runs/multipart`, data, config)
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

  private getFormData(
    test: TestRunBase64 | TestRunMultipart | TestRunBuffer
  ): FormData {
    if (instanceOfTestRunBuffer(test)) {
      return bufferDtoToFormData({
        buildId: this.buildId,
        projectId: this.projectId,
        branchName: this.config.branchName,
        baselineBranchName: this.config.baselineBranchName,
        ...test,
      });
    } else if (instanceOfTestRunMultipart(test)) {
      return multipartDtoToFormData({
        buildId: this.buildId,
        projectId: this.projectId,
        branchName: this.config.branchName,
        baselineBranchName: this.config.baselineBranchName,
        ...test,
      });
    }
    throw new Error("Invalid test run data");
  }

  /**
   * Submit test data to external VRT service
   *
   * @param test Test data to track
   * @param retryCount Retry count, default is 2
   * @returns
   */
  async track(
    test: TestRunBase64 | TestRunMultipart | TestRunBuffer,
    retryCount: number = 2
  ): Promise<TestRunResult> {
    if (!this.isStarted()) {
      throw new Error("Visual Regression Tracker has not been started");
    }

    let testRunResponse;
    if (instanceOfTestRunBase64(test)) {
      testRunResponse = await trackWithRetry(
        () => this.submitTestRunBase64(test),
        retryCount,
        this.config.enableSoftAssert
      );
    } else {
      testRunResponse = await trackWithRetry(
        () => this.submitTestRunMultipart(this.getFormData(test)),
        retryCount,
        this.config.enableSoftAssert
      );
    }

    return new TestRunResult(testRunResponse, this.config.apiUrl);
  }
}

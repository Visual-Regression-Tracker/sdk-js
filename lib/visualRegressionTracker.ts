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
  migrateDeprecatedConfig,
  multipartDtoToFormData,
  validateConfig,
  instanceOfTestRunBuffer,
  bufferDtoToFormData,
  trackWithRetry,
  instanceOfTestRunMultipart,
} from "./helpers";

const serverMessage = (data: unknown): string | undefined => {
  if (!data || typeof data !== "object") {
    return undefined;
  }
  const { message } = data as { message?: unknown };
  if (Array.isArray(message)) {
    return message.join(", ");
  }
  return typeof message === "string" ? message : JSON.stringify(data);
};

const errorHint = (status: number, retryAfter?: string): string | undefined => {
  switch (status) {
    case 401:
      return "Check apiKey.";
    case 403:
      return "Check that the apiKey's user has access to the project.";
    case 404:
      return "Check apiUrl and project.";
    case 409:
      return "Another change to the same build or project is in progress; try again.";
    case 413:
      return "Track the image with imagePath or imageBuffer (multipart) instead of imageBase64, or raise BODY_PARSER_JSON_LIMIT on the server.";
    case 422:
      return "Track a smaller image or raise MAX_IMAGE_PIXELS on the server.";
    case 503:
      return retryAfter
        ? `The server's image diff queue is full; retry after ${retryAfter} seconds.`
        : "The server is unavailable; try again later.";
  }
};

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
      this.config = migrateDeprecatedConfig(explicitConfig);
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
        { isRunning: false },
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
      sourceBranch: this.config.sourceBranch,
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

  private async handleException(error: AxiosError): Promise<never> {
    const request = `${error.config?.method?.toUpperCase()} ${error.config?.url}`;
    if (!error.response) {
      throw new Error(`No response from server for ${request}: ${error.message}`, {
        cause: error,
      });
    }
    const { status, data, statusText, headers } = error.response;
    const hint = errorHint(status, headers["retry-after"]);
    const message = `${request} returned ${status}: ${serverMessage(data) || statusText || error.message}`;
    throw new Error(hint ? `${message}. ${hint}` : message);
  }

  private getFormData(
    test: TestRunBase64 | TestRunMultipart | TestRunBuffer
  ): FormData {
    if (instanceOfTestRunBuffer(test)) {
      return bufferDtoToFormData({
        buildId: this.buildId,
        projectId: this.projectId,
        branchName: this.config.branchName,
        sourceBranch: this.config.sourceBranch,
        ...test,
      });
    } else if (instanceOfTestRunMultipart(test)) {
      return multipartDtoToFormData({
        buildId: this.buildId,
        projectId: this.projectId,
        branchName: this.config.branchName,
        sourceBranch: this.config.sourceBranch,
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

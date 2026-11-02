import http from "http";
import https from "https";
import FormData from "form-data";
import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";

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
  CONNECT_TIMEOUT_SECONDS,
  DEFAULT_HTTP_TIMEOUT_SECONDS,
  sendWithRetry,
  withConnectTimeout,
} from "./helpers";

const httpAgent = withConnectTimeout(
  new http.Agent({ keepAlive: true }),
  CONNECT_TIMEOUT_SECONDS
);
const httpsAgent = withConnectTimeout(
  new https.Agent({ keepAlive: true }),
  CONNECT_TIMEOUT_SECONDS
);

export class ServerError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly serverMessage?: string
  ) {
    super(message);
    this.name = "ServerError";
  }
}

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

const errorHint = (
  status: number,
  url: string,
  retryAfter: string | undefined,
  serverReason: string | undefined
): string | undefined => {
  switch (status) {
    case 401:
      return "Check apiKey.";
    case 403:
      return "Check that the apiKey's user has access to the project.";
    case 404:
      return serverReason && !/^Cannot [A-Z]+ \//.test(serverReason)
        ? undefined
        : "Check apiUrl and project.";
    case 409:
      return "Another change to the same build or project is in progress; try again.";
    case 413:
      if (url.endsWith("/test-runs/multipart")) {
        return "Raise MULTIPART_FILE_SIZE_LIMIT (or the proxy's body size limit) on the server.";
      }
      if (url.endsWith("/test-runs")) {
        return "Track the image with imagePath or imageBuffer (multipart) instead of imageBase64, or raise BODY_PARSER_JSON_LIMIT on the server.";
      }
      return "Raise BODY_PARSER_JSON_LIMIT on the server.";
    case 422:
      return "Track a smaller image or raise MAX_IMAGE_PIXELS on the server.";
    case 503:
      return retryAfter
        ? `The server is busy or restarting; try again after Retry-After: ${retryAfter}.`
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
      timeout:
        (this.config.httpTimeoutInSeconds ?? DEFAULT_HTTP_TIMEOUT_SECONDS) * 1000,
      httpAgent,
      httpsAgent,
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

    return this.send<BuildResponse>(() =>
      axios.post(`${this.config.apiUrl}/builds`, data, this.axiosConfig)
    ).then((build) => {
      this.buildId = build.id;
      this.projectId = build.projectId;
      return build;
    });
  }

  async stop() {
    if (!this.isStarted()) {
      throw new Error("Visual Regression Tracker has not been started");
    }

    await this.send(() =>
      axios.patch(
        `${this.config.apiUrl}/builds/${this.buildId}`,
        { isRunning: false },
        this.axiosConfig
      )
    );
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

    return this.send(() =>
      axios.post(`${this.config.apiUrl}/test-runs`, data, this.axiosConfig)
    );
  }

  private async submitTestRunMultipart(
    test: TestRunMultipart | TestRunBuffer
  ): Promise<TestRunResponse> {
    return this.send(() => {
      const data = this.getFormData(test);
      return axios.post(`${this.config.apiUrl}/test-runs/multipart`, data, {
        ...this.axiosConfig,
        headers: {
          ...data.getHeaders(),
          "Content-Length": data.getLengthSync(),
          ...this.axiosConfig.headers,
        },
      });
    });
  }

  private send<T>(request: () => Promise<AxiosResponse<T>>): Promise<T> {
    return sendWithRetry(request)
      .then(this.handleResponse)
      .catch(this.handleException);
  }

  private async handleResponse(response: AxiosResponse) {
    return response.data;
  }

  private async handleException(error: AxiosError): Promise<never> {
    const url = (error.config?.url ?? "").replace(/\/\/[^/@]*@/, "//");
    const request = error.config
      ? `${error.config.method?.toUpperCase()} ${url}`
      : "VRT request";
    if (!error.response) {
      const code = error.code ? ` (${error.code})` : "";
      // not the AxiosError itself: its config holds the apiKey header
      throw new Error(
        `No response from server for ${request}${code}: ${error.message}`,
        { cause: error.cause }
      );
    }
    const { status, data, statusText, headers } = error.response;
    const fromServer = serverMessage(data);
    const detail = fromServer || statusText || error.message;
    const hint = errorHint(status, url, headers["retry-after"], fromServer);
    const text = hint ? `${detail.replace(/\.$/, "")}. ${hint}` : detail;
    throw new ServerError(`${request} returned ${status}: ${text}`, status, fromServer);
  }

  private getFormData(test: TestRunMultipart | TestRunBuffer): FormData {
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
        () => this.submitTestRunMultipart(test),
        retryCount,
        this.config.enableSoftAssert
      );
    }

    return new TestRunResult(testRunResponse, this.config.apiUrl);
  }
}

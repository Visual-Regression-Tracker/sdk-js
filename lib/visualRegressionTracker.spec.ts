import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosRequestHeaders,
  AxiosResponse,
} from "axios";
import { mocked } from "jest-mock";
import FormData from "form-data";
import http from "http";
import https from "https";
import { inspect } from "util";
import { testRunOkResponse, testRunUnresolvedResponse } from "./__data__";
import { ServerError, VisualRegressionTracker } from "./visualRegressionTracker";
import {
  Config,
  BuildResponse,
  TestRunResponse,
  TestStatus,
  TestRunBase64,
  TestRunMultipart,
  TestRunBuffer,
} from "./types";
import TestRunResult from "./testRunResult";
import * as configHelper from "./helpers/config.helper";
import * as dtoHelper from "./helpers/dto.helper";

jest.mock("axios");
const mockedAxios = mocked(axios);

jest.mock("./testRunResult");
const mockedTestRunResult = mocked(TestRunResult);

jest.mock("./helpers/config.helper", () => ({
  ...jest.requireActual("./helpers/config.helper"),
  readConfigFromFile: jest.fn(),
  readConfigFromEnv: jest.fn(),
  validateConfig: jest.fn(),
}));
const mockedConfigHelper = mocked(configHelper);

jest.mock("./helpers/dto.helper");
const mockedDtoHelper = mocked(dtoHelper);

const headers = AxiosHeaders.from({
  'Content-Type': 'application/json'
});

const axiosError = (
  status: number,
  data: unknown,
  responseHeaders: Record<string, string> = {},
  statusText = "",
  url = "http://localhost:4200/test-runs"
): AxiosError => ({
  isAxiosError: true,
  toJSON: jest.fn(),
  name: "AxiosError",
  message: `Request failed with status code ${status}`,
  config: { headers, method: "post", url },
  response: {
    status,
    data,
    statusText,
    headers: responseHeaders,
    config: { headers },
  },
});

const errorBody = (statusCode: number, message: string | string[]) => ({
  statusCode,
  path: "/test-runs",
  name: "HttpException",
  message,
});

const axiosError401 = axiosError(401, errorBody(401, "Unauthorized"));

const config: Config = {
  apiUrl: "http://localhost:4200",
  branchName: "develop",
  sourceBranch: "next-release",
  project: "Default project",
  apiKey: "CPKVK4JNK24NVNPNGVFQ853HXXEG",
  enableSoftAssert: false,
  ciBuildId: "someCIBuildId",
};

const requestOptions = {
  headers: {
    apiKey: config.apiKey,
    project: config.project,
  },
  timeout: 360_000,
  httpAgent: expect.any(http.Agent),
  httpsAgent: expect.any(https.Agent),
};

const testRunBase64: TestRunBase64 = {
  name: "name",
  imageBase64: "iamge",
  os: "os",
  device: "device",
  customTags: "customTags",
  viewport: "viewport",
  browser: "browser",
  ignoreAreas: [
    {
      x: 1,
      y: 2,
      height: 300,
      width: 400,
    },
  ],
};

const testRunMultipart: TestRunMultipart = {
  name: "name",
  imagePath: "./lib/__data__/2.png",
  os: "os",
  device: "device",
  customTags: "customTags",
  viewport: "viewport",
  browser: "browser",
  ignoreAreas: [
    {
      x: 1,
      y: 2,
      height: 300,
      width: 400,
    },
  ],
  comment: "comment",
};

const testRunBuffer: TestRunBuffer = {
  name: "name",
  imageBuffer: Buffer.of(1, 2, 3),
  os: "os",
  device: "device",
  customTags: "customTags",
  viewport: "viewport",
  browser: "browser",
  ignoreAreas: [
    {
      x: 1,
      y: 2,
      height: 300,
      width: 400,
    },
  ],
  comment: "comment",
};

describe("VisualRegressionTracker", () => {
  let vrt: VisualRegressionTracker;

  beforeEach(async () => {
    vrt = new VisualRegressionTracker(config);
    mockedAxios.post.mockClear();
    mockedAxios.patch.mockClear();
  });

  describe("constructor", () => {
    const fileConfig: Config = {
      apiUrl: "apiUrlFile",
      branchName: "branchNameFile",
      sourceBranch: "sourceBranchFile",
      project: "projectFile",
      apiKey: "apiKeyFile",
      enableSoftAssert: false,
      ciBuildId: "ciBuildIdFile",
    };
    const envConfig: Config = {
      apiUrl: "apiUrlEnv",
      branchName: "branchNameEnv",
      sourceBranch: "sourceBranchEnv",
      project: "projectEnv",
      apiKey: "apiKeyEnv",
      enableSoftAssert: false,
      ciBuildId: "ciBuildIdEnv",
    };

    beforeEach(() => {
      mockedConfigHelper.readConfigFromFile.mockReturnValueOnce(fileConfig);
      mockedConfigHelper.readConfigFromEnv.mockReturnValueOnce(envConfig);
    });

    it("should use explicit config", () => {
      new VisualRegressionTracker(config);

      expect(mockedConfigHelper.validateConfig).toHaveBeenCalledWith(config);
    });

    it("should use env over file config", () => {
      new VisualRegressionTracker();

      expect(mockedConfigHelper.validateConfig).toHaveBeenCalledWith(envConfig);
    });

    it("should use deprecated baselineBranchName as sourceBranch", () => {
      jest.spyOn(console, "warn").mockImplementation(() => {});
      const { sourceBranch, ...legacyConfig } = config;

      new VisualRegressionTracker({
        ...legacyConfig,
        baselineBranchName: "legacy",
      });

      expect(mockedConfigHelper.validateConfig).toHaveBeenLastCalledWith({
        ...legacyConfig,
        sourceBranch: "legacy",
      });
    });
  });

  describe.each([
    ["", "", false],
    ["some", "", false],
    ["", "some", false],
    ["some", "some", true],
  ])("isStarted", (buildId, projectId, expectedResult) => {
    it(`should return ${expectedResult} if buildId ${buildId} projectId ${projectId}`, () => {
      vrt["buildId"] = buildId;
      vrt["projectId"] = projectId;

      const result = vrt["isStarted"]();

      expect(result).toBe(expectedResult);
    });
  });

  describe("track", () => {
    it("should throw if not started", async () => {
      vrt["isStarted"] = jest.fn().mockReturnValueOnce(false);

      await expect(
        vrt.track({
          name: "name",
          imageBase64: "image",
        })
      ).rejects.toThrow(
        new Error("Visual Regression Tracker has not been started")
      );
    });

    it("should track base64 without retry", async () => {
      const responce = testRunOkResponse;
      vrt["isStarted"] = jest.fn().mockReturnValueOnce(true);
      vrt["submitTestRunBase64"] = jest.fn().mockResolvedValue(responce);

      await vrt.track(testRunBase64);

      expect(vrt["submitTestRunBase64"]).toHaveBeenCalledWith(testRunBase64);
      expect(vrt["submitTestRunBase64"]).toHaveBeenCalledTimes(1);
      expect(mockedTestRunResult).toHaveBeenCalledWith(
        responce,
        "http://localhost:4200"
      );
    });

    it("should track base64 with retry", async () => {
      const responce = testRunUnresolvedResponse;
      vrt["isStarted"] = jest.fn().mockReturnValueOnce(true);
      vrt["submitTestRunBase64"] = jest.fn().mockResolvedValue(responce);

      await expect(vrt.track(testRunBase64, 3)).rejects.toThrow(
        "Difference found: url"
      );
      expect(vrt["submitTestRunBase64"]).toHaveBeenCalledTimes(4);
      expect(vrt["submitTestRunBase64"]).toHaveBeenCalledWith(testRunBase64);
    });

    it("should track multipart without retry", async () => {
      const responce = testRunOkResponse;
      const data = new FormData();
      const buildId = "1312";
      const projectId = "asd";
      vrt["buildId"] = buildId;
      vrt["projectId"] = projectId;
      vrt["isStarted"] = jest.fn().mockReturnValueOnce(true);
      mockedAxios.post.mockResolvedValueOnce({ data: responce });
      mockedDtoHelper.multipartDtoToFormData.mockReturnValueOnce(data);

      await vrt.track(testRunMultipart);

      expect(mockedDtoHelper.multipartDtoToFormData).toHaveBeenCalledWith({
        buildId,
        projectId,
        branchName: config.branchName,
        sourceBranch: config.sourceBranch,
        ...testRunMultipart,
      });
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${config.apiUrl}/test-runs/multipart`,
        data,
        expect.objectContaining({ timeout: 360_000 })
      );
      expect(mockedTestRunResult).toHaveBeenCalledWith(
        responce,
        "http://localhost:4200"
      );
    });

    it("should track multipart with retry", async () => {
      const responce = testRunUnresolvedResponse;
      const data = new FormData();
      const buildId = "1312";
      const projectId = "asd";
      vrt["buildId"] = buildId;
      vrt["projectId"] = projectId;
      vrt["isStarted"] = jest.fn().mockReturnValueOnce(true);
      mockedAxios.post.mockResolvedValue({ data: responce });
      mockedDtoHelper.multipartDtoToFormData.mockReturnValue(data);

      await expect(vrt.track(testRunMultipart, 3)).rejects.toThrow(
        "Difference found: url"
      );
      expect(mockedDtoHelper.multipartDtoToFormData).toHaveBeenCalledWith({
        buildId,
        projectId,
        branchName: config.branchName,
        sourceBranch: config.sourceBranch,
        ...testRunMultipart,
      });
      expect(mockedAxios.post).toHaveBeenCalledTimes(4);
    });

    it("should track buffer", async () => {
      const responce = testRunOkResponse;
      const data = new FormData();
      const buildId = "1312";
      const projectId = "asd";
      vrt["buildId"] = buildId;
      vrt["projectId"] = projectId;
      vrt["isStarted"] = jest.fn().mockReturnValueOnce(true);
      mockedAxios.post.mockResolvedValueOnce({ data: responce });
      mockedDtoHelper.bufferDtoToFormData.mockReturnValueOnce(data);

      await vrt.track(testRunBuffer);

      expect(mockedDtoHelper.bufferDtoToFormData).toHaveBeenCalledWith({
        buildId,
        projectId,
        branchName: config.branchName,
        sourceBranch: config.sourceBranch,
        ...testRunBuffer,
      });
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${config.apiUrl}/test-runs/multipart`,
        data,
        expect.anything()
      );
      expect(mockedTestRunResult).toHaveBeenCalledWith(
        responce,
        "http://localhost:4200"
      );
    });
  });

  describe("start", () => {
    it("should start build", async () => {
      const buildId = "1312";
      const projectId = "asd";
      const build: BuildResponse = {
        id: buildId,
        projectId,
      };
      mockedAxios.post.mockResolvedValueOnce({ data: build });

      const result = await vrt.start();

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${config.apiUrl}/builds`,
        {
          branchName: config.branchName,
          project: config.project,
          ciBuildId: config.ciBuildId,
        },
        requestOptions
      );
      expect(vrt["buildId"]).toBe(buildId);
      expect(vrt["projectId"]).toBe(projectId);
      expect(result).toBe(build);
    });

    it("should not send deprecated baselineBranchName", async () => {
      jest.spyOn(console, "warn").mockImplementation(() => {});
      vrt = new VisualRegressionTracker({
        ...config,
        baselineBranchName: "legacy",
      });
      mockedAxios.post.mockResolvedValueOnce({
        data: { id: "1312", projectId: "asd" },
      });

      await vrt.start();

      expect(mockedAxios.post.mock.calls[0][1]).toStrictEqual({
        branchName: config.branchName,
        project: config.project,
        ciBuildId: config.ciBuildId,
      });
    });

    it("should handle exception", async () => {
      const handleExceptionMock = jest.fn();
      vrt["handleException"] = handleExceptionMock;
      mockedAxios.post.mockRejectedValueOnce(axiosError401);

      try {
        await vrt.start();
      } catch {}

      expect(handleExceptionMock).toHaveBeenCalledWith(axiosError401);
    });
  });

  describe("stop", () => {
    it("should stop build", async () => {
      const buildId = "1312";
      vrt["buildId"] = buildId;
      vrt["isStarted"] = jest.fn().mockReturnValueOnce(true);
      mockedAxios.patch.mockResolvedValueOnce({});

      await vrt["stop"]();

      expect(mockedAxios.patch).toHaveBeenCalledWith(
        `${config.apiUrl}/builds/${buildId}`,
        { isRunning: false },
        requestOptions
      );
    });

    it("should mark the started build as not running", async () => {
      const build: BuildResponse = {
        id: "1312",
        projectId: "asd",
      };
      mockedAxios.post.mockResolvedValueOnce({ data: build });
      mockedAxios.patch.mockResolvedValueOnce({});

      await vrt.start();
      await vrt.stop();

      expect(mockedAxios.patch).toHaveBeenCalledTimes(1);
      const [url, body] = mockedAxios.patch.mock.calls[0];
      expect(url).toBe(`${config.apiUrl}/builds/${build.id}`);
      expect(body).toStrictEqual({ isRunning: false });
    });

    it("should throw if not started", async () => {
      vrt["isStarted"] = jest.fn().mockReturnValueOnce(false);

      await expect(vrt["stop"]()).rejects.toThrow(
        new Error("Visual Regression Tracker has not been started")
      );
    });

    it("should handle exception", async () => {
      vrt["buildId"] = "some id";
      vrt["isStarted"] = jest.fn().mockReturnValueOnce(true);
      const handleExceptionMock = jest.fn();
      vrt["handleException"] = handleExceptionMock;
      mockedAxios.patch.mockRejectedValueOnce(axiosError401);

      try {
        await vrt["stop"]();
      } catch {}

      expect(handleExceptionMock).toHaveBeenCalledWith(axiosError401);
    });
  });

  describe("submitTestRunBase64", () => {
    it("should submit test run", async () => {
      const testRunUnresolvedResponse: TestRunResponse = {
        url: "url",
        status: TestStatus.unresolved,
        pixelMisMatchCount: 12,
        diffPercent: 0.12,
        diffTollerancePercent: 0,
        id: "some id",
        imageName: "imageName",
        merge: false,
      };
      const buildId = "1312";
      const projectId = "asd";
      vrt["buildId"] = buildId;
      vrt["projectId"] = projectId;
      mockedAxios.post.mockResolvedValueOnce({
        data: testRunUnresolvedResponse,
      });

      const result = await vrt["submitTestRunBase64"](testRunBase64);

      expect(result).toBe(testRunUnresolvedResponse);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${config.apiUrl}/test-runs`,
        {
          buildId: buildId,
          projectId: projectId,
          branchName: config.branchName,
          sourceBranch: config.sourceBranch,
          name: testRunBase64.name,
          imageBase64: testRunBase64.imageBase64,
          os: testRunBase64.os,
          device: testRunBase64.device,
          customTags: testRunBase64.customTags,
          viewport: testRunBase64.viewport,
          browser: testRunBase64.browser,
          ignoreAreas: testRunBase64.ignoreAreas,
        },
        requestOptions
      );
    });

    it("should handle exception", async () => {
      const handleExceptionMock = jest.fn();
      vrt["handleException"] = handleExceptionMock;
      vrt["isStarted"] = jest.fn().mockReturnValueOnce(true);
      mockedAxios.post.mockRejectedValueOnce(axiosError401);

      try {
        await vrt["submitTestRunBase64"]({
          name: "name",
          imageBase64: "image",
        });
      } catch {}

      expect(handleExceptionMock).toHaveBeenCalledWith(axiosError401);
    });
  });

  describe("submitTestRunMultipart", () => {
    it("should submit test run", async () => {
      const data = new FormData();
      mockedDtoHelper.bufferDtoToFormData.mockReturnValueOnce(data);
      mockedAxios.post.mockResolvedValueOnce({
        data: testRunUnresolvedResponse,
      });

      const result = await vrt["submitTestRunMultipart"](testRunBuffer);

      expect(result).toBe(testRunUnresolvedResponse);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${config.apiUrl}/test-runs/multipart`,
        data,
        {
          ...requestOptions,
          headers: expect.objectContaining({
            apiKey: config.apiKey,
            project: config.project,
          }),
        }
      );
    });

    it("should handle exception", async () => {
      const handleExceptionMock = jest.fn();
      vrt["handleException"] = handleExceptionMock;
      vrt["isStarted"] = jest.fn().mockReturnValueOnce(true);
      mockedAxios.post.mockRejectedValueOnce(axiosError401);
      try {
        mockedDtoHelper.bufferDtoToFormData.mockReturnValueOnce(new FormData());
        await vrt["submitTestRunMultipart"](testRunBuffer);
      } catch {}
      expect(handleExceptionMock).toHaveBeenCalledWith(axiosError401);
    });
  });

  it("handleResponse", async () => {
    const build: BuildResponse = {
      id: "id",
      projectId: "projectId",
    };
    const response: AxiosResponse = {
      data: build,
      status: 201,
      statusText: "Created",
      config: {headers},
      headers: {},
    };

    const result = await vrt["handleResponse"](response);

    expect(result).toBe(build);
  });

  describe("handleException", () => {
    const request = "POST http://localhost:4200/test-runs";

    it.each<[string, AxiosError, string]>([
      [
        "401 asks to check apiKey",
        axiosError401,
        `${request} returned 401: Unauthorized. Check apiKey.`,
      ],
      [
        "403 asks to check project access",
        axiosError(403, errorBody(403, "Forbidden resource")),
        `${request} returned 403: Forbidden resource. Check that the apiKey's user has access to the project.`,
      ],
      [
        "404 names the request and the server's reason",
        axiosError(404, errorBody(404, "Build 1312 not found")),
        `${request} returned 404: Build 1312 not found`,
      ],
      [
        "404 without a server body asks to check apiUrl",
        axiosError(404, "<html>404</html>", {}, "Not Found"),
        `${request} returned 404: Not Found. Check apiUrl and project.`,
      ],
      [
        "404 for a missing route asks to check apiUrl",
        axiosError(404, errorBody(404, "Cannot POST /test-runs")),
        `${request} returned 404: Cannot POST /test-runs. Check apiUrl and project.`,
      ],
      [
        "credentials in apiUrl are not shown",
        axiosError(
          401,
          errorBody(401, "Unauthorized"),
          {},
          "",
          "https://ci:s3cret@vrt.example.com/api/test-runs"
        ),
        `POST https://vrt.example.com/api/test-runs returned 401: Unauthorized. Check apiKey.`,
      ],
      [
        "server message ending with a period is not doubled",
        axiosError(409, errorBody(409, "Nothing to revert.")),
        `${request} returned 409: Nothing to revert. Another change to the same build or project is in progress; try again.`,
      ],
      [
        "409 asks to try again",
        axiosError(
          409,
          errorBody(409, "Build 1312 keeps receiving test runs, try again later")
        ),
        `${request} returned 409: Build 1312 keeps receiving test runs, try again later. Another change to the same build or project is in progress; try again.`,
      ],
      [
        "413 suggests multipart or BODY_PARSER_JSON_LIMIT",
        axiosError(413, "<html>413</html>", {}, "Payload Too Large"),
        `${request} returned 413: Payload Too Large. Track the image with imagePath or imageBuffer (multipart) instead of imageBase64, or raise BODY_PARSER_JSON_LIMIT on the server.`,
      ],
      [
        "413 on builds only mentions BODY_PARSER_JSON_LIMIT",
        axiosError(
          413,
          "",
          {},
          "Payload Too Large",
          "http://localhost:4200/builds"
        ),
        `POST http://localhost:4200/builds returned 413: Payload Too Large. Raise BODY_PARSER_JSON_LIMIT on the server.`,
      ],
      [
        "413 on multipart mentions MULTIPART_FILE_SIZE_LIMIT",
        axiosError(
          413,
          errorBody(413, "File too large"),
          {},
          "",
          "http://localhost:4200/test-runs/multipart"
        ),
        `POST http://localhost:4200/test-runs/multipart returned 413: File too large. Raise MULTIPART_FILE_SIZE_LIMIT (or the proxy's body size limit) on the server.`,
      ],
      [
        "422 mentions MAX_IMAGE_PIXELS",
        axiosError(
          422,
          errorBody(
            422,
            "Image is 20000x20000 (400000000 pixels), above MAX_IMAGE_PIXELS=100000000"
          )
        ),
        `${request} returned 422: Image is 20000x20000 (400000000 pixels), above MAX_IMAGE_PIXELS=100000000. Track a smaller image or raise MAX_IMAGE_PIXELS on the server.`,
      ],
      [
        "503 with Retry-After says when to retry",
        axiosError(
          503,
          errorBody(503, "Image diff queue is full (100 jobs)"),
          { "retry-after": "5" }
        ),
        `${request} returned 503: Image diff queue is full (100 jobs). The server is busy or restarting; try again after Retry-After: 5.`,
      ],
      [
        "503 without Retry-After asks to try later",
        axiosError(503, "", {}, "Service Unavailable"),
        `${request} returned 503: Service Unavailable. The server is unavailable; try again later.`,
      ],
      [
        "400 joins validation messages",
        axiosError(
          400,
          errorBody(400, ["name should not be empty", "buildId must be a UUID"])
        ),
        `${request} returned 400: name should not be empty, buildId must be a UUID`,
      ],
      [
        "500 without a message shows the body",
        axiosError(500, { some: "data" }),
        `${request} returned 500: {"some":"data"}`,
      ],
      [
        "unknown body falls back to the axios message",
        axiosError(502, ""),
        `${request} returned 502: Request failed with status code 502`,
      ],
    ])("%s", async (_, error, expectedMessage) => {
      await expect(vrt["handleException"](error)).rejects.toThrow(
        new Error(expectedMessage)
      );
    });

    describe("network error", () => {
      const cause = Object.assign(
        new Error("connect ECONNREFUSED 127.0.0.1:4200"),
        { code: "ECONNREFUSED" }
      );
      const error: AxiosError = {
        isAxiosError: true,
        toJSON: jest.fn(),
        name: "AxiosError",
        message: "connect ECONNREFUSED 127.0.0.1:4200",
        code: "ECONNREFUSED",
        cause,
        config: {
          headers: { apiKey: config.apiKey } as unknown as AxiosRequestHeaders,
          method: "post",
          url: "http://localhost:4200/builds",
        },
      };

      it("names the request and the error code", async () => {
        const thrown = await vrt["handleException"](error).catch((e) => e);

        expect(thrown.message).toBe(
          "No response from server for POST http://localhost:4200/builds (ECONNREFUSED): connect ECONNREFUSED 127.0.0.1:4200"
        );
        expect(thrown.cause).toBe(cause);
      });

      it("does not expose the apiKey", async () => {
        const thrown = await vrt["handleException"](error).catch((e) => e);

        expect(inspect(thrown, { depth: Infinity })).not.toContain(
          config.apiKey
        );
      });
    });

    it("names an unknown request when the error has no config", async () => {
      const thrown = await vrt["handleException"](
        new Error("boom") as AxiosError
      ).catch((e) => e);

      expect(thrown.message).toBe(
        "No response from server for VRT request: boom"
      );
    });
  });
  describe("http timeout", () => {
    it.each([
      [30, 30_000],
      [0, 0],
    ])("sends httpTimeoutInSeconds %p as an axios timeout of %p ms", async (seconds, ms) => {
      mockedAxios.post.mockResolvedValueOnce({ data: { id: "1", projectId: "2" } });

      await new VisualRegressionTracker({ ...config, httpTimeoutInSeconds: seconds }).start();

      expect(mockedAxios.post.mock.calls[0][2]).toMatchObject({ timeout: ms });
    });
  });

  describe("503 with Retry-After", () => {
    it("sends the request again", async () => {
      jest.spyOn(console, "warn").mockImplementation(() => {});
      const build = { id: "1", projectId: "2" };
      mockedAxios.post
        .mockRejectedValueOnce(axiosError(503, errorBody(503, "Busy"), { "retry-after": "0" }))
        .mockResolvedValueOnce({ data: build });

      await expect(vrt.start()).resolves.toBe(build);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it("builds the multipart body again for each attempt", async () => {
      jest.spyOn(console, "warn").mockImplementation(() => {});
      vrt["buildId"] = "1312";
      vrt["projectId"] = "asd";
      mockedDtoHelper.bufferDtoToFormData.mockImplementation(() => new FormData());
      mockedAxios.post
        .mockRejectedValueOnce(axiosError(503, errorBody(503, "Busy"), { "retry-after": "0" }))
        .mockResolvedValueOnce({ data: testRunOkResponse });

      await vrt.track(testRunBuffer);

      const [first, second] = mockedAxios.post.mock.calls.map((call) => call[1]);
      expect(second).not.toBe(first);
    });
  });

  describe("ServerError", () => {
    it("carries the status and the server's message", async () => {
      const thrown = await vrt["handleException"](axiosError401).catch((e) => e);

      expect(thrown).toBeInstanceOf(ServerError);
      expect(thrown.status).toBe(401);
      expect(thrown.serverMessage).toBe("Unauthorized");
    });

    it("is not used when the server did not answer", async () => {
      const thrown = await vrt["handleException"](
        new Error("boom") as AxiosError
      ).catch((e) => e);

      expect(thrown).not.toBeInstanceOf(ServerError);
    });
  });
  it("creates no HTTP agent while the module loads, so browser bundles can import it", () => {
    const agent = jest.spyOn(http, "Agent");

    jest.isolateModules(() => require("./visualRegressionTracker"));

    expect(agent).not.toHaveBeenCalled();
  });
});

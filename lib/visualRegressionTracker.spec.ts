import { VisualRegressionTracker } from "./visualRegressionTracker";
import {
  Config,
  BuildResponse,
  TestRunResponse,
  TestStatus,
  TestRunBase64,
  TestRunMultipart,
} from "./types";
import { mocked } from "ts-jest/utils";
import TestRunResult from "./testRunResult";
import axios, { AxiosError, AxiosResponse } from "axios";
import * as configHelper from "./helpers/config.helper";
import * as dtoHelper from "./helpers/dto.helper";
import FormData from "form-data";

jest.mock("axios");
const mockedAxios = mocked(axios, true);

jest.mock("./testRunResult");
const mockedTestRunResult = mocked(TestRunResult, true);

jest.mock("./helpers/config.helper");
const mockedConfigHelper = mocked(configHelper);

jest.mock("./helpers/dto.helper");
const mockedDtoHelper = mocked(dtoHelper);

const axiosError404: AxiosError = {
  isAxiosError: true,
  config: {},
  toJSON: jest.fn(),
  name: "",
  message: "",
  response: {
    status: 404,
    data: {},
    statusText: "Not found",
    headers: {},
    config: {},
  },
};

const axiosError403: AxiosError = {
  isAxiosError: true,
  config: {},
  toJSON: jest.fn(),
  name: "",
  message: "",
  response: {
    status: 403,
    data: {},
    statusText: "Not found",
    headers: {},
    config: {},
  },
};

const axiosError401: AxiosError = {
  isAxiosError: true,
  config: {},
  toJSON: jest.fn(),
  name: "",
  message: "",
  response: {
    status: 401,
    data: {},
    statusText: "Unauthorized",
    headers: {},
    config: {},
  },
};

const axiosErrorUnknown: AxiosError = {
  isAxiosError: true,
  config: {},
  toJSON: jest.fn(),
  name: "asdas",
  message: "Unknown error",
  response: {
    status: 500,
    data: {
      some: "data",
    },
    statusText: "Internal exception",
    headers: {},
    config: {},
  },
};

const axiosErrorEmptyResponse: AxiosError = {
  isAxiosError: true,
  config: {},
  toJSON: jest.fn(),
  name: "asdas",
  message: "Unknown error",
  response: undefined,
};

const config: Config = {
  apiUrl: "http://localhost:4200",
  branchName: "develop",
  project: "Default project",
  apiKey: "CPKVK4JNK24NVNPNGVFQ853HXXEG",
  enableSoftAssert: false,
  ciBuildId: "someCIBuildId",
};

const testRunBase64: TestRunBase64 = {
  name: "name",
  imageBase64: "iamge",
  os: "os",
  device: "device",
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

const testRunResponse: TestRunResponse = {
  url: "url",
  status: TestStatus.unresolved,
  pixelMisMatchCount: 12,
  diffPercent: 0.12,
  diffTollerancePercent: 0,
  id: "some id",
  imageName: "imageName",
  merge: false,
};

describe("VisualRegressionTracker", () => {
  let vrt: VisualRegressionTracker;

  beforeEach(async () => {
    vrt = new VisualRegressionTracker(config);
    mockedAxios.post.mockClear();
  });

  describe("constructor", () => {
    const fileConfig: Config = {
      apiUrl: "apiUrlFile",
      branchName: "branchNameFile",
      project: "projectFile",
      apiKey: "apiKeyFile",
      enableSoftAssert: false,
      ciBuildId: "ciBuildIdFile",
    };
    const envConfig: Config = {
      apiUrl: "apiUrlEnv",
      branchName: "branchNameEnv",
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
      ).rejects.toThrowError(
        new Error("Visual Regression Tracker has not been started")
      );
    });

    it("should track base64", async () => {
      vrt["isStarted"] = jest.fn().mockReturnValueOnce(true);
      vrt["submitTestRunBase64"] = jest
        .fn()
        .mockResolvedValueOnce(testRunResponse);
      vrt["processTestRun"] = jest.fn();

      await vrt.track(testRunBase64);

      expect(vrt["submitTestRunBase64"]).toHaveBeenCalledWith(testRunBase64);
      expect(vrt["processTestRun"]).toHaveBeenCalledWith(testRunResponse);
      expect(mockedTestRunResult).toHaveBeenCalledWith(
        testRunResponse,
        "http://localhost:4200"
      );
    });

    it("should track multipart", async () => {
      vrt["isStarted"] = jest.fn().mockReturnValueOnce(true);
      vrt["submitTestRunMultipart"] = jest
        .fn()
        .mockResolvedValueOnce(testRunResponse);
      vrt["processTestRun"] = jest.fn();

      await vrt.track(testRunMultipart);

      expect(vrt["submitTestRunMultipart"]).toHaveBeenCalledWith(
        testRunMultipart
      );
      expect(vrt["processTestRun"]).toHaveBeenCalledWith(testRunResponse);
      expect(mockedTestRunResult).toHaveBeenCalledWith(
        testRunResponse,
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
        {
          headers: {
            apiKey: config.apiKey,
          },
        }
      );
      expect(vrt["buildId"]).toBe(buildId);
      expect(vrt["projectId"]).toBe(projectId);
      expect(result).toBe(build);
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
        {},
        {
          headers: {
            apiKey: config.apiKey,
          },
        }
      );
    });

    it("should throw if not started", async () => {
      vrt["isStarted"] = jest.fn().mockReturnValueOnce(false);

      await expect(vrt["stop"]()).rejects.toThrowError(
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
      const testRunResponse: TestRunResponse = {
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
      mockedAxios.post.mockResolvedValueOnce({ data: testRunResponse });

      const result = await vrt["submitTestRunBase64"](testRunBase64);

      expect(result).toBe(testRunResponse);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${config.apiUrl}/test-runs`,
        {
          buildId: buildId,
          projectId: projectId,
          branchName: config.branchName,
          name: testRunBase64.name,
          imageBase64: testRunBase64.imageBase64,
          os: testRunBase64.os,
          device: testRunBase64.device,
          viewport: testRunBase64.viewport,
          browser: testRunBase64.browser,
          ignoreAreas: testRunBase64.ignoreAreas,
        },
        {
          headers: {
            apiKey: config.apiKey,
          },
        }
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
      const buildId = "1312";
      const projectId = "asd";
      vrt["buildId"] = buildId;
      vrt["projectId"] = projectId;
      mockedDtoHelper.multipartDtoToFormData.mockReturnValueOnce(data);
      mockedAxios.post.mockResolvedValueOnce({ data: testRunResponse });

      const result = await vrt["submitTestRunMultipart"](testRunMultipart);

      expect(result).toBe(testRunResponse);
      expect(mockedDtoHelper.multipartDtoToFormData).toHaveBeenCalledWith({
        buildId,
        projectId,
        branchName: config.branchName,
        ...testRunMultipart,
      });
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${config.apiUrl}/test-runs/multipart`,
        data,
        {
          headers: expect.objectContaining({
            apiKey: config.apiKey,
          }),
        }
      );
    });

    it("should handle exception", async () => {
      const handleExceptionMock = jest.fn();
      vrt["handleException"] = handleExceptionMock;
      vrt["isStarted"] = jest.fn().mockReturnValueOnce(true);
      mockedDtoHelper.multipartDtoToFormData.mockReturnValueOnce(new FormData());
      mockedAxios.post.mockRejectedValueOnce(axiosError401);
      try {
        await vrt["submitTestRunMultipart"](testRunMultipart);
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
      config: {},
      headers: {},
    };

    const result = await vrt["handleResponse"](response);

    expect(result).toBe(build);
  });

  describe.each<[number | undefined, AxiosError, string]>([
    [axiosError401.response?.status, axiosError401, "Unauthorized"],
    [
      axiosError403.response?.status,
      axiosError403,
      "Api key not authenticated",
    ],
    [axiosError404.response?.status, axiosError404, "Project not found"],
    [
      axiosErrorUnknown.response?.status,
      axiosErrorUnknown,
      JSON.stringify(axiosErrorUnknown),
    ],
    [undefined, axiosErrorEmptyResponse, "No response from server"],
  ])("handleException", (code, error, expectedMessage) => {
    it(`Error ${code}`, async () => {
      await expect(vrt["handleException"](error)).rejects.toThrowError(
        expectedMessage
      );
    });
  });

  describe.each<[TestStatus.new | TestStatus.unresolved, string]>([
    [TestStatus.new, "No baseline: "],
    [TestStatus.unresolved, "Difference found: "],
  ])("processTestRun", (status, expectedMessage) => {
    beforeEach(() => {
      testRunResponse.status = status;
    });

    it(`disabled soft assert should throw exception if status ${status}`, () => {
      vrt["config"].enableSoftAssert = false;

      expect(() => vrt["processTestRun"](testRunResponse)).toThrowError(
        new Error(expectedMessage.concat(testRunResponse.url))
      );
    });

    it(`enabled soft assert should log error if status ${status}`, () => {
      console.error = jest.fn();
      vrt["config"].enableSoftAssert = true;

      vrt["processTestRun"](testRunResponse);

      expect(console.error).toHaveBeenCalledWith(
        expectedMessage.concat(testRunResponse.url)
      );
    });
  });
});

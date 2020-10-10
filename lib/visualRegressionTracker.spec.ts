import { VisualRegressionTracker } from "./visualRegressionTracker";
import {
  Config,
  BuildResponse,
  TestRun,
  TestRunResponse,
  TestStatus,
} from "./types";
import { mocked } from "ts-jest/utils";
import TestRunResult from "./testRunResult";
import axios, { AxiosError, AxiosResponse } from "axios";

jest.mock("axios");
const mockedAxios = mocked(axios, true);

jest.mock("./testRunResult");
const mockedTestRunResult = mocked(TestRunResult, true);

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

describe("VisualRegressionTracker", () => {
  let vrt: VisualRegressionTracker;
  const config: Config = {
    apiUrl: "http://localhost:4200",
    branchName: "develop",
    project: "Default project",
    apiKey: "CPKVK4JNK24NVNPNGVFQ853HXXEG",
    enableSoftAssert: false,
  };

  beforeEach(async () => {
    vrt = new VisualRegressionTracker(config);
  });

  describe.each([
    [undefined, undefined, false],
    ["some", undefined, false],
    [undefined, "some", false],
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
    const testRun: TestRun = {
      name: "name",
      imageBase64: "iamge",
      os: "os",
      device: "device",
      viewport: "viewport",
      browser: "browser",
    };

    it("should track success", async () => {
      const testRunResponse: TestRunResponse = {
        url: "url",
        status: TestStatus.ok,
        pixelMisMatchCount: 12,
        diffPercent: 0.12,
        diffTollerancePercent: 0,
        id: "some id",
        imageName: "imageName",
        diffName: "diffName",
        baselineName: "baselineName",
        merge: false,
      };
      vrt["submitTestResult"] = jest
        .fn()
        .mockResolvedValueOnce(testRunResponse);
      vrt["processTestRun"] = jest.fn();

      await vrt.track(testRun);

      expect(vrt["submitTestResult"]).toHaveBeenCalledWith(testRun);
      expect(vrt["processTestRun"]).toHaveBeenCalledWith(testRunResponse);
      expect(mockedTestRunResult).toHaveBeenCalledWith(
        testRunResponse,
        "http://localhost:4200"
      );
    });
  });

  describe("start", () => {
    test("should start build", async () => {
      const buildId = "1312";
      const projectId = "asd";
      const build: BuildResponse = {
        id: buildId,
        projectId: projectId,
      };
      mockedAxios.post.mockResolvedValueOnce({ data: build });

      await vrt["start"]();

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${config.apiUrl}/builds`,
        {
          branchName: config.branchName,
          project: config.project,
        },
        {
          headers: {
            apiKey: config.apiKey,
          },
        }
      );
      expect(vrt["buildId"]).toBe(buildId);
      expect(vrt["projectId"]).toBe(projectId);
    });

    test("should handle exception", async () => {
      const handleExceptionMock = jest.fn();
      vrt["handleException"] = handleExceptionMock;
      mockedAxios.post.mockRejectedValueOnce(axiosError401);

      try {
        await vrt["start"]();
      } catch {}

      expect(handleExceptionMock).toHaveBeenCalledWith(axiosError401);
    });
  });

  describe("stop", () => {
    test("should stop build", async () => {
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

    test("should throw if not started", async () => {
      vrt["isStarted"] = jest.fn().mockReturnValueOnce(false);

      await expect(vrt["stop"]()).rejects.toThrowError(
        new Error("Visual Regression Tracker has not been started")
      );
    });

    test("should handle exception", async () => {
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

  describe("submitTestResults", () => {
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
      const testRun: TestRun = {
        name: "name",
        imageBase64: "image",
        os: "os",
        device: "device",
        viewport: "viewport",
        browser: "browser",
      };
      const buildId = "1312";
      const projectId = "asd";
      vrt["buildId"] = buildId;
      vrt["projectId"] = projectId;
      mockedAxios.post.mockResolvedValueOnce({ data: testRunResponse });

      const result = await vrt["submitTestResult"](testRun);

      expect(result).toBe(testRunResponse);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${config.apiUrl}/test-runs`,
        {
          buildId: buildId,
          projectId: projectId,
          branchName: config.branchName,
          name: testRun.name,
          imageBase64: testRun.imageBase64,
          os: testRun.os,
          device: testRun.device,
          viewport: testRun.viewport,
          browser: testRun.browser,
        },
        {
          headers: {
            apiKey: config.apiKey,
          },
        }
      );
    });

    test("should throw if not started", async () => {
      vrt["isStarted"] = jest.fn().mockReturnValueOnce(false);

      await expect(
        vrt["submitTestResult"]({
          name: "name",
          imageBase64: "image",
        })
      ).rejects.toThrowError(
        new Error("Visual Regression Tracker has not been started")
      );
    });

    it("should handle exception", async () => {
      const handleExceptionMock = jest.fn();
      vrt["handleException"] = handleExceptionMock;
      vrt["isStarted"] = jest.fn().mockReturnValueOnce(true);
      mockedAxios.post.mockRejectedValueOnce(axiosError401);

      try {
        await vrt["submitTestResult"]({
          name: "name",
          imageBase64: "image",
        });
      } catch {}

      expect(handleExceptionMock).toHaveBeenCalledWith(axiosError401);
    });
  });

  test("handleResponse", async () => {
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
    const testRunResponse: TestRunResponse = {
      url: "http://foo.bar",
      status: TestStatus.ok,
      pixelMisMatchCount: 12,
      diffPercent: 0.12,
      diffTollerancePercent: 0,
      id: "some id",
      imageName: "imageName",
      merge: false,
    };

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

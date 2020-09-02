import { VisualRegressionTracker } from "./visualRegressionTracker";
import { Config, Build, TestRun, TestRunResult, TestRunStatus } from "./types";
import { mocked } from "ts-jest/utils";
import axios, { AxiosError, AxiosResponse } from "axios";

jest.mock("axios");
const mockedAxios = mocked(axios, true);

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
    data: {},
    statusText: "Internal exception",
    headers: {},
    config: {},
  },
};

describe("VisualRegressionTracker", () => {
  let vrt: VisualRegressionTracker;
  const config: Config = {
    apiUrl: "http://localhost:4200",
    branchName: "develop",
    project: "Default project",
    apiKey: "CPKVK4JNK24NVNPNGVFQ853HXXEG",
  };

  beforeEach(async () => {
    vrt = new VisualRegressionTracker(config);
  });

  describe("isStarted", () => {
    it.each([
      [undefined, undefined, false],
      ["some", undefined, false],
      [undefined, "some", false],
      ["some", "some", true],
    ])("should return if started", (buildId, projectId, expectedResult) => {
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
      const testRunResult: TestRunResult = {
        url: "url",
        status: TestRunStatus.ok,
        pixelMisMatchCount: 12,
        diffPercent: 0.12,
        diffTollerancePercent: 0,
      };
      vrt["submitTestResult"] = jest.fn().mockResolvedValueOnce(testRunResult);

      await vrt.track(testRun);

      expect(vrt["submitTestResult"]).toHaveBeenCalledWith(testRun);
    });

    it("should track no baseline", async () => {
      const testRunResult: TestRunResult = {
        url: "url",
        status: TestRunStatus.new,
        pixelMisMatchCount: 12,
        diffPercent: 0.12,
        diffTollerancePercent: 0,
      };
      vrt["submitTestResult"] = jest.fn().mockResolvedValueOnce(testRunResult);

      await expect(vrt.track(testRun)).rejects.toThrowError(
        new Error("No baseline: " + testRunResult.url)
      );
    });

    it("should track difference", async () => {
      const testRunResult: TestRunResult = {
        url: "url",
        status: TestRunStatus.unresolved,
        pixelMisMatchCount: 12,
        diffPercent: 0.12,
        diffTollerancePercent: 0,
      };
      vrt["submitTestResult"] = jest.fn().mockResolvedValueOnce(testRunResult);

      await expect(vrt.track(testRun)).rejects.toThrowError(
        new Error("Difference found: " + testRunResult.url)
      );
    });
  });

  describe("start", () => {
    test("should start build", async () => {
      const buildId = "1312";
      const projectId = "asd";
      const build: Build = {
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
      const testRunResult: TestRunResult = {
        url: "url",
        status: TestRunStatus.unresolved,
        pixelMisMatchCount: 12,
        diffPercent: 0.12,
        diffTollerancePercent: 0,
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
      mockedAxios.post.mockResolvedValueOnce({ data: testRunResult });

      const result = await vrt["submitTestResult"](testRun);

      expect(result).toBe(testRunResult);
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
    const build: Build = {
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

  describe("handleException", () => {
    it("error 401", async () => {
      await expect(vrt["handleException"](axiosError401)).rejects.toBe(
        "Unauthorized"
      );
    });

    it("error 403", async () => {
      await expect(vrt["handleException"](axiosError403)).rejects.toBe(
        "Api key not authenticated"
      );
    });

    it("error 404", async () => {
      await expect(vrt["handleException"](axiosError404)).rejects.toBe(
        "Project not found"
      );
    });

    it("unknown", async () => {
      await expect(vrt["handleException"](axiosErrorUnknown)).rejects.toBe(
        axiosErrorUnknown.message
      );
    });
  });
});

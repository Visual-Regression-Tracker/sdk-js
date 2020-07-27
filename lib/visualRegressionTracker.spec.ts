import { VisualRegressionTracker } from "./visualRegressionTracker";
import { Config, Build, TestRun, TestRunResult, TestRunStatus } from "./types";
import { mocked } from "ts-jest/utils";
import axios, { AxiosError, AxiosResponse } from "axios";

jest.mock("axios");
const mockedAxios = mocked(axios, true);

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

  afterEach(async () => {
    mockedAxios.post.mockReset();
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
      vrt["startBuild"] = jest.fn();
      vrt["submitTestResult"] = jest.fn().mockResolvedValueOnce(testRunResult);

      await vrt.track(testRun);

      expect(vrt["startBuild"]).toHaveBeenCalled();
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
      vrt["startBuild"] = jest.fn();
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
        vrt["startBuild"] = jest.fn();
        vrt["submitTestResult"] = jest.fn().mockResolvedValueOnce(testRunResult);
  
        await expect(vrt.track(testRun)).rejects.toThrowError(
          new Error("Difference found: " + testRunResult.url)
        );
      });
  });

  describe("startBuild", () => {
    test("shouldStartBuild", async () => {
      const buildId = "1312";
      const projectId = "asd";
      const build: Build = {
        id: buildId,
        projectId: projectId,
      };
      mockedAxios.post.mockResolvedValueOnce({ data: build });

      await vrt["startBuild"]();

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
      expect(vrt.buildId).toBe(buildId);
      expect(vrt.projectId).toBe(projectId);
    });

    test("should throw if no build Id", async () => {
      const build = {
        id: null,
        projectId: "projectId",
      };
      mockedAxios.post.mockResolvedValueOnce({ data: build });

      await expect(vrt["startBuild"]()).rejects.toThrowError(
        new Error("Build id is not defined")
      );
    });

    test("should throw if no project Id", async () => {
      const build = {
        id: "asd",
        projectId: null,
      };
      mockedAxios.post.mockResolvedValueOnce({ data: build });

      await expect(vrt["startBuild"]()).rejects.toThrowError(
        new Error("Project id is not defined")
      );
    });

    test("should handle exception", async () => {
      const error: AxiosError = {
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
      const handleExceptionMock = jest.fn();
      vrt["handleException"] = handleExceptionMock;
      mockedAxios.post.mockRejectedValueOnce(error);

      try {
        await vrt["startBuild"]();
      } catch {}

      expect(handleExceptionMock).toHaveBeenCalledWith(error);
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
      vrt.buildId = buildId;
      vrt.projectId = projectId;
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

    it("should handle exception", async () => {
      const error: AxiosError = {
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
      const handleExceptionMock = jest.fn();
      vrt["handleException"] = handleExceptionMock;
      mockedAxios.post.mockRejectedValueOnce(error);

      try {
        await vrt["submitTestResult"]({
          name: "name",
          imageBase64: "image",
        });
      } catch {}

      expect(handleExceptionMock).toHaveBeenCalledWith(error);
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
      const error: AxiosError = {
        isAxiosError: true,
        config: {},
        toJSON: jest.fn(),
        name: "",
        message: "",
        response: {
          status: 401,
          data: {},
          statusText: "",
          headers: {},
          config: {},
        },
      };

      await expect(vrt["handleException"](error)).rejects.toBe("Unauthorized");
    });

    it("error 403", async () => {
      const error: AxiosError = {
        isAxiosError: true,
        config: {},
        toJSON: jest.fn(),
        name: "",
        message: "",
        response: {
          status: 403,
          data: {},
          statusText: "",
          headers: {},
          config: {},
        },
      };

      await expect(vrt["handleException"](error)).rejects.toBe(
        "Api key not authenticated"
      );
    });

    it("error 404", async () => {
      const error: AxiosError = {
        isAxiosError: true,
        config: {},
        toJSON: jest.fn(),
        name: "",
        message: "",
        response: {
          status: 404,
          data: {},
          statusText: "",
          headers: {},
          config: {},
        },
      };

      await expect(vrt["handleException"](error)).rejects.toBe(
        "Project not found"
      );
    });

    it("unknown", async () => {
      const error: AxiosError = {
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

      await expect(vrt["handleException"](error)).rejects.toBe(error.message);
    });
  });
});

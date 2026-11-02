import {
  migrateDeprecatedConfig,
  readConfigFromEnv,
  readConfigFromFile,
  validateConfig,
} from "./config.helper";
import { mocked } from "jest-mock";
import { Config } from "../types";
import * as fs from "fs";

jest.mock("fs");
const mockedFs = mocked(fs);

const initialConfig: Config = {
  apiUrl: "http://localhost:4200",
  branchName: "develop",
  project: "Default project",
  apiKey: "CPKVK4JNK24NVNPNGVFQ853HXXEG",
  enableSoftAssert: true,
  ciBuildId: "someCIBuildId",
};

describe("config.helper", () => {
  describe("readConfigFromFile", () => {
    beforeEach(() => {
      mockedFs.readFileSync.mockClear();
    });

    const updatedConfig: Config = {
      apiUrl: "apiUrlUpdated",
      branchName: "branchNameUpdated",
      sourceBranch: "sourceBranchUpdated",
      baselineBranchName: "baselineBranchNameUpdated",
      project: "projectUpdated",
      apiKey: "apiKeyUpdated",
      enableSoftAssert: false,
      ciBuildId: "ciBuildIdUpdated",
    };

    it("should read from file", () => {
      mockedFs.existsSync.mockReturnValueOnce(true);
      mockedFs.readFileSync.mockReturnValueOnce(
        Buffer.from(JSON.stringify(updatedConfig), "utf8")
      );

      const result = readConfigFromFile(initialConfig);

      const { baselineBranchName, ...expected } = updatedConfig;
      expect(result).toEqual(expected);
    });

    it("should read deprecated baselineBranchName as sourceBranch", () => {
      jest.spyOn(console, "warn").mockImplementation(() => {});
      mockedFs.existsSync.mockReturnValueOnce(true);
      mockedFs.readFileSync.mockReturnValueOnce(
        Buffer.from(JSON.stringify({ baselineBranchName: "release" }), "utf8")
      );

      const result = readConfigFromFile({ ...initialConfig });

      expect(result.sourceBranch).toBe("release");
      expect(result.baselineBranchName).toBeUndefined();
    });

    it("should be skipped if no value", () => {
      mockedFs.existsSync.mockReturnValueOnce(true);
      mockedFs.readFileSync.mockReturnValueOnce(
        Buffer.from(JSON.stringify(""), "utf8")
      );

      const result = readConfigFromFile(initialConfig);

      expect(result).toEqual(initialConfig);
    });

    it("should be skipped if no file", () => {
      mockedFs.existsSync.mockReturnValueOnce(false);

      const result = readConfigFromFile(initialConfig);

      expect(mockedFs.readFileSync).not.toHaveBeenCalled();
      expect(result).toEqual(initialConfig);
    });
  });
  describe("readConfigFromEnv", () => {
    let INIT_ENV: any;
    beforeEach(() => {
      INIT_ENV = process.env;
    });
    afterEach(() => {
      process.env = INIT_ENV;
    });
    it("should read config from env variables", () => {
      process.env = {
        ...process.env,
        VRT_APIURL: "apiUrlTest",
        VRT_CIBUILDID: "ciBuildIdTest",
        VRT_BRANCHNAME: "branchNameTest",
        VRT_SOURCEBRANCH: "sourceBranchTest",
        VRT_BASELINEBRANCHNAME: "baselineBranchNameTest",
        VRT_PROJECT: "projectTest",
        VRT_APIKEY: "apiKeyTest",
        VRT_ENABLESOFTASSERT: "false",
      };

      const result = readConfigFromEnv(initialConfig);

      expect(result).toEqual({
        apiUrl: "apiUrlTest",
        ciBuildId: "ciBuildIdTest",
        branchName: "branchNameTest",
        sourceBranch: "sourceBranchTest",
        project: "projectTest",
        apiKey: "apiKeyTest",
        enableSoftAssert: false,
      });
    });
    it("should let deprecated VRT_BASELINEBRANCHNAME override sourceBranch from file", () => {
      jest.spyOn(console, "warn").mockImplementation(() => {});
      process.env = {
        ...process.env,
        VRT_SOURCEBRANCH: undefined,
        VRT_BASELINEBRANCHNAME: "release",
      };

      const result = readConfigFromEnv({
        ...initialConfig,
        sourceBranch: "fromFile",
      });

      expect(result.sourceBranch).toBe("release");
      expect(result.baselineBranchName).toBeUndefined();
    });

    it("should be skipped if no value", () => {
      process.env = {
        ...process.env,
        VRT_APIURL: undefined,
        VRT_CIBUILDID: undefined,
        VRT_BRANCHNAME: undefined,
        VRT_SOURCEBRANCH: undefined,
        VRT_BASELINEBRANCHNAME: undefined,
        VRT_PROJECT: undefined,
        VRT_APIKEY: undefined,
        VRT_ENABLESOFTASSERT: undefined,
      };

      const result = readConfigFromEnv(initialConfig);

      expect(result).toEqual(initialConfig);
    });
  });
  describe("migrateDeprecatedConfig", () => {
    const baseConfig: Config = {
      apiUrl: "http://localhost:4200",
      branchName: "develop",
      project: "Default project",
      apiKey: "CPKVK4JNK24NVNPNGVFQ853HXXEG",
    };
    let warnSpy: jest.SpyInstance;
    beforeEach(() => {
      warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    });
    afterEach(() => {
      warnSpy.mockRestore();
    });

    it("should map baselineBranchName to sourceBranch", () => {
      const result = migrateDeprecatedConfig({
        ...baseConfig,
        baselineBranchName: "release",
      });

      expect(result).toEqual({ ...baseConfig, sourceBranch: "release" });
    });

    it("should prefer sourceBranch over baselineBranchName", () => {
      const result = migrateDeprecatedConfig({
        ...baseConfig,
        sourceBranch: "feature",
        baselineBranchName: "release",
      });

      expect(result).toEqual({ ...baseConfig, sourceBranch: "feature" });
    });

    it("should keep config without baselineBranchName as is", () => {
      const config = { ...baseConfig, sourceBranch: "feature" };

      expect(migrateDeprecatedConfig(config)).toEqual(config);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("should warn about baselineBranchName only once", () => {
      jest.isolateModules(() => {
        const helper: typeof import("./config.helper") = require("./config.helper");
        helper.migrateDeprecatedConfig({ ...baseConfig, baselineBranchName: "a" });
        helper.migrateDeprecatedConfig({ ...baseConfig, baselineBranchName: "b" });
      });

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("baselineBranchName is deprecated")
      );
    });
  });

  describe("validateConfig", () => {
    it("valid", () => {
      expect(() => validateConfig(initialConfig)).not.toThrow();
    });

    it.each([
      [
        {
          ...initialConfig,
          apiUrl: "",
        },
        "apiUrl is not specified",
      ],
      [
        {
          ...initialConfig,
          branchName: "",
        },
        "branchName is not specified",
      ],
      [
        {
          ...initialConfig,
          project: "",
        },
        "project is not specified",
      ],
      [
        {
          ...initialConfig,
          apiKey: "",
        },
        "apiKey is not specified",
      ],
    ])(`should throw if not valid config`, (notValidConfig, errorMessage) => {
      expect(() => validateConfig(notValidConfig)).toThrow(
        new Error(errorMessage)
      );
    });
  });
});

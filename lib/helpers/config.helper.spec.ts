import {
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

      expect(result).toEqual(updatedConfig);
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
        baselineBranchName: "baselineBranchNameTest",
        project: "projectTest",
        apiKey: "apiKeyTest",
        enableSoftAssert: false,
      });
    });
    it("should be skipped if no value", () => {
      process.env = {
        ...process.env,
        VRT_APIURL: undefined,
        VRT_CIBUILDID: undefined,
        VRT_BRANCHNAME: undefined,
        VRT_BASELINEBRANCHNAME: undefined,
        VRT_PROJECT: undefined,
        VRT_APIKEY: undefined,
        VRT_ENABLESOFTASSERT: undefined,
      };

      const result = readConfigFromEnv(initialConfig);

      expect(result).toEqual(initialConfig);
    });
  });
  describe("validateConfig", () => {
    it("valid", () => {
      expect(() => validateConfig(initialConfig)).not.toThrowError();
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
      expect(() => validateConfig(notValidConfig)).toThrowError(
        new Error(errorMessage)
      );
    });
  });
});

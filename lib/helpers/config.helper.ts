import { existsSync, readFileSync } from "fs";
import { Config } from "../types";

const CONFIG_FILE_PATH = "./vrt.json";

let baselineBranchNameWarned = false;

const sourceBranchOf = (
  sourceBranch?: string,
  baselineBranchName?: string
): string | undefined => {
  if (baselineBranchName && !baselineBranchNameWarned) {
    baselineBranchNameWarned = true;
    console.warn(
      "VRT: baselineBranchName is deprecated and is sent as sourceBranch; use sourceBranch (VRT_SOURCEBRANCH) instead"
    );
  }
  return sourceBranch || baselineBranchName;
};

const readConfigFromFile = (config: Config): Config => {
  if (existsSync(CONFIG_FILE_PATH)) {
    const fileConfig = JSON.parse(readFileSync(CONFIG_FILE_PATH).toString());
    if (fileConfig.apiUrl) {
      config.apiUrl = fileConfig.apiUrl;
    }
    if (fileConfig.branchName) {
      config.branchName = fileConfig.branchName;
    }
    const sourceBranch = sourceBranchOf(
      fileConfig.sourceBranch,
      fileConfig.baselineBranchName
    );
    if (sourceBranch) {
      config.sourceBranch = sourceBranch;
    }
    if (fileConfig.project) {
      config.project = fileConfig.project;
    }
    if (fileConfig.apiKey) {
      config.apiKey = fileConfig.apiKey;
    }
    if (fileConfig.ciBuildId) {
      config.ciBuildId = fileConfig.ciBuildId;
    }
    if (fileConfig.enableSoftAssert !== undefined) {
      config.enableSoftAssert = fileConfig.enableSoftAssert;
    }
  }
  return config;
};

const readConfigFromEnv = (config: Config): Config => {
  if (process.env["VRT_APIURL"]) {
    config.apiUrl = process.env["VRT_APIURL"];
  }
  if (process.env["VRT_BRANCHNAME"]) {
    config.branchName = process.env["VRT_BRANCHNAME"];
  }
  const sourceBranch = sourceBranchOf(
    process.env["VRT_SOURCEBRANCH"],
    process.env["VRT_BASELINEBRANCHNAME"]
  );
  if (sourceBranch) {
    config.sourceBranch = sourceBranch;
  }
  if (process.env["VRT_PROJECT"]) {
    config.project = process.env["VRT_PROJECT"];
  }
  if (process.env["VRT_APIKEY"]) {
    config.apiKey = process.env["VRT_APIKEY"];
  }
  if (process.env["VRT_CIBUILDID"]) {
    config.ciBuildId = process.env["VRT_CIBUILDID"];
  }
  if (process.env["VRT_ENABLESOFTASSERT"] !== undefined) {
    config.enableSoftAssert = process.env["VRT_ENABLESOFTASSERT"] === "true";
  }
  return config;
};

const migrateDeprecatedConfig = (config: Config): Config => {
  if (!config.baselineBranchName) {
    return config;
  }
  const { baselineBranchName, ...rest } = config;
  return {
    ...rest,
    sourceBranch: sourceBranchOf(rest.sourceBranch, baselineBranchName),
  };
};

const validateConfig = (config: Config): void => {
  if (!config.apiKey) {
    throw new Error("apiKey is not specified");
  }
  if (!config.branchName) {
    throw new Error("branchName is not specified");
  }
  if (!config.apiUrl) {
    throw new Error("apiUrl is not specified");
  }
  if (!config.project) {
    throw new Error("project is not specified");
  }
};

export {
  readConfigFromFile,
  readConfigFromEnv,
  migrateDeprecatedConfig,
  validateConfig,
};

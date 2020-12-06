import { existsSync, readFileSync } from "fs";
import { Config } from "types";

const CONFIG_FILE_PATH = "./vrt.json";
const REQUIRE_CONFIG_FIELDS = ["apiUrl", "branchName", "project", "apiKey"];
const CONFIG_ENV_MAPPING = {
  apiUrl: "VRT_APIURL",
  ciBuildId: "VRT_CIBUILDID",
  branchName: "VRT_BRANCHNAME",
  project: "VRT_PROJECT",
  apiKey: "VRT_APIKEY",
  enableSoftAssert: "VRT_ENABLESOFTASSERT",
};

const computeFinalConfig = (explicitConfig?: Config): Config => {
  let config: Config = {
    apiUrl: "",
    apiKey: "",
    project: "",
    branchName: "",
    ciBuildId: "",
    enableSoftAssert: false,
  };

  if (explicitConfig) {
    config = explicitConfig;
  } else {
    config = readConfigFromFile(config);
    config = readConfigFromEnv(config);
  }
  validateConfig(config);
  return config;
};

const readConfigFromFile = (config: Config): Config => {
  if (existsSync(CONFIG_FILE_PATH)) {
    const fileConfig = JSON.parse(readFileSync(CONFIG_FILE_PATH).toString());
    config = {
      apiKey: fileConfig.apiKey,
      apiUrl: fileConfig.apiUrl,
      branchName: fileConfig.branchName,
      project: fileConfig.project,
      enableSoftAssert: fileConfig.enableSoftAssert,
      ciBuildId: fileConfig.ciBuildId,
    };
  }
  return config;
};

const readConfigFromEnv = (config: Config): Config => {
  Object.entries(CONFIG_ENV_MAPPING).forEach(([k, v]) => {
    if (process.env[v]) {
      config[k] = process.env[v];
    }
  });
  return config;
};

const validateConfig = (config: Config): void => {
  REQUIRE_CONFIG_FIELDS.forEach((field) => {
    if (!config[field]) {
      throw new Error(
        `Visual Regression Tracker config is not valid. ${field} is not specified`
      );
    }
  });
};

export { computeFinalConfig };

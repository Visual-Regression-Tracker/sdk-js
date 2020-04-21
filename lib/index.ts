import Config from "./types/config";
import Build from "./types/build";
import axios, { AxiosResponse, AxiosRequestConfig } from "axios";

export default class VisualRegressionTracker {
  config: Config;
  buildId: number = 0;
  axiosConfig: AxiosRequestConfig;

  constructor(config: Config) {
    this.config = config;
    this.axiosConfig = {
      headers: {
        apiKey: this.config.token,
      },
    };
  }

  async startBuild(projectId: number, branchName: string): Promise<Build> {
    const data = { branchName, projectId };
    return axios
      .post(`${this.config.apiUrl}/builds`, data, this.axiosConfig)
      .then(function (response) {
        // handle success
        return response.data;
      })
      .catch(function (error) {
        // handle error
        console.log(error);
      });
  }

  async submitTestResult(test: Test): Promise<Build> {
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(test),
    };
    return axios
      .post(
        `${this.config.apiUrl}/tests`,
        JSON.stringify(test),
        this.axiosConfig
      )
      .then(handleResponse);
  }
}

function handleResponse(response: AxiosResponse) {
  return response.data.then((text: string) => {
    const data = text && JSON.parse(text);
    if (response.status !== 200) {
      const error = (data && data.message) || response.statusText;
      return Promise.reject(error);
    }

    return data;
  });
}

interface Test {
  name: string;
  buildId: number;
  imageBase64: string;
  os: string;
  browser: string;
  viewport: string;
  device: string;
}

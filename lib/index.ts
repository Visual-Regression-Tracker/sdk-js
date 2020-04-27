import Config from "./types/config";
import Build from "./types/build";
import axios, { AxiosRequestConfig } from "axios";
import { TestRun } from "types/testRun";
import { TestRunResult } from "types/testRunResult";

export default class VisualRegressionTracker {
  config: Config;
  buildId: string | undefined;
  axiosConfig: AxiosRequestConfig;

  constructor(config: Config) {
    this.config = config;
    this.axiosConfig = {
      headers: {
        apiKey: this.config.token,
      },
    };
  }

  private async startBuild(projectId: string, branchName: string) {
    if (!this.buildId) {
      console.log("Starting new build");
      const data = { branchName, projectId };
      const build = await axios
        .post<Build>(`${this.config.apiUrl}/builds`, data, this.axiosConfig)
        .then(function (response) {
          // handle success
          return response.data;
        })
        .catch(function (error) {
          // handle error
          return Promise.reject(error);
        });
      this.buildId = build.id;
    }
  }

  async submitTestResult(test: TestRun): Promise<TestRunResult> {
    await this.startBuild(this.config.projectId, this.config.branchName);
    const data = {
      buildId: this.buildId,
      projectId: this.config.projectId,
      ...test,
    };
    return axios
      .post(`${this.config.apiUrl}/test`, data, this.axiosConfig)
      .then(function (response) {
        // handle success
        return response.data;
      })
      .catch(function (error) {
        // handle error
        return Promise.reject(error);
      });
  }
}

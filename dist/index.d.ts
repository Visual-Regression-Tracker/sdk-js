import { Config, TestRun, TestRunResult } from "./types";
import { AxiosRequestConfig } from "axios";
export declare class VisualRegressionTracker {
    config: Config;
    buildId: string | undefined;
    axiosConfig: AxiosRequestConfig;
    constructor(config: Config);
    private startBuild;
    submitTestResult(test: TestRun): Promise<TestRunResult>;
}

import { Config, TestRun } from "./types";
import { AxiosRequestConfig } from "axios";
export declare class VisualRegressionTracker {
    config: Config;
    buildId: string | undefined;
    projectId: string | undefined;
    axiosConfig: AxiosRequestConfig;
    constructor(config: Config);
    private startBuild;
    private submitTestResult;
    track(test: TestRun): Promise<void>;
}

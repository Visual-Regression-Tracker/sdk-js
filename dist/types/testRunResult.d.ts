import { TestRunStatus } from "./";
export interface TestRunResult {
    url: string;
    status: TestRunStatus;
    pixelMisMatchCount: number;
    diffPercent: number;
    diffTollerancePercent: number;
}

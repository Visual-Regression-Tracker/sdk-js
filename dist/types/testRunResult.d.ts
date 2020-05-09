export interface TestRunResult {
    url: string;
    status: string;
    pixelMisMatchCount: number;
    diffPercent: number;
    diffTollerancePercent: number;
}

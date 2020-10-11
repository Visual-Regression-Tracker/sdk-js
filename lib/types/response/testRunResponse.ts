import { TestStatus } from "../testStatus";

export interface TestRunResponse {
  id: string;
  imageName: string;
  diffName?: string;
  baselineName?: string;
  diffPercent: number;
  diffTollerancePercent?: number;
  pixelMisMatchCount?: number;
  status: TestStatus;
  url: string;
  merge: boolean;
}

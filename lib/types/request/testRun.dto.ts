import { IgnoreArea } from "../../types/ignoreArea";

export interface TestRunDto {
  name: string;

  os?: string;

  browser?: string;

  viewport?: string;

  device?: string;

  customTags?: string;

  branchName: string;

  sourceBranch?: string;

  /** @deprecated not sent; use sourceBranch */
  baselineBranchName?: string;

  buildId: string;

  projectId: string;

  diffTollerancePercent?: number;

  merge?: boolean;

  ignoreAreas?: IgnoreArea[];

  comment?: string;
}

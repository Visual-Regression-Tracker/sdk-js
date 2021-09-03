import { IgnoreArea } from "../../types/ignoreArea";

export interface TestRunDto {
  name: string;

  os?: string;

  browser?: string;

  viewport?: string;

  device?: string;

  customTags?: string;

  branchName: string;

  buildId: string;

  projectId: string;

  diffTollerancePercent?: number;

  merge?: boolean;

  ignoreAreas?: IgnoreArea[];
}

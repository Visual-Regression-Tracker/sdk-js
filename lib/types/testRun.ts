export interface TestRun {
  name: string;
  imageBase64: string;
  os?: string;
  browser?: string;
  viewport?: string;
  device?: string;
  diffTollerancePercent?: number;
}

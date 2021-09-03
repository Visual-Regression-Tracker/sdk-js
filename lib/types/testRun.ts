import { IgnoreArea } from "./ignoreArea";

interface TestRun {
  name: string;
  os?: string;
  browser?: string;
  viewport?: string;
  device?: string;
  customTags?: string;
  diffTollerancePercent?: number;
  ignoreAreas?: IgnoreArea[];
}

export interface TestRunBase64 extends TestRun {
  imageBase64: string;
}

export interface TestRunMultipart extends TestRun {
  imagePath: string;
}

export interface TestRunBuffer extends TestRun {
  imageBuffer: Buffer;
}

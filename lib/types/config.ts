export interface Config {
  apiUrl: string;
  branchName: string;
  project: string;
  apiKey: string;
  enableSoftAssert?: boolean;
  ciBuildId?: string;
}

export interface Config extends Record<string, any> {
  apiUrl: string;
  branchName: string;
  project: string;
  apiKey: string;
  enableSoftAssert?: boolean;
  ciBuildId?: string;
}

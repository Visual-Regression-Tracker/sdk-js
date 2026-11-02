export interface Config extends Record<string, any> {
  apiUrl: string;
  branchName: string;
  sourceBranch?: string;
  /** @deprecated use sourceBranch */
  baselineBranchName?: string;
  project: string;
  apiKey: string;
  enableSoftAssert?: boolean;
  ciBuildId?: string;
  /** Read timeout per request; 0 means no limit. Default 360 */
  httpTimeoutInSeconds?: number;
}

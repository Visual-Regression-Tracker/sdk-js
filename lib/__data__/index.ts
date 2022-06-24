import { TestStatus, TestRunResponse } from "../types";

export const testRunUnresolvedResponse: TestRunResponse = {
  url: "url",
  status: TestStatus.unresolved,
  pixelMisMatchCount: 12,
  diffPercent: 0.12,
  diffTollerancePercent: 0,
  id: "some id",
  imageName: "imageName",
  merge: false,
};

export const testRunOkResponse: TestRunResponse = {
  url: "url",
  status: TestStatus.ok,
  diffPercent: 0,
  diffTollerancePercent: 0,
  id: "some id",
  imageName: "imageName",
  merge: false,
};

export const testRunNewResponse: TestRunResponse = {
  url: "url",
  status: TestStatus.new,
  pixelMisMatchCount: 0,
  diffPercent: 0,
  diffTollerancePercent: 0,
  id: "some id",
  imageName: "imageName",
  merge: false,
};

export const testRunAutoApprovedResponse: TestRunResponse = {
  url: "url",
  status: TestStatus.autoApproved,
  pixelMisMatchCount: 0,
  diffPercent: 0,
  diffTollerancePercent: 0,
  id: "some id",
  imageName: "imageName",
  merge: false,
};

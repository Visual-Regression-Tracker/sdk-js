import { TestRunResponse, TestStatus } from "../types";
import { processTestRun, shouldStopRetry } from "./track.helper";
import {
  testRunOkResponse,
  testRunUnresolvedResponse,
  testRunAutoApprovedResponse,
  testRunNewResponse,
} from "../__data__";

describe.each<[TestStatus.new | TestStatus.unresolved, string]>([
  [TestStatus.new, "No baseline: "],
  [TestStatus.unresolved, "Difference found: "],
])("processTestRun", (status, expectedMessage) => {
  beforeEach(() => {
    testRunUnresolvedResponse.status = status;
  });

  it(`default soft assert should throw exception if status ${status}`, () => {
    expect(() => processTestRun(testRunUnresolvedResponse)).toThrowError(
      new Error(expectedMessage.concat(testRunUnresolvedResponse.url))
    );
  });

  it(`disabled soft assert should throw exception if status ${status}`, () => {
    const enableSoftAssert = false;

    expect(() =>
      processTestRun(testRunUnresolvedResponse, enableSoftAssert)
    ).toThrowError(
      new Error(expectedMessage.concat(testRunUnresolvedResponse.url))
    );
  });

  it(`enabled soft assert should log error if status ${status}`, () => {
    console.error = jest.fn();
    const enableSoftAssert = true;

    processTestRun(testRunUnresolvedResponse, enableSoftAssert);

    expect(console.error).toHaveBeenCalledWith(
      expectedMessage.concat(testRunUnresolvedResponse.url)
    );
  });
});

it.each<[TestRunResponse, boolean]>([
  [testRunOkResponse, true],
  [testRunUnresolvedResponse, false],
  [testRunAutoApprovedResponse, true],
  [testRunNewResponse, true],
])("shouldStopRetry", (response, expectedResult) => {
  expect(shouldStopRetry(response)).toBe(expectedResult);
});

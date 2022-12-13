import { TestRunResponse, TestStatus } from "../types";
import {
  processTestRun,
  shouldStopRetry,
  trackWithRetry,
} from "./track.helper";
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

const unresolvedResponce: TestRunResponse = {
  id: "someId",
  imageName: "imageName",
  diffName: "diffName",
  baselineName: "baselineName",
  diffPercent: 1.11,
  diffTollerancePercent: 2.22,
  pixelMisMatchCount: 3,
  status: TestStatus.unresolved,
  url: "url",
  merge: true,
};

const okResponce: TestRunResponse = {
  ...unresolvedResponce,
  status: TestStatus.ok,
};

it("should stop when diff not found", async () => {
  // .Arrange
  const trackMock = jest.fn().mockReturnValue(okResponce);

  // .Act
  await trackWithRetry(trackMock, 5);

  // .Assert
  expect(trackMock).toBeCalledTimes(1);
});

it("should stop on default retry limit", async () => {
  // .Arrange
  const trackMock = jest.fn().mockReturnValue(unresolvedResponce);

  // .Act
  await trackWithRetry(trackMock, undefined as unknown as number, true);

  // .Assert
  expect(trackMock).toBeCalledTimes(3);
});

it("should stop on custom retry limit", async () => {
  // .Arrange
  const trackMock = jest.fn().mockReturnValue(unresolvedResponce);

  // .Act
  await trackWithRetry(trackMock, 5, true);

  // .Assert
  expect(trackMock).toBeCalledTimes(6);
});

it.each<[TestRunResponse, boolean]>([
  [testRunOkResponse, true],
  [testRunUnresolvedResponse, false],
  [testRunAutoApprovedResponse, true],
  [testRunNewResponse, true],
])("shouldStopRetry", (response, expectedResult) => {
  expect(shouldStopRetry(response)).toBe(expectedResult);
});

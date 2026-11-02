import { TestRunResponse, TestStatus } from "../types";

const getErrorMessage = (
  testRunResponse: TestRunResponse
): string | undefined => {
  switch (testRunResponse.status) {
    case TestStatus.new: {
      return `No baseline: ${testRunResponse.url}`;
    }
    case TestStatus.unresolved: {
      return `Difference found: ${testRunResponse.url}`;
    }
  }
};

const getWarningMessage = (
  testRunResponse: TestRunResponse
): string | undefined => {
  switch (testRunResponse.status) {
    case TestStatus.new:
    case TestStatus.ok:
    case TestStatus.unresolved:
    case TestStatus.approved:
    case TestStatus.autoApproved: {
      return undefined;
    }
    case TestStatus.failed: {
      return `Rejected: ${testRunResponse.url}`;
    }
    default: {
      return `Unknown test run status "${testRunResponse.status}": ${testRunResponse.url}`;
    }
  }
};

export const processTestRun = (
  testRunResponse: TestRunResponse,
  enableSoftAssert?: boolean
) => {
  const errorMessage = getErrorMessage(testRunResponse);

  if (errorMessage) {
    if (enableSoftAssert) {
      // eslint-disable-next-line no-console
      console.error(errorMessage);
    } else {
      throw new Error(errorMessage);
    }
  }

  const warningMessage = getWarningMessage(testRunResponse);
  if (warningMessage) {
    // eslint-disable-next-line no-console
    console.warn(warningMessage);
  }
};

export const shouldStopRetry = (result: TestRunResponse) =>
  result.status !== TestStatus.unresolved;

export const trackWithRetry = async (
  trackFn: () => Promise<TestRunResponse>,
  retryLimit: number = 2,
  enableSoftAssert?: boolean
): Promise<TestRunResponse> => {
  const result = await trackFn();
  if (retryLimit <= 0 || shouldStopRetry(result)) {
    processTestRun(result, enableSoftAssert);
    return result;
  }
  // eslint-disable-next-line no-console
  console.info(`Diff found... Remaining retry attempts **${retryLimit}**`);
  return trackWithRetry(trackFn, retryLimit - 1, enableSoftAssert);
};

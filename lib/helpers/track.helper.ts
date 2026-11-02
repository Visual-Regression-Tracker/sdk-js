import { TestRunResponse, TestStatus } from "../types";

const getOutcome = (
  testRunResponse: TestRunResponse
): { fails: boolean; message: string } | undefined => {
  const { status, url } = testRunResponse;
  switch (status) {
    case TestStatus.new: {
      return { fails: true, message: `No baseline: ${url}` };
    }
    case TestStatus.unresolved: {
      return { fails: true, message: `Difference found: ${url}` };
    }
    case TestStatus.ok:
    case TestStatus.approved:
    case TestStatus.autoApproved: {
      return undefined;
    }
    case TestStatus.failed: {
      return { fails: false, message: `Rejected: ${url}` };
    }
    default: {
      return {
        fails: false,
        message: `Unknown test run status "${status}": ${url}`,
      };
    }
  }
};

export const processTestRun = (
  testRunResponse: TestRunResponse,
  enableSoftAssert?: boolean
) => {
  const outcome = getOutcome(testRunResponse);
  if (!outcome) {
    return;
  }
  if (!outcome.fails) {
    // eslint-disable-next-line no-console
    console.warn(outcome.message);
  } else if (enableSoftAssert) {
    // eslint-disable-next-line no-console
    console.error(outcome.message);
  } else {
    throw new Error(outcome.message);
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

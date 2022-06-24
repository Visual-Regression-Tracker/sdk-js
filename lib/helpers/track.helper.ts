import { TestRunResponse, TestStatus } from "../types";

export const trackWithRetry = async (
  trackFn: () => Promise<TestRunResponse>,
  retryLimit: number,
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

export const shouldStopRetry = (result: TestRunResponse) =>
  result.status !== TestStatus.unresolved;

export const processTestRun = (
  testRunResponse: TestRunResponse,
  enableSoftAssert?: boolean
) => {
  let errorMessage: string | undefined;
  switch (testRunResponse.status) {
    case TestStatus.new: {
      errorMessage = `No baseline: ${testRunResponse.url}`;
      break;
    }
    case TestStatus.unresolved: {
      errorMessage = `Difference found: ${testRunResponse.url}`;
      break;
    }
  }

  if (errorMessage) {
    if (enableSoftAssert) {
      // eslint-disable-next-line no-console
      console.error(errorMessage);
    } else {
      throw new Error(errorMessage);
    }
  }
};

import { TestRunResponse } from "./types";

export default class TestRunResult {
  testRunResponse: TestRunResponse;
  imageUrl: string;
  diffUrl?: string;
  baselineUrl?: string;

  constructor(testRunResponse: TestRunResponse, apiUrl: string) {
    this.testRunResponse = testRunResponse;
    this.imageUrl = apiUrl.concat("/").concat(testRunResponse.imageName);
    this.diffUrl =
      testRunResponse.diffName &&
      apiUrl.concat("/").concat(testRunResponse.diffName);
    this.baselineUrl =
      testRunResponse.baselineName &&
      apiUrl.concat("/").concat(testRunResponse.baselineName);
  }
}

import { TestRunResponse } from "./types";

export default class TestRunResult {
  testRunResponse: TestRunResponse;
  imageUrl: string;
  diffUrl?: string;
  baselineUrl?: string;

  constructor(testRunResponse: TestRunResponse, apiUrl: string) {
    const imageUrl = (name: string) => `${apiUrl}/images/${name}`;
    this.testRunResponse = testRunResponse;
    this.imageUrl = imageUrl(testRunResponse.imageName);
    this.diffUrl =
      testRunResponse.diffName && imageUrl(testRunResponse.diffName);
    this.baselineUrl =
      testRunResponse.baselineName && imageUrl(testRunResponse.baselineName);
  }
}

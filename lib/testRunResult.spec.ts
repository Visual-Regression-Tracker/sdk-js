import TestRunResult from "./testRunResult";
import { TestRunResponse, TestStatus } from "./types";

describe("TestRunResult", () => {
  it("only required images", () => {
    const testRunResponse: TestRunResponse = {
      url: "url",
      status: TestStatus.ok,
      pixelMisMatchCount: 12,
      diffPercent: 0.12,
      diffTollerancePercent: 0,
      id: "some id",
      imageName: "imageName",
      merge: false,
    };

    const result = new TestRunResult(testRunResponse, "http://localhost");

    expect(result.testRunResponse).toBe(testRunResponse);
    expect(result.imageUrl).toBe("http://localhost/imageName");
    expect(result.diffUrl).toBeUndefined();
    expect(result.baselineUrl).toBeUndefined();
  });

  it("all image", () => {
    const testRunResponse: TestRunResponse = {
      url: "url",
      status: TestStatus.ok,
      pixelMisMatchCount: 12,
      diffPercent: 0.12,
      diffTollerancePercent: 0,
      id: "some id",
      imageName: "imageName",
      diffName: "diffName",
      baselineName: "baselineName",
      merge: false,
    };

    const result = new TestRunResult(testRunResponse, "http://localhost");

    expect(result.testRunResponse).toBe(testRunResponse);
    expect(result.imageUrl).toBe("http://localhost/imageName");
    expect(result.diffUrl).toBe("http://localhost/diffName");
    expect(result.baselineUrl).toBe("http://localhost/baselineName");
  });
});

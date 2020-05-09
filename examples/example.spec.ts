import { VisualRegressionTracker, Config } from "../";
import { readFileSync } from "fs";

describe("asd", () => {
  const config: Config = {
    apiUrl: "http://localhost:4200",
    branchName: "develop",
    projectId: "a93c0341-cf31-48cf-a067-240e214ee39b",
    token: "3W7TJCZR2H4ADSM76Q1VYMBYVCA2",
  };
  const vrt = new VisualRegressionTracker(config);

  it("test 2", async () => {
    const testResult = await vrt.submitTestResult({
      name: "Example 2",
      // buildId: buildId,
      imageBase64: new Buffer(readFileSync("examples/1.png")).toString(
        "base64"
      ),
      os: "Windows",
      browser: "Chrome",
      viewport: "800x600",
      device: "PC",
      diffTollerancePercent: 0,
    });

    console.log(testResult);
  });

  it("test 1", async () => {
    const testResult = await vrt.submitTestResult({
      name: "Example 1",
      imageBase64: new Buffer(readFileSync("examples/1.png")).toString(
        "base64"
      ),
      os: "Windows",
      // browser: "Chrome",
      // viewport: "800x600",
      // device: "PC",
    });

    console.log(testResult);
  });

  it("test 1 chrome", async () => {
    const testResult = await vrt.submitTestResult({
      name: "Example 1",
      imageBase64: new Buffer(readFileSync("examples/1.png")).toString(
        "base64"
      ),
      os: "Windows",
      browser: "Chrome",
      // viewport: "800x600",
      // device: "PC",
      diffTollerancePercent: 10.5,
    });

    console.log(testResult);
  });
});

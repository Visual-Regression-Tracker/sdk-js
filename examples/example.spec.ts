import { VisualRegressionTracker, Config } from "../lib";
import { readFileSync } from "fs";

describe("asd", () => {
  const config: Config = {
    apiUrl: "http://localhost:4200",
    branchName: "develop",
    projectId: "76f0c443-9811-4f4f-b1c2-7c01c5775d9a",
    apiKey: "F5Z2H0H2SNMXZVHX0EA4YQM1MGDD",
  };
  const vrt = new VisualRegressionTracker(config);

  it("test 2", async () => {
    const testResult = await vrt.track({
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
    const testResult = await vrt.track({
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
    const testResult = await vrt.track({
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

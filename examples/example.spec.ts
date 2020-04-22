import Config from "../lib/types/config";
import VisualRegressionTracker from "../lib";
import { readFileSync } from "fs";

describe("asd", () => {
  const config: Config = {
    apiUrl: "http://localhost:4200",
    branchName: "develop",
    projectId: 1,
    token: "8ACNWG97YGMZBRP3JJM0EY66KX2F",
  };
  const vrt = new VisualRegressionTracker(config);
  let buildId: number;

  beforeAll(async () => {
    const build = await vrt.startBuild(config.projectId, config.branchName);
    buildId = Number.parseInt(build.id);
  });

  it("test", async () => {
    const testResult = await vrt.submitTestResult({
      name: "Example",
      buildId: buildId,
      imageBase64: new Buffer(readFileSync("examples/2.png")).toString(
        "base64"
      ),
      os: "Windows",
      browser: "Chrome",
      viewport: "800x600",
      device: "PC",
    });

    console.log(testResult);
  });

  it("test", async () => {
    const testResult = await vrt.submitTestResult({
      name: "Example",
      buildId: buildId,
      imageBase64: new Buffer(readFileSync("examples/1.png")).toString(
        "base64"
      ),
      os: "Windows",
      browser: "Chrome",
      viewport: "800x600",
      device: "PC",
    });

    console.log(testResult);
  });
});

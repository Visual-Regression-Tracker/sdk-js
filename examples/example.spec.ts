import Config from "../lib/types/config";
import VisualRegressionTracker from "../lib";
import { readFileSync, writeFileSync } from "fs";

describe("asd", () => {
  const config: Config = {
    apiUrl: "http://localhost:4200",
    branchName: "develop",
    projectId: 1,
    token: "8ACNWG97YGMZBRP3JJM0EY66KX2F",
  };

  const a = new VisualRegressionTracker(config);

  it("test", async () => {
    const build = await a.startBuild(config.projectId, config.branchName);
    const testResult = await a.submitTestResult({
      name: "Example",
      buildId: Number.parseInt(build.id),
      imageBase64: new Buffer(
        readFileSync("examples/2.png")
      ).toString("base64"),
      os: "Windows",
      browser: "Chrome",
      viewport: "800x600",
      device: "PC",
    });

    console.log(testResult);
  });
});

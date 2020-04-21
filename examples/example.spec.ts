import Config from "../lib/types/config";
import VisualRegressionTracker from "../lib";

describe("asd", () => {
  const config: Config = {
    apiUrl: "http://localhost:4200",
    branchName: "develop",
    projectId: 1,
    token: '8ACNWG97YGMZBRP3JJM0EY66KX2F'
  };

  const a = new VisualRegressionTracker(config);

  it("test", async () => {
      const buildId = await a.startBuild(config.projectId, config.branchName)

      console.log(buildId)
  });
});

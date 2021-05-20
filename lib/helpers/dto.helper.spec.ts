import { multipartDtoToFormData } from "./index";
import { TestRunMultipartDto } from "types/request";

jest.mock("form-data");

describe("multipartDtoToFormData", () => {
  it.each([
    [
      {
        branchName: "develop",
        projectId: "projectId",
        buildId: "buildId",
        name: "name",
        imagePath: "./lib/__data__/2.png",
        os: "os",
        device: "device",
        viewport: "viewport",
        browser: "browser",
        diffTollerancePercent: 0.123,
        ignoreAreas: [
          {
            x: 1,
            y: 2,
            height: 300,
            width: 400,
          },
        ],
      },
    ],
    [
      {
        branchName: "develop",
        projectId: "projectId",
        buildId: "buildId",
        name: "name",
        imagePath: "./lib/__data__/2.png",
      },
    ],
  ])("should return form data", (dto: TestRunMultipartDto) => {
    expect(multipartDtoToFormData(dto)).toMatchSnapshot();
  });
});

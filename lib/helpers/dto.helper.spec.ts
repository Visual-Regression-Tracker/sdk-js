import { multipartDtoToFormData } from "./index";
import { TestRunMultipartDto } from "types/request";
import { mocked } from "ts-jest/utils";
import * as fs from "fs";

jest.mock("form-data");

jest.mock("fs");
const fsMock = mocked(fs);

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
    fsMock.createReadStream.mockReturnValueOnce(
      "mocked Image" as unknown as fs.ReadStream
    );
    fsMock.statSync.mockReturnValueOnce({ size: 1234 } as fs.Stats);

    const result = multipartDtoToFormData(dto);

    expect(result).toMatchSnapshot();
  });
});

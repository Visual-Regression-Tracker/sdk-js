import { multipartDtoToFormData, bufferDtoToFormData } from "./index";
import { TestRunBufferDto, TestRunMultipartDto } from "../types";
import * as fs from "fs";
import FormData from "form-data";

vi.mock("fs");
const fsMock = vi.mocked(fs);

const appendSpy = vi.spyOn(FormData.prototype, "append");

beforeEach(() => {
  appendSpy.mockClear();
});

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
        customTags: "customTags",
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

    expect(result).toBeInstanceOf(FormData);
    expect(appendSpy.mock.calls).toMatchSnapshot();
  });
});

describe("bufferDtoToFormData", () => {
  it.each([
    [
      {
        branchName: "develop",
        projectId: "projectId",
        buildId: "buildId",
        name: "name",
        imageBuffer: Buffer.of(1, 2, 3),
        os: "os",
        device: "device",
        customTags: "customTags",
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
        imageBuffer: Buffer.of(1, 2, 3),
      },
    ],
  ])("should return form data", (dto: TestRunBufferDto) => {
    const result = bufferDtoToFormData(dto);

    expect(result).toBeInstanceOf(FormData);
    expect(appendSpy.mock.calls).toMatchSnapshot();
  });
});

describe("sourceBranch", () => {
  const dto = {
    branchName: "develop",
    sourceBranch: "feature",
    projectId: "projectId",
    buildId: "buildId",
    name: "name",
  };

  it.each([
    [
      "multipartDtoToFormData",
      () => multipartDtoToFormData({ ...dto, imagePath: "./lib/__data__/2.png" }),
    ],
    [
      "bufferDtoToFormData",
      () => bufferDtoToFormData({ ...dto, imageBuffer: Buffer.of(1, 2, 3) }),
    ],
  ])("should be sent by %s", (_, toFormData) => {
    fsMock.createReadStream.mockReturnValueOnce(
      "mocked Image" as unknown as fs.ReadStream
    );
    fsMock.statSync.mockReturnValueOnce({ size: 1234 } as fs.Stats);

    toFormData();

    expect(appendSpy).toHaveBeenCalledWith("sourceBranch", "feature");
  });
});

describe("deprecated baselineBranchName", () => {
  it("is accepted by the DTO type but not sent", () => {
    const dto: TestRunBufferDto = {
      branchName: "develop",
      baselineBranchName: "release",
      projectId: "projectId",
      buildId: "buildId",
      name: "name",
      imageBuffer: Buffer.of(1, 2, 3),
    };

    bufferDtoToFormData(dto);

    expect(appendSpy).not.toHaveBeenCalledWith(
      "baselineBranchName",
      expect.anything()
    );
  });
});

describe.each([
  [
    "multipartDtoToFormData",
    () => {
      fsMock.createReadStream.mockReturnValueOnce(
        "mocked Image" as unknown as fs.ReadStream
      );
      fsMock.statSync.mockReturnValueOnce({ size: 1234 } as fs.Stats);
      return (merge: boolean) =>
        multipartDtoToFormData({
          branchName: "develop",
          projectId: "projectId",
          buildId: "buildId",
          name: "name",
          imagePath: "./lib/__data__/2.png",
          merge,
        });
    },
  ],
  [
    "bufferDtoToFormData",
    () => (merge: boolean) =>
      bufferDtoToFormData({
        branchName: "develop",
        projectId: "projectId",
        buildId: "buildId",
        name: "name",
        imageBuffer: Buffer.of(1, 2, 3),
        merge,
      }),
  ],
])("%s", (_, converter) => {
  it.each([true, false])("sends merge %p", (merge) => {
    converter()(merge);

    expect(appendSpy).toHaveBeenCalledWith("merge", String(merge));
  });
});

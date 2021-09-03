import FormData from "form-data";
import fs from "fs";
import { TestRunMultipartDto, TestRunBufferDto } from "../types";

export const multipartDtoToFormData = (dto: TestRunMultipartDto): FormData => {
  const data = new FormData();
  data.append("buildId", dto.buildId);
  data.append("projectId", dto.projectId);
  data.append("branchName", dto.branchName);
  data.append("name", dto.name);
  data.append("image", fs.createReadStream(dto.imagePath), {
    knownLength: fs.statSync(dto.imagePath).size,
  });
  dto.os && data.append("os", dto.os);
  dto.browser && data.append("browser", dto.browser);
  dto.viewport && data.append("viewport", dto.viewport);
  dto.device && data.append("device", dto.device);
  dto.customTags && data.append("customTags", dto.customTags);
  dto.ignoreAreas &&
    data.append("ignoreAreas", JSON.stringify(dto.ignoreAreas));
  dto.diffTollerancePercent &&
    data.append("diffTollerancePercent", dto.diffTollerancePercent);

  return data;
};

export const bufferDtoToFormData = (dto: TestRunBufferDto): FormData => {
  const data = new FormData();
  data.append("buildId", dto.buildId);
  data.append("projectId", dto.projectId);
  data.append("branchName", dto.branchName);
  data.append("name", dto.name);
  data.append("image", dto.imageBuffer, { filename: "image.png" });
  dto.os && data.append("os", dto.os);
  dto.browser && data.append("browser", dto.browser);
  dto.viewport && data.append("viewport", dto.viewport);
  dto.device && data.append("device", dto.device);
  dto.customTags && data.append("customTags", dto.customTags);
  dto.ignoreAreas &&
    data.append("ignoreAreas", JSON.stringify(dto.ignoreAreas));
  dto.diffTollerancePercent &&
    data.append("diffTollerancePercent", dto.diffTollerancePercent);

  return data;
};

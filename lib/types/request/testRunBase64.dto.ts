import { TestRunDto } from "./testRun.dto";

export interface TestRunBase64Dto extends TestRunDto {
  imageBase64: string;
}

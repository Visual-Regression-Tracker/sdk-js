import { TestRunDto } from "./testRun.dto";

export interface TestRunBufferDto extends TestRunDto {
  imageBuffer: Buffer;
}

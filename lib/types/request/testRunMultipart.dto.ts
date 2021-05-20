import { TestRunDto } from "./testRun.dto";

export interface TestRunMultipartDto extends TestRunDto {
  imagePath: string;
}

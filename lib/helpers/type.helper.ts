import { TestRunBase64 } from "types";

export function instanceOfTestRunBase64(object: any): object is TestRunBase64 {
  return "imageBase64" in object;
}

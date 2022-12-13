import { TestRunBase64, TestRunBuffer, TestRunMultipart } from "../types";

export function instanceOfTestRunBase64(object: any): object is TestRunBase64 {
  return "imageBase64" in object;
}

export function instanceOfTestRunBuffer(object: any): object is TestRunBuffer {
  return "imageBuffer" in object;
}

export function instanceOfTestRunMultipart(object: any): object is TestRunMultipart {
  return "imagePath" in object;
}
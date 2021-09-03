import { TestRunBase64, TestRunMultipart } from "../types";
import { instanceOfTestRunBase64 } from "./index";

describe("instanceOfTestRunBase64", () => {
  it.each([
    [
      {
        name: "name",
        imagePath: "iamge",
        os: "os",
        device: "device",
        customTags: "customTags",
        viewport: "viewport",
        browser: "browser",
      },
      false,
    ],
    [
      {
        name: "name",
        imageBase64: "iamge",
        os: "os",
        device: "device",
        customTags: "customTags",
        viewport: "viewport",
        browser: "browser",
      },
      true,
    ],
  ])(
    "should return",
    (input: TestRunBase64 | TestRunMultipart, expected: boolean) => {
      expect(instanceOfTestRunBase64(input)).toBe(expected);
    }
  );
});

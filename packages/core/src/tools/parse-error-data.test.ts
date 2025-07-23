import { describe, expect, it } from "vitest";
import { ErrorData } from "../schema";
import { toErrorData } from "./parse-error-data";

describe("toErrorData", () => {
  it("should convert an Error object to ErrorData", () => {
    const error = new Error("Something went wrong");
    const result = toErrorData(error);

    expect(result).toHaveProperty("message", "Something went wrong");
    expect(result).toHaveProperty("name", "Error");
    expect(result).toHaveProperty("stack");
  });

  it("should convert a string to ErrorData", () => {
    const error = "String error";
    const result = toErrorData(error);

    expect(result).toEqual({ message: "String error" });
  });

  it("should return the same ErrorData object if given", () => {
    const errorData: ErrorData = {
      message: "Already formatted",
      name: "CustomError",
      stack: "some-stack-trace",
    };

    const result = toErrorData(errorData);

    expect(result).toBe(errorData); // identity check
  });
});

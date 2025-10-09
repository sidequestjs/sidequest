import { parseStackTrace } from "./stack-parser";

describe("parseStackTrace", () => {
  it("should parse stack trace with Windows file paths", () => {
    const error = new Error("Test error");
    error.stack = `Error: Test error
        at function1 (C:\\Users\\test\\file.js:10:5)
        at function2 (C:\\Projects\\app\\index.ts:25:12)`;

    const result = parseStackTrace(error);
    expect(result).toEqual(["C:/Users/test/file.js", "C:/Projects/app/index.ts"]);
  });

  it("should parse stack trace with Unix file paths", () => {
    const error = new Error("Test error");
    error.stack = `Error: Test error
        at function1 (/home/user/file.js:10:5)
        at function2 (/opt/app/index.ts:25:12)`;

    const result = parseStackTrace(error);
    expect(result).toEqual(["/home/user/file.js", "/opt/app/index.ts"]);
  });

  it("should parse stack trace with file:// protocol", () => {
    const error = new Error("Test error");
    error.stack = `Error: Test error
        at function1 (file:///C:/Users/test/file.js:10:5)
        at function2 (file:///home/user/app.ts:15:8)`;

    const result = parseStackTrace(error);
    expect(result).toEqual(["C:/Users/test/file.js", "/home/user/app.ts"]);
  });

  it("should handle mixed path formats", () => {
    const error = new Error("Test error");
    error.stack = `Error: Test error
        at function1 (C:\\Windows\\file.js:10:5)
        at function2 (/usr/local/file.ts:20:3)
        at function3 (file:///D:/project/main.js:5:1)`;

    const result = parseStackTrace(error);
    expect(result).toEqual(["C:/Windows/file.js", "/usr/local/file.ts", "D:/project/main.js"]);
  });

  it("should return empty array when stack is undefined", () => {
    const error = new Error("Test error");
    error.stack = undefined;

    const result = parseStackTrace(error);
    expect(result).toEqual([]);
  });
});

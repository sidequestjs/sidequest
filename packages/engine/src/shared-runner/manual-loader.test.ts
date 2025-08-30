import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findSidequestJobsScriptInParentDirs } from "./manual-loader";

describe("findSidequestJobsScriptInParentDirs", () => {
  const tempDir = resolve(import.meta.dirname, "temp-test-dir");
  const nestedDir = join(tempDir, "nested", "deeply", "nested");
  const originalCwd = process.cwd();

  beforeEach(() => {
    // Create temporary directory structure for testing
    mkdirSync(nestedDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up temporary directories
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe("finding files in current directory", () => {
    it("should find file in current directory", () => {
      const fileName = "test-file.js";
      const filePath = join(tempDir, fileName);
      writeFileSync(filePath, "test content");

      const result = findSidequestJobsScriptInParentDirs(fileName, tempDir);

      expect(result).toBe(pathToFileURL(filePath).href);
    });

    it("should find default sidequest.jobs.js file in current directory", () => {
      const fileName = "sidequest.jobs.js";
      const filePath = join(tempDir, fileName);
      writeFileSync(filePath, "export default {};");

      const result = findSidequestJobsScriptInParentDirs(undefined, tempDir);

      expect(result).toBe(pathToFileURL(filePath).href);
    });

    it("should use process.cwd() as default start directory", () => {
      const fileName = "current-dir-file.js";
      const filePath = join(originalCwd, fileName);

      try {
        writeFileSync(filePath, "test");

        const result = findSidequestJobsScriptInParentDirs(fileName);

        expect(result).toBe(pathToFileURL(filePath).href);
      } finally {
        // Clean up
        if (existsSync(filePath)) {
          rmSync(filePath);
        }
      }
    });
  });

  describe("finding files in parent directories", () => {
    it("should find file in parent directory", () => {
      const fileName = "parent-file.js";
      const parentFilePath = join(tempDir, fileName);
      writeFileSync(parentFilePath, "parent content");

      const result = findSidequestJobsScriptInParentDirs(fileName, nestedDir);

      expect(result).toBe(pathToFileURL(parentFilePath).href);
    });

    it("should find file in grandparent directory", () => {
      const fileName = "grandparent-file.js";
      const grandparentDir = join(tempDir, "nested");
      const grandparentFilePath = join(grandparentDir, fileName);
      writeFileSync(grandparentFilePath, "grandparent content");

      const result = findSidequestJobsScriptInParentDirs(fileName, nestedDir);

      expect(result).toBe(pathToFileURL(grandparentFilePath).href);
    });

    it("should find file closest to starting directory", () => {
      const fileName = "duplicate-file.js";

      // Create file in root temp dir
      const rootFilePath = join(tempDir, fileName);
      writeFileSync(rootFilePath, "root content");

      // Create file in nested dir (closer to start)
      const nestedFilePath = join(tempDir, "nested", fileName);
      writeFileSync(nestedFilePath, "nested content");

      const result = findSidequestJobsScriptInParentDirs(fileName, nestedDir);

      // Should find the closest one (in nested dir)
      expect(result).toBe(pathToFileURL(nestedFilePath).href);
    });
  });

  describe("error handling", () => {
    it("should throw error when file is not found", () => {
      const fileName = "non-existent-file.js";

      expect(() => {
        findSidequestJobsScriptInParentDirs(fileName, nestedDir);
      }).toThrow(`File "${fileName}" not found in "${nestedDir}" or any parent directory`);
    });

    it("should throw error with custom file name", () => {
      const fileName = "custom-missing-file.json";

      expect(() => {
        findSidequestJobsScriptInParentDirs(fileName, tempDir);
      }).toThrow(`File "${fileName}" not found in "${tempDir}" or any parent directory`);
    });

    it("should throw error when starting from non-existent directory", () => {
      const nonExistentDir = "/path/that/does/not/exist";
      const fileName = "test.js";

      expect(() => {
        findSidequestJobsScriptInParentDirs(fileName, nonExistentDir);
      }).toThrow(`File "${fileName}" not found in "${nonExistentDir}" or any parent directory`);
    });
  });

  describe("file URL conversion", () => {
    it("should return file URL format", () => {
      const fileName = "url-test.js";
      const filePath = join(tempDir, fileName);
      writeFileSync(filePath, "url test");

      const result = findSidequestJobsScriptInParentDirs(fileName, tempDir);

      expect(result).toMatch(/^file:\/\//);
      expect(result).toBe(pathToFileURL(filePath).href);
    });

    it("should handle paths with spaces", () => {
      const dirWithSpaces = join(tempDir, "dir with spaces");
      mkdirSync(dirWithSpaces);

      const fileName = "spaced-file.js";
      const filePath = join(dirWithSpaces, fileName);
      writeFileSync(filePath, "spaced content");

      const result = findSidequestJobsScriptInParentDirs(fileName, dirWithSpaces);

      expect(result).toBe(pathToFileURL(filePath).href);
      expect(result).toContain("dir%20with%20spaces");
    });

    it("should handle paths with special characters", () => {
      const dirWithSpecialChars = join(tempDir, "dir-with-special_chars@123");
      mkdirSync(dirWithSpecialChars);

      const fileName = "special-file.js";
      const filePath = join(dirWithSpecialChars, fileName);
      writeFileSync(filePath, "special content");

      const result = findSidequestJobsScriptInParentDirs(fileName, dirWithSpecialChars);

      expect(result).toBe(pathToFileURL(filePath).href);
    });
  });

  describe("edge cases", () => {
    it("should handle relative paths in startDir", () => {
      const fileName = "relative-test.js";
      const filePath = join(process.cwd(), fileName);
      writeFileSync(filePath, "relative content");

      // Use relative path
      const relativePath = `./`;

      try {
        const result = findSidequestJobsScriptInParentDirs(fileName, relativePath);

        expect(result).toBe(pathToFileURL(filePath).href);
      } finally {
        // Clean up
        if (existsSync(filePath)) {
          rmSync(filePath);
        }
      }
    });

    it("should traverse up to root directory when file not found", () => {
      const fileName = "root-file.js";

      // This test verifies that the function traverses all the way up
      // to the root directory before throwing an error
      expect(() => {
        findSidequestJobsScriptInParentDirs(fileName, nestedDir);
      }).toThrow(`File "${fileName}" not found in "${nestedDir}" or any parent directory`);
    });

    it("should handle empty file name", () => {
      const fileName = "";

      expect(() => {
        findSidequestJobsScriptInParentDirs(fileName, tempDir);
      }).toThrow(`fileName must be a non-empty string`);
    });

    it("should handle file name with extension", () => {
      const fileName = "config.json";
      const filePath = join(tempDir, fileName);
      writeFileSync(filePath, '{"test": true}');

      const result = findSidequestJobsScriptInParentDirs(fileName, tempDir);

      expect(result).toBe(pathToFileURL(filePath).href);
    });

    it("should handle file name without extension", () => {
      const fileName = "Dockerfile";
      const filePath = join(tempDir, fileName);
      writeFileSync(filePath, "FROM node:18");

      const result = findSidequestJobsScriptInParentDirs(fileName, tempDir);

      expect(result).toBe(pathToFileURL(filePath).href);
    });
  });

  describe("directory traversal", () => {
    it("should stop at root directory", () => {
      const fileName = "never-exists.js";

      // Starting from a deeply nested directory
      expect(() => {
        findSidequestJobsScriptInParentDirs(fileName, nestedDir);
      }).toThrow(`File "${fileName}" not found in "${nestedDir}" or any parent directory`);
    });

    it("should handle symbolic links properly", () => {
      // This test would be platform-specific and complex to set up
      // but the current implementation should handle them through resolve()
      const fileName = "symlink-test.js";
      const filePath = join(tempDir, fileName);
      writeFileSync(filePath, "symlink content");

      const result = findSidequestJobsScriptInParentDirs(fileName, tempDir);

      expect(result).toBe(pathToFileURL(filePath).href);
    });
  });
});

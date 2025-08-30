import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Finds a file by searching in the current directory and walking up through parent directories.
 *
 * @param fileName - The name of the file to search for. Defaults to "sidequest.jobs.js"
 * @param startDir - The directory to start searching from. Defaults to process.cwd()
 * @returns The file URL path to the found file
 * @throws {Error} If the file is not found in any directory up to the root
 *
 * @example
 * ```typescript
 * // Find sidequest.jobs.js starting from current directory
 * const jobsFile = findFileInParentDirs();
 *
 * // Find a specific file starting from current directory
 * const configFile = findFileInParentDirs("config.json");
 *
 * // Find a file starting from a specific directory
 * const packageFile = findFileInParentDirs("package.json", "/some/project/dir");
 * ```
 */
export function findSidequestJobsScriptInParentDirs(fileName = "sidequest.jobs.js", startDir = process.cwd()): string {
  if (!fileName.trim()) {
    throw new Error("fileName must be a non-empty string");
  }

  let currentDir = resolve(startDir);
  const rootDir = resolve("/");

  // Keep searching until we reach the root directory
  while (currentDir !== rootDir) {
    const filePath = join(currentDir, fileName);

    if (existsSync(filePath)) {
      return pathToFileURL(filePath).href;
    }

    // Move to parent directory
    const parentDir = dirname(currentDir);

    // Safety check to prevent infinite loops
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

  // Check the root directory as well
  const rootFilePath = join(rootDir, fileName);
  if (existsSync(rootFilePath)) {
    return pathToFileURL(rootFilePath).href;
  }

  throw new Error(`File "${fileName}" not found in "${startDir}" or any parent directory`);
}

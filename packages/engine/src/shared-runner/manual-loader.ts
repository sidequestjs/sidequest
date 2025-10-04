import { parseStackTrace } from "@sidequest/core";
import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Tag used to indicate that a job script should be resolved manually
 * by searching the filesystem rather than importing directly.
 */
export const MANUAL_SCRIPT_TAG = "sidequest.jobs.js";

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
export function findSidequestJobsScriptInParentDirs(fileName = MANUAL_SCRIPT_TAG, startDir = process.cwd()): string {
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

/**
 * Resolves a script path to a file URL, handling various path formats and resolution strategies.
 *
 * This function attempts to resolve script paths in the following order:
 * 1. If the path is already a valid URL, returns it as-is (for file: protocol URLs)
 * 2. If the path is absolute, converts it directly to a file URL
 * 3. If the path is relative, searches for the file in directories from the call stack,
 *    starting from the caller's directory and walking up the stack
 *
 * The stack-based resolution helps resolve relative paths based on the script's
 * execution context rather than the current working directory.
 *
 * @param scriptPath - The script path to resolve. Can be a relative path, absolute path, or URL string.
 * @returns The resolved file URL as a string
 * @throws {Error} When scriptPath is empty or when the file cannot be found in any searched location
 *
 * @example
 * ```typescript
 * // Absolute path
 * resolveScriptPath('/path/to/script.js') // Returns 'file:///path/to/script.js'
 *
 * // Relative path (searches based on call stack)
 * resolveScriptPath('./script.js') // Returns file URL of script.js found in caller's directory
 *
 * // Already a URL
 * resolveScriptPath('file:///path/to/script.js') // Returns 'file:///path/to/script.js'
 * ```
 */
export function resolveScriptPath(scriptPath: string): string {
  scriptPath = scriptPath.trim();
  if (!scriptPath) {
    throw new Error("scriptPath must be a non-empty string");
  }

  // If the scriptPath is already a URL, return as is
  try {
    const url = new URL(scriptPath);
    if (url.protocol === "file:") {
      return url.href;
    }
  } catch {
    // Not a valid URL, proceed to resolve as file path
  }

  // If it's an absolute path, convert directly to file URL
  if (isAbsolute(scriptPath)) {
    return pathToFileURL(scriptPath).href;
  }

  // Otherwise, search in current and parent directories based on stack trace
  // This helps in resolving relative paths based on where the script is executed
  // rather than the current working directory
  const err = new Error();
  const stackFiles = parseStackTrace(err);
  for (const file of stackFiles) {
    const parentDir = dirname(file);
    const resolvedPath = resolve(parentDir, scriptPath);
    if (existsSync(resolvedPath)) {
      return pathToFileURL(resolvedPath).href;
    }
  }

  throw new Error(`Unable to resolve script path: ${scriptPath}`);
}

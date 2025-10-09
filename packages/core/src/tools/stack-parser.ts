/**
 * Parses an error stack trace to extract file paths.
 *
 * @param err - The Error object containing the stack trace to parse
 * @returns An array of normalized file paths extracted from the stack trace, with backslashes converted to forward slashes and null entries filtered out
 *
 * @example
 * ```typescript
 * const error = new Error('Something went wrong');
 * const filePaths = parseStackTrace(error);
 * console.log(filePaths); // ['C:/path/to/file.js', '/another/path/file.ts']
 * ```
 */
export function parseStackTrace(err: Error): string[] {
  const stackLines = err.stack?.split("\n") ?? [];
  return stackLines
    .map((line) => {
      const match = /(file:\/\/)?(((\/?)(\w:))?([/\\].+)):\d+:\d+/.exec(line);
      if (match) {
        return `${match[5] ?? ""}${match[6].replaceAll("\\", "/")}`;
      }
      return undefined;
    })
    .filter(Boolean) as string[];
}

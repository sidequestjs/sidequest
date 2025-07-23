import { ErrorData } from "../schema/error-data";

/**
 * Generate serializable errors.
 * Error objects are not fully serializable by default because their fields are not enumerable.
 * For example:
 *   const err = new Error("my error");
 *   const foo = { ...err };        // foo is {}
 *   JSON.stringify(err);           // returns '{}'
 * This function extracts all own properties, making the error serializable for logs and transport.
 * @param err The error object to serialize.
 * @returns A serializable error data object.
 */
export function serializeError(err: Error): ErrorData {
  const plain = {
    name: err.name,
    message: err.message,
    stack: err.stack,
    ...Object.getOwnPropertyNames(err)
      .filter((k) => !["name", "message", "stack"].includes(k))
      .reduce((acc, k) => {
        acc[k] = err[k] as unknown;
        return acc;
      }, {}),
  };
  return plain;
}

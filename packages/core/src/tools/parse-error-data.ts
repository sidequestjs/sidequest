import { ErrorData } from "../schema";
import { serializeError } from "./serialize-error";

/**
 * Converts a string, Error, or ErrorData to ErrorData format.
 * @param error The error input (string, Error, or ErrorData).
 * @returns The error as ErrorData.
 */
export function toErrorData(error: string | Error | ErrorData): ErrorData {
  if (error instanceof Error) {
    return serializeError(error);
  } else if (typeof error === "string") {
    return { message: error } as ErrorData;
  }

  return error;
}

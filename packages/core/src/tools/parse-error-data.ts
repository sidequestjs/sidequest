import { ErrorData } from "../schema";
import { serializeError } from "./serialize-error";

export function toErrorData(error: string | Error | ErrorData): ErrorData {
  if (error instanceof Error) {
    return serializeError(error);
  } else if (typeof error === "string") {
    return { message: error } as ErrorData;
  }

  return error;
}

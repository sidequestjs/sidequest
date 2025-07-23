/**
 * Represents data associated with an error, including its name, message,
 * stack trace, and optional attempt metadata.
 */
export interface ErrorData {
  /**
   * The name of the error.
   * Can be null or undefined if not specified.
   */
  name?: string | null;

  /**
   * The error message describing the error.
   */
  message: string;

  /**
   * The stack trace associated with the error.
   * Can be null or undefined if not specified.
   */
  stack?: string | null;

  /**
   * The attempt number, if this error is part of a retryable action.
   * Can be null or undefined if not specified.
   */
  attempt?: number | null;

  /**
   * The date and time when the attempt was made.
   * Can be null or undefined if not specified.
   */
  attempted_at?: Date | null;

  /**
   * Identifier for the entity (user, service, etc.) that made the attempt.
   * Can be null or undefined if not specified.
   */
  attempt_by?: string | null;

  /**
   * Additional arbitrary properties associated with the error.
   */
  [key: string]: unknown;
}

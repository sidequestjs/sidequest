/**
 * Base class for API errors that should surface as an HTTP 404.
 * The Hono error handler maps any subclass to a 404 JSON response.
 */
export class NotFoundError extends Error {}

/** Thrown when a job id does not resolve to a job. */
export class JobNotFoundError extends NotFoundError {
  constructor(id: number) {
    super(`Job ${id} not found`);
    this.name = "JobNotFoundError";
  }
}

/** Thrown when a queue name does not resolve to a queue. */
export class QueueNotFoundError extends NotFoundError {
  constructor(name: string) {
    super(`Queue '${name}' not found`);
    this.name = "QueueNotFoundError";
  }
}

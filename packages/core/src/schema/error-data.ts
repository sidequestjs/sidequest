export interface ErrorData {
  name?: string | null;
  message: string;
  stack?: string | null;
  attempt?: number | null;
  attempted_at?: Date | null;
  attempt_by?: string | null;
  [key: string]: unknown;
}

export interface ErrorData {
  name: string;
  message: string;
  stack?: string;
  attempt: number;
  attempted_at?: Date;
  attempt_by?: string;
}

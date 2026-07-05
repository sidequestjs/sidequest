import { cn } from "./cn";

/** Props for the {@link Delta} trend chip. */
export interface DeltaProps {
  /** Percentage change; non-negative reads as up, negative as down. */
  value: number;
  className?: string;
}

/**
 * Delta — a compact ▲/▼ percentage chip for stat-card trends. Non-negative values use
 * the completed tone, negative values the failed tone.
 */
export function Delta({ value, className = "" }: DeltaProps) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[3px] font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded-full",
        up ? "text-status-completed bg-status-completed/15" : "text-status-failed bg-status-failed/15",
        className,
      )}
    >
      {`${up ? "▲" : "▼"} ${Math.abs(value)}%`}
    </span>
  );
}

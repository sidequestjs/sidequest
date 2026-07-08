import { cn } from "./cn";

/** States a {@link StatusDot} can represent (job + queue lifecycles). */
export type StatusDotState =
  | "completed"
  | "failed"
  | "running"
  | "claimed"
  | "waiting"
  | "scheduled"
  | "canceled"
  | "active"
  | "paused"
  | "disabled";

/** Props for the {@link StatusDot} indicator. */
export interface StatusDotProps {
  state: StatusDotState;
  /** Overrides the default label (the capitalized state). */
  label?: string;
  className?: string;
}

/** state -> tone key (several states share a color). */
const TONE: Record<StatusDotState, "completed" | "failed" | "running" | "scheduled" | "muted"> = {
  completed: "completed",
  active: "completed",
  failed: "failed",
  disabled: "failed",
  running: "running",
  claimed: "running",
  waiting: "scheduled",
  scheduled: "scheduled",
  paused: "scheduled",
  canceled: "muted",
};

/** tone key -> dot fill + soft halo ring. */
const DOT: Record<string, string> = {
  completed: "bg-status-completed shadow-[0_0_0_3px_color-mix(in_srgb,var(--status-completed)_22%,transparent)]",
  failed: "bg-status-failed shadow-[0_0_0_3px_color-mix(in_srgb,var(--status-failed)_22%,transparent)]",
  running: "bg-status-running shadow-[0_0_0_3px_color-mix(in_srgb,var(--status-running)_22%,transparent)]",
  scheduled: "bg-status-scheduled shadow-[0_0_0_3px_color-mix(in_srgb,var(--status-scheduled)_22%,transparent)]",
  muted: "bg-fg-muted shadow-[0_0_0_3px_color-mix(in_srgb,var(--text-muted)_22%,transparent)]",
};

/**
 * StatusDot — a colored dot plus label for a job or queue state, using the theme-aware
 * status tokens. Running/claimed states pulse to read as live.
 */
export function StatusDot({ state, label, className = "" }: StatusDotProps) {
  const pulse = state === "running" || state === "claimed";
  return (
    <span className={cn("inline-flex items-center gap-2 text-[13px] text-fg", className)}>
      <span className={cn("w-2 h-2 rounded-full shrink-0", DOT[TONE[state]], pulse && "sq-pulse")} />
      {label ?? state.charAt(0).toUpperCase() + state.slice(1)}
    </span>
  );
}

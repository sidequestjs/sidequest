import type { CSSProperties, ReactNode } from "react";
import { cn } from "./cn";

/** Job lifecycle states with a badge preset. */
export type JobState = "completed" | "failed" | "running" | "claimed" | "waiting" | "scheduled" | "canceled";
/** Queue states with a badge preset. */
export type QueueState = "active" | "paused" | "disabled";

/** Props for the {@link Badge} status pill. */
export interface BadgeProps {
  /** Job or queue state preset (drives color + default label). @default "neutral" */
  state?: JobState | QueueState | "neutral";
  /** Show a leading status dot. */
  dot?: boolean;
  /** Override background (caller escape hatch, applied inline). */
  bg?: string;
  /** Override foreground (caller escape hatch, applied inline). */
  fg?: string;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

interface StatePreset {
  /** Foreground text utility (theme-aware status token). */
  text: string;
  /** Soft-tint fill utility (same token at low alpha). */
  fill: string;
  label: string;
}

const STATE: Record<string, StatePreset> = {
  completed: { text: "text-status-completed", fill: "bg-status-completed/15", label: "Completed" },
  failed: { text: "text-status-failed", fill: "bg-status-failed/15", label: "Failed" },
  running: { text: "text-status-running", fill: "bg-status-running/15", label: "Running" },
  claimed: { text: "text-status-running", fill: "bg-status-running/15", label: "Claimed" },
  waiting: { text: "text-status-scheduled", fill: "bg-status-scheduled/15", label: "Waiting" },
  scheduled: { text: "text-status-scheduled", fill: "bg-status-scheduled/15", label: "Scheduled" },
  canceled: { text: "text-fg-secondary", fill: "bg-fg-secondary/15", label: "Canceled" },
  active: { text: "text-status-completed", fill: "bg-status-completed/15", label: "Active" },
  paused: { text: "text-status-scheduled", fill: "bg-status-scheduled/15", label: "Paused" },
  disabled: { text: "text-status-failed", fill: "bg-status-failed/15", label: "Disabled" },
  neutral: { text: "text-fg-secondary", fill: "bg-fg-secondary/15", label: "" },
};

/**
 * Badge — soft-filled status pill. Presets cover every Sidequest job state
 * (completed/failed/running/claimed/waiting/scheduled/canceled) and queue state
 * (active/paused/disabled). Colors come from the theme-aware status tokens, so the
 * pill adapts to the light and dark themes; pass `bg`/`fg` to override.
 */
export function Badge({ state = "neutral", children, dot = false, className = "", style = {}, bg, fg }: BadgeProps) {
  const preset = STATE[state] ?? STATE.neutral;
  const override: CSSProperties = {};
  if (bg) override.background = bg;
  if (fg) override.color = fg;

  return (
    <span
      className={cn(
        "sq-badge inline-flex items-center gap-[0.35rem] h-6 px-[0.6rem] text-xs font-semibold leading-none rounded-full whitespace-nowrap",
        !fg && preset.text,
        !bg && preset.fill,
        className,
      )}
      style={{ ...override, ...style }}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children ?? preset.label}
    </span>
  );
}

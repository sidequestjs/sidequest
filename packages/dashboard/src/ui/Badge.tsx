import type { CSSProperties, ReactNode } from "react";

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
  /** Override background. */
  bg?: string;
  /** Override foreground. */
  fg?: string;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

interface StatePreset {
  /** Theme-aware status color token; the pill fill is a soft tint of it. */
  color: string;
  label: string;
}

const STATE: Record<string, StatePreset> = {
  completed: { color: "var(--status-completed)", label: "Completed" },
  failed: { color: "var(--status-failed)", label: "Failed" },
  running: { color: "var(--status-running)", label: "Running" },
  claimed: { color: "var(--status-running)", label: "Claimed" },
  waiting: { color: "var(--status-scheduled)", label: "Waiting" },
  scheduled: { color: "var(--status-scheduled)", label: "Scheduled" },
  canceled: { color: "var(--text-secondary)", label: "Canceled" },
  active: { color: "var(--status-completed)", label: "Active" },
  paused: { color: "var(--status-scheduled)", label: "Paused" },
  disabled: { color: "var(--status-failed)", label: "Disabled" },
  neutral: { color: "var(--text-secondary)", label: "" },
};

/**
 * Badge — soft-filled status pill. Presets cover every Sidequest job state
 * (completed/failed/running/claimed/waiting/scheduled/canceled) and queue state
 * (active/paused/disabled). Colors come from the theme-aware status tokens, so the
 * pill adapts to the light and dark themes; pass `bg`/`fg` to override.
 */
export function Badge({ state = "neutral", children, dot = false, className = "", style = {}, bg, fg }: BadgeProps) {
  const preset = STATE[state] ?? STATE.neutral;
  const foreground = fg ?? preset.color;
  const background = bg ?? `color-mix(in srgb, ${preset.color} 18%, transparent)`;
  return (
    <span
      className={`sq-badge ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        height: "1.5rem",
        padding: "0 0.6rem",
        fontSize: "var(--text-xs)",
        fontWeight: "var(--weight-semibold)",
        lineHeight: 1,
        borderRadius: "var(--radius-full)",
        background,
        color: foreground,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: "var(--radius-full)", background: "currentColor" }} />}
      {children ?? preset.label}
    </span>
  );
}

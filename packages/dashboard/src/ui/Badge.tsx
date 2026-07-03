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
  bg: string;
  fg: string;
  label: string;
}

const STATE: Record<string, StatePreset> = {
  completed: { bg: "rgba(79,175,117,0.18)", fg: "#7bd6a0", label: "Completed" },
  failed: { bg: "rgba(183,82,82,0.20)", fg: "#e88d8d", label: "Failed" },
  running: { bg: "rgba(43,124,211,0.20)", fg: "#71b0f2", label: "Running" },
  claimed: { bg: "rgba(61,125,216,0.18)", fg: "#6fa8ec", label: "Claimed" },
  waiting: { bg: "rgba(210,169,76,0.18)", fg: "#e0c078", label: "Waiting" },
  scheduled: { bg: "rgba(210,169,76,0.18)", fg: "#e0c078", label: "Scheduled" },
  canceled: { bg: "rgba(154,166,186,0.16)", fg: "#b3bdcc", label: "Canceled" },
  active: { bg: "rgba(79,175,117,0.18)", fg: "#7bd6a0", label: "Active" },
  paused: { bg: "rgba(210,169,76,0.18)", fg: "#e0c078", label: "Paused" },
  disabled: { bg: "rgba(183,82,82,0.20)", fg: "#e88d8d", label: "Disabled" },
  neutral: { bg: "var(--surface-hover)", fg: "var(--text-secondary)", label: "" },
};

/**
 * Badge — soft-filled status pill. Presets cover every Sidequest job state
 * (completed/failed/running/claimed/waiting/scheduled/canceled) and queue state
 * (active/paused/disabled). Pass `state` for a preset or `bg`/`fg` to override.
 */
export function Badge({ state = "neutral", children, dot = false, className = "", style = {}, bg, fg }: BadgeProps) {
  const preset = STATE[state] || STATE.neutral;
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
        background: bg ?? preset.bg,
        color: fg ?? preset.fg,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: "var(--radius-full)", background: "currentColor" }} />}
      {children ?? preset.label}
    </span>
  );
}

import type { CSSProperties, ReactNode } from "react";
import { cn } from "./cn";
import { Icon, type IconName } from "./Icon";

/** Number tone for {@link StatCard}. */
export type StatTone = "running" | "completed" | "failed" | "scheduled" | "neutral";

/** Props for the {@link StatCard} metric tile. */
export interface StatCardProps {
  /** Muted top label, e.g. "Completed Jobs". */
  label: string;
  /** Large number/value. */
  value: ReactNode;
  /** Number color. @default "neutral" */
  tone?: StatTone;
  /** Lucide icon in the top-right. */
  icon?: IconName;
  /** Small delta/subtext next to the value. */
  delta?: string;
  className?: string;
  style?: CSSProperties;
}

const TONE_TEXT: Record<StatTone, string> = {
  running: "text-status-running",
  completed: "text-status-completed",
  failed: "text-status-failed",
  scheduled: "text-status-scheduled",
  neutral: "text-fg-strong",
};

/**
 * StatCard — the dashboard's top-row metric tile. Muted label, large tone-colored
 * number, optional Lucide icon and delta.
 */
export function StatCard({ label, value, tone = "neutral", icon, delta, className = "", style = {} }: StatCardProps) {
  return (
    <div
      className={cn("sq-statcard bg-surface-raised border border-edge rounded-md p-4 shadow-sm", className)}
      style={style}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-fg-secondary">{label}</span>
        {icon && <Icon name={icon} size={16} className={TONE_TEXT[tone]} />}
      </div>
      <div className="flex items-baseline gap-2 mt-[0.4rem]">
        <span className={cn("text-3xl font-bold leading-none", TONE_TEXT[tone])}>{value}</span>
        {delta && <span className="text-xs text-fg-muted">{delta}</span>}
      </div>
    </div>
  );
}

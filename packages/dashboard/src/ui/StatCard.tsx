import type { CSSProperties, ReactNode } from "react";
import { Icon } from "./Icon";

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
  icon?: string;
  /** Small delta/subtext next to the value. */
  delta?: string;
  className?: string;
  style?: CSSProperties;
}

const TONES: Record<StatTone, string> = {
  running: "var(--status-running)",
  completed: "var(--status-completed)",
  failed: "var(--status-failed)",
  scheduled: "var(--status-scheduled)",
  neutral: "var(--text-strong)",
};

/**
 * StatCard — the dashboard's top-row metric tile. Muted label, large tone-colored
 * number, optional Lucide icon and delta.
 */
export function StatCard({ label, value, tone = "neutral", icon, delta, className = "", style = {} }: StatCardProps) {
  return (
    <div
      className={`sq-statcard ${className}`}
      style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-4) var(--space-4)",
        boxShadow: "var(--shadow-sm)",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{label}</span>
        {icon && <Icon name={icon} size={16} style={{ color: TONES[tone] }} />}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginTop: "0.4rem" }}>
        <span style={{ fontSize: "var(--text-3xl)", fontWeight: "var(--weight-bold)", color: TONES[tone], lineHeight: 1 }}>
          {value}
        </span>
        {delta && <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{delta}</span>}
      </div>
    </div>
  );
}

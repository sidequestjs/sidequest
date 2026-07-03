import type { CSSProperties } from "react";
import { Icon } from "./Icon";

/** Status of a single {@link StepProgress} node. */
export type StepStatus = "done" | "active" | "failed" | "canceled" | "pending";

/** A single step in a {@link StepProgress} timeline. */
export interface Step {
  label: string;
  /** Lucide icon name for the node. */
  icon?: string;
  status: StepStatus;
}

/** Props for the {@link StepProgress} lifecycle stepper. */
export interface StepProgressProps {
  steps: Step[];
  className?: string;
  style?: CSSProperties;
}

const STEP_TONE: Record<StepStatus, string> = {
  done: "var(--status-completed)",
  active: "var(--brand-primary)",
  failed: "var(--status-failed)",
  canceled: "var(--text-secondary)",
  pending: "var(--border-strong)",
};

const FILLED: StepStatus[] = ["done", "active", "failed", "canceled"];

/**
 * StepProgress — the job-lifecycle stepper (Enqueued → Claimed → Running → Completed).
 * Each step carries a label, an optional Lucide icon, and a status that drives its tone.
 */
export function StepProgress({ steps, className = "", style = {} }: StepProgressProps) {
  return (
    <div className={`sq-steps ${className}`} style={{ display: "flex", alignItems: "flex-start", width: "100%", ...style }}>
      {steps.map((step, i) => {
        const tone = STEP_TONE[step.status];
        const isLast = i === steps.length - 1;
        const nextTone = isLast ? null : STEP_TONE[steps[i + 1].status];
        const lineTone =
          step.status === "done"
            ? "var(--status-completed)"
            : nextTone && nextTone !== STEP_TONE.pending
              ? tone
              : "var(--border-default)";
        const filled = FILLED.includes(step.status);
        const leftLine =
          i === 0
            ? "transparent"
            : steps[i - 1].status === "done"
              ? "var(--status-completed)"
              : filled
                ? tone
                : "var(--border-default)";
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
              <div style={{ flex: 1, height: 3, background: leftLine }} />
              <div
                style={{
                  width: 34,
                  height: 34,
                  flexShrink: 0,
                  borderRadius: "var(--radius-full)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: filled ? tone : "var(--surface-raised)",
                  border: filled ? "none" : "2px solid var(--border-strong)",
                  color: filled ? "#fff" : "var(--text-muted)",
                }}
              >
                <Icon name={step.icon ?? "circle"} size={16} />
              </div>
              <div style={{ flex: 1, height: 3, background: isLast ? "transparent" : lineTone }} />
            </div>
            <span
              style={{
                marginTop: "0.55rem",
                fontSize: "var(--text-sm)",
                color: filled ? "var(--text-primary)" : "var(--text-muted)",
                fontWeight: "var(--weight-medium)",
              }}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

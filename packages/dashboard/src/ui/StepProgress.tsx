import type { CSSProperties } from "react";
import { cn } from "./cn";
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

/** Fill utility per status, shared by the node disc and the connecting lines. */
const TONE_BG: Record<StepStatus, string> = {
  done: "bg-status-completed",
  active: "bg-brand",
  failed: "bg-status-failed",
  canceled: "bg-fg-secondary",
  pending: "bg-edge-strong",
};

const FILLED: StepStatus[] = ["done", "active", "failed", "canceled"];

/**
 * StepProgress — the job-lifecycle stepper (Enqueued → Claimed → Running → Completed).
 * Each step carries a label, an optional Lucide icon, and a status that drives its tone.
 */
export function StepProgress({ steps, className = "", style = {} }: StepProgressProps) {
  return (
    <div className={cn("sq-steps flex items-start w-full", className)} style={style}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const filled = FILLED.includes(step.status);
        const leftLine =
          i === 0
            ? "bg-transparent"
            : steps[i - 1].status === "done"
              ? "bg-status-completed"
              : filled
                ? TONE_BG[step.status]
                : "bg-edge";
        const rightLine =
          isLast
            ? "bg-transparent"
            : step.status === "done"
              ? "bg-status-completed"
              : steps[i + 1].status !== "pending"
                ? TONE_BG[step.status]
                : "bg-edge";
        return (
          <div key={i} className="flex flex-col items-center flex-1">
            <div className="flex items-center w-full">
              <div className={cn("flex-1 h-[3px]", leftLine)} />
              <div
                className={cn(
                  "w-[34px] h-[34px] shrink-0 rounded-full flex items-center justify-center",
                  filled ? cn(TONE_BG[step.status], "text-white") : "bg-surface-raised border-2 border-edge-strong text-fg-muted",
                )}
              >
                <Icon name={step.icon ?? "circle"} size={16} />
              </div>
              <div className={cn("flex-1 h-[3px]", rightLine)} />
            </div>
            <span className={cn("mt-[0.55rem] text-sm font-medium", filled ? "text-fg" : "text-fg-muted")}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

import type { JobData } from "@sidequest/core";
import type { ReactNode } from "react";
import { Badge, type JobState } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { CodeBlock } from "../../ui/CodeBlock";
import { type Step, StepProgress, type StepStatus } from "../../ui/StepProgress";

/** Props for the {@link JobDetailView}. */
export interface JobDetailViewProps {
  job: JobData;
  onBack: () => void;
  onRerun: (id: number) => void;
  onCancel: (id: number) => void;
}

/** state -> the four lifecycle step statuses (Enqueued → Claimed → Running → last). */
const STEP_MAP: Record<string, [StepStatus, StepStatus, StepStatus, StepStatus]> = {
  completed: ["done", "done", "done", "done"],
  failed: ["done", "done", "done", "failed"],
  canceled: ["done", "done", "active", "canceled"],
  running: ["done", "done", "active", "pending"],
  claimed: ["done", "active", "pending", "pending"],
  waiting: ["active", "pending", "pending", "pending"],
};

function Row({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="font-semibold text-fg-secondary min-w-20">{label}</span>
      <span className={mono ? "font-mono text-fg" : "text-fg"}>{value}</span>
    </div>
  );
}

/**
 * JobDetailView — a job's lifecycle stepper, metadata, constructor/run arguments,
 * result, and error traces. Faithful to the design system's job-detail screen.
 */
export function JobDetailView({ job, onBack, onRerun, onCancel }: JobDetailViewProps) {
  const statuses = STEP_MAP[job.state] ?? STEP_MAP.waiting;
  const done = ["canceled", "failed", "completed"].includes(job.state);
  const lastLabel = job.state === "failed" ? "Failed" : job.state === "canceled" ? "Canceled" : "Completed";
  const lastIcon = job.state === "failed" ? "x-circle" : job.state === "canceled" ? "alert-circle" : "check-circle";
  const steps: Step[] = [
    { label: "Enqueued", icon: "clock", status: statuses[0] },
    { label: "Claimed", icon: "user-check", status: statuses[1] },
    { label: "Running", icon: "activity", status: statuses[2] },
    { label: lastLabel, icon: lastIcon, status: statuses[3] },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button size="sm" variant="ghost" icon="arrow-left" onClick={onBack}>
          Back
        </Button>
        <h1 className="m-0 text-2xl font-bold text-fg-strong flex-1 flex items-center gap-3">
          #{job.id} — {job.class}
          <Badge state={job.state as JobState} />
        </h1>
        <div className="flex gap-2">
          {done ? (
            <Button size="sm" variant="outline" icon="refresh-ccw" onClick={() => onRerun(job.id)}>
              Re-Run
            </Button>
          ) : (
            <Button size="sm" variant="outline" icon="x" onClick={() => onCancel(job.id)}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      <Card padding="var(--space-8)">
        <StepProgress steps={steps} />
      </Card>

      <Card title="Job Details" padding="var(--space-6)">
        <div className="flex flex-col gap-2 text-sm">
          <Row label="Class" value={job.class} mono />
          <Row label="Script" value={job.script} mono />
          <Row label="Attempts" value={`${job.attempt} / ${job.max_attempts}`} />
        </div>

        <h4 className="mt-5 mb-1.5 text-sm text-fg-strong">Constructor Arguments</h4>
        {job.constructor_args.length > 0 ? (
          <CodeBlock code={job.constructor_args} />
        ) : (
          <p className="italic text-fg-muted text-xs m-0">No arguments</p>
        )}

        <h4 className="mt-5 mb-1.5 text-sm text-fg-strong">Run Arguments</h4>
        {job.args.length > 0 ? (
          <CodeBlock code={job.args} />
        ) : (
          <p className="italic text-fg-muted text-xs m-0">No arguments</p>
        )}

        {job.result != null && (
          <>
            <h4 className="mt-5 mb-1.5 text-sm text-fg-strong">Result</h4>
            <CodeBlock code={job.result as object} />
          </>
        )}

        {job.errors && job.errors.length > 0 && (
          <>
            <h4 className="mt-5 mb-1.5 text-sm text-fg-strong">Errors</h4>
            <div className="bg-surface-code border border-edge rounded-md px-4 py-[0.85rem]">
              {job.errors.map((error, i) => (
                <div key={i} className="text-xs font-mono">
                  <span className="text-status-failed font-medium">{error.message}</span>
                  {error.stack && (
                    <details className="mt-1.5">
                      <summary className="cursor-pointer text-fg-link">Stack Trace</summary>
                      <pre className="mt-1.5 whitespace-pre-wrap text-fg-secondary text-2xs">{error.stack}</pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

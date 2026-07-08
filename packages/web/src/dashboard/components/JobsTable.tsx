import type { JobData } from "@sidequest/core";
import { cn } from "../../ui/cn";
import { Button } from "../../ui/Button";
import { Icon } from "../../ui/Icon";
import { Pagination } from "../../ui/Pagination";
import { relativeTime } from "../../ui/relative-time";
import { StatusDot, type StatusDotState } from "../../ui/StatusDot";

/** Props for the {@link JobsTable}. */
export interface JobsTableProps {
  jobs: JobData[];
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
  /** Steps the page by `delta` (−1 / +1). */
  onPage: (delta: number) => void;
  onOpenJob: (id: number) => void;
  onRerun: (id: number) => void;
  onCancel: (id: number) => void;
}

const HEADERS = ["Job", "Queue", "State", "Attempts", "Available", "Worker", ""];
const RERUNNABLE = ["canceled", "failed", "completed"];

/**
 * JobsTable — the refined jobs list: monospace `#id` chips, status dots, attempt ratios,
 * relative available time, worker, and row actions revealed on hover. Clicking a row
 * opens the job detail.
 */
export function JobsTable({
  jobs,
  page,
  pageSize,
  total,
  hasNext,
  onPage,
  onOpenJob,
  onRerun,
  onCancel,
}: JobsTableProps) {
  const start = (page - 1) * pageSize;
  return (
    <div className="bg-surface-raised border border-edge rounded-xl overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {HEADERS.map((header, i) => (
              <th
                key={i}
                className={cn(
                  "px-3.5 py-2.5 font-mono text-[10.5px] tracking-[0.05em] uppercase text-fg-muted font-semibold border-b border-edge bg-surface-inset",
                  i === HEADERS.length - 1 ? "text-right" : "text-left",
                )}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {jobs.length === 0 && (
            <tr>
              <td colSpan={HEADERS.length} className="px-3.5 py-10 text-center text-fg-muted text-[13px]">
                No jobs match these filters.
              </td>
            </tr>
          )}
          {jobs.map((job) => {
            const rerun = RERUNNABLE.includes(job.state);
            return (
              <tr
                key={job.id}
                onClick={() => onOpenJob(job.id)}
                className="group cursor-pointer border-b border-edge-subtle transition-colors hover:bg-surface-hover"
              >
                <td className="px-3.5 py-[11px] text-[13px] text-fg whitespace-nowrap">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[11px] text-fg-muted bg-surface-inset border border-edge px-1.5 py-0.5 rounded-[5px]">
                      #{job.id}
                    </span>
                    <span className="font-medium">{job.class}</span>
                  </div>
                </td>
                <td className="px-3.5 py-[11px] text-[13px] font-mono text-fg-secondary whitespace-nowrap">{job.queue}</td>
                <td className="px-3.5 py-[11px] whitespace-nowrap">
                  <StatusDot state={job.state as StatusDotState} />
                </td>
                <td
                  className={cn(
                    "px-3.5 py-[11px] text-[13px] font-mono whitespace-nowrap",
                    job.attempt >= job.max_attempts && job.state === "failed" ? "text-status-failed" : "text-fg-secondary",
                  )}
                >
                  {job.attempt}/{job.max_attempts}
                </td>
                <td className="px-3.5 py-[11px] font-mono text-[12px] text-fg-muted whitespace-nowrap">
                  {relativeTime(job.available_at ? new Date(job.available_at).toISOString() : null)}
                </td>
                <td className="px-3.5 py-[11px] font-mono text-[12px] text-fg-secondary whitespace-nowrap">
                  {job.claimed_by ?? "—"}
                </td>
                <td className="px-3.5 py-[11px] text-right whitespace-nowrap">
                  <span className="inline-flex gap-1.5 items-center opacity-0 transition-opacity group-hover:opacity-100">
                    {rerun ? (
                      <Button
                        size="sm"
                        variant="default"
                        icon="RefreshCcw"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRerun(job.id);
                        }}
                      >
                        Rerun
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="default"
                        icon="X"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCancel(job.id);
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                    <Icon name="ChevronRight" size={16} className="text-fg-muted" />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex justify-between items-center px-3.5 py-2.5 border-t border-edge">
        <span className="font-mono text-[12px] text-fg-muted">
          {total === 0 ? 0 : start + 1}–{start + jobs.length} of {total}
        </span>
        <Pagination page={page} hasNext={hasNext} onPrev={() => onPage(-1)} onNext={() => onPage(1)} />
      </div>
    </div>
  );
}

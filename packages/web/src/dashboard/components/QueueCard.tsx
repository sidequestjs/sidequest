import type { QueueWithCounts } from "../../api/services/queue-service";
import { Button } from "../../ui/Button";
import { cn } from "../../ui/cn";

/** Props for the {@link QueueCard}. */
export interface QueueCardProps {
  queue: QueueWithCounts;
  onToggle: (name: string) => void;
}

const SEGMENTS: { key: "waiting" | "running" | "completed" | "failed"; color: string }[] = [
  { key: "waiting", color: "bg-status-scheduled" },
  { key: "running", color: "bg-status-running" },
  { key: "completed", color: "bg-status-completed" },
  { key: "failed", color: "bg-status-failed" },
];

/**
 * QueueCard — a queue at a glance: a live status pulse, concurrency/priority chips, and
 * a load bar segmented by job state with a legend, plus a pause/activate toggle.
 */
export function QueueCard({ queue, onToggle }: QueueCardProps) {
  const counts = queue.jobs;
  const active = queue.state === "active";
  const total = SEGMENTS.reduce((sum, segment) => sum + (counts?.[segment.key] ?? 0), 0) || 1;
  return (
    <div className="bg-surface-raised border border-edge rounded-xl p-[18px] flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[9px]">
          <span
            className={cn(
              "w-[9px] h-[9px] rounded-full",
              active
                ? "sq-pulse bg-status-completed shadow-[0_0_0_3px_color-mix(in_srgb,var(--status-completed)_22%,transparent)]"
                : "bg-status-scheduled shadow-[0_0_0_3px_color-mix(in_srgb,var(--status-scheduled)_22%,transparent)]",
            )}
          />
          <span className="font-mono text-[15px] font-semibold text-fg-strong">{queue.name}</span>
        </div>
        <Button size="sm" variant="default" icon={active ? "pause" : "play"} onClick={() => onToggle(queue.name)}>
          {active ? "Pause" : "Activate"}
        </Button>
      </div>

      <div className="flex gap-2">
        <span className="font-mono text-[11px] text-fg-secondary bg-surface-inset border border-edge px-2 py-[3px] rounded-md">
          concurrency {queue.concurrency}
        </span>
        <span className="font-mono text-[11px] text-fg-secondary bg-surface-inset border border-edge px-2 py-[3px] rounded-md">
          priority {queue.priority}
        </span>
      </div>

      <div>
        <div className="flex h-2 rounded-full overflow-hidden bg-surface-inset">
          {SEGMENTS.map((segment) => {
            const value = counts?.[segment.key] ?? 0;
            return value > 0 ? (
              <div key={segment.key} className={segment.color} style={{ width: `${(value / total) * 100}%` }} />
            ) : null;
          })}
        </div>
        <div className="flex flex-wrap gap-3 mt-2.5">
          {SEGMENTS.map((segment) => (
            <span key={segment.key} className="inline-flex items-center gap-1.5 text-[12px] text-fg-secondary">
              <span className={cn("w-[7px] h-[7px] rounded-full", segment.color)} />
              <span className="capitalize">{segment.key}</span>
              <span className="font-mono text-fg">{counts?.[segment.key] ?? 0}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

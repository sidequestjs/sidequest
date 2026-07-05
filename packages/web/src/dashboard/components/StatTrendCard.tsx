import { cn } from "../../ui/cn";
import { Delta } from "../../ui/Delta";
import { Sparkline } from "../../ui/Sparkline";

/** Tone of a {@link StatTrendCard} (maps to a status color). */
export type StatTrendTone = "running" | "completed" | "failed" | "scheduled";

/** Props for the {@link StatTrendCard}. */
export interface StatTrendCardProps {
  label: string;
  value: number | string;
  tone: StatTrendTone;
  /** Recent values for the inline sparkline. */
  series: number[];
  /** Percentage trend for the {@link Delta} chip. */
  delta: number;
}

const BAR: Record<StatTrendTone, string> = {
  running: "bg-status-running",
  completed: "bg-status-completed",
  failed: "bg-status-failed",
  scheduled: "bg-status-scheduled",
};

const TEXT: Record<StatTrendTone, string> = {
  running: "text-status-running",
  completed: "text-status-completed",
  failed: "text-status-failed",
  scheduled: "text-status-scheduled",
};

const COLOR: Record<StatTrendTone, string> = {
  running: "var(--status-running)",
  completed: "var(--status-completed)",
  failed: "var(--status-failed)",
  scheduled: "var(--status-scheduled)",
};

/**
 * StatTrendCard — an overview metric tile: a tone top-bar, a mono label with a trend
 * delta, and a large mono value paired with an inline sparkline of its recent series.
 */
export function StatTrendCard({ label, value, tone, series, delta }: StatTrendCardProps) {
  const display = typeof value === "number" ? String(value).padStart(2, "0") : value;
  return (
    <div className="relative overflow-hidden bg-surface-raised border border-edge rounded-xl px-4 pt-4 pb-3 transition-[border-color,transform] duration-[180ms] ease-standard hover:-translate-y-px hover:border-edge-strong">
      <span className={cn("absolute top-0 left-0 right-0 h-0.5 opacity-70", BAR[tone])} />
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] tracking-[0.04em] uppercase text-fg-muted">{label}</span>
        <Delta value={delta} />
      </div>
      <div className="flex items-end justify-between gap-2 mt-2">
        <span className={cn("font-mono text-[34px] font-bold leading-none", TEXT[tone])}>{display}</span>
        <Sparkline data={series} color={COLOR[tone]} width={92} height={30} />
      </div>
    </div>
  );
}

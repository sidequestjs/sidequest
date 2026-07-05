/** Props for the {@link SuccessRateCard}. */
export interface SuccessRateCardProps {
  /** Success percentage (0–100). */
  rate: number;
  /** Number of jobs the rate is computed over. */
  throughput: number;
  /** Human label for the window, e.g. "last 12m". */
  rangeLabel: string;
}

/**
 * SuccessRateCard — the completed / (completed + failed) success gauge: a large mono
 * percentage over a brand-gradient bar, with the throughput count beneath.
 */
export function SuccessRateCard({ rate, throughput, rangeLabel }: SuccessRateCardProps) {
  return (
    <div className="flex-1 flex flex-col justify-center bg-surface-raised border border-edge rounded-xl px-5 py-[18px]">
      <span className="font-mono text-[11px] tracking-[0.04em] uppercase text-fg-muted">Success rate</span>
      <div className="flex items-baseline gap-1.5 mt-1.5">
        <span className="font-mono text-[40px] font-bold leading-none text-fg-strong">{rate}</span>
        <span className="text-lg text-fg-muted">%</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-inset mt-3 overflow-hidden">
        <div className="h-full bg-[var(--brand-gradient)]" style={{ width: `${rate}%` }} />
      </div>
      <div className="font-mono text-[11px] text-fg-muted mt-2">
        {throughput} jobs · {rangeLabel}
      </div>
    </div>
  );
}

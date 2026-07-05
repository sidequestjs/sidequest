import { useId } from "react";
import { cn } from "./cn";

/** Props for the {@link Sparkline} inline trend chart. */
export interface SparklineProps {
  /** The series to plot. */
  data: number[];
  /** Stroke/fill color (any CSS color). @default "var(--brand-primary)" */
  color?: string;
  /** @default 96 */
  width?: number;
  /** @default 30 */
  height?: number;
  /** Draw the gradient area under the line. @default true */
  fill?: boolean;
  className?: string;
}

/**
 * Sparkline — a tiny inline trend line (data-viz, not iconography) for stat cards.
 * Plots `data` as a smooth line with an optional gradient fill and an end dot. Renders
 * nothing for an empty series.
 */
export function Sparkline({
  data,
  color = "var(--brand-primary)",
  width = 96,
  height = 30,
  fill = true,
  className = "",
}: SparklineProps) {
  const gradientId = useId();
  if (data.length === 0) {
    return null;
  }
  const max = Math.max(1, ...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const step = width / (data.length - 1 || 1);
  const points = data.map((v, i) => [i * step, height - ((v - min) / span) * (height - 4) - 2] as const);
  const line = points.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  const last = points[points.length - 1];
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("block overflow-visible", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1={0} y1={0} x2={0} y2={1}>
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${gradientId})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={2.4} fill={color} />
    </svg>
  );
}

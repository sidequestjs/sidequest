import { Chart, type ChartConfiguration } from "chart.js/auto";
import { useEffect, useRef } from "react";
import { Select } from "../../ui/Select";

/** A single time bucket for the {@link ThroughputChart}. */
export interface ThroughputPoint {
  timestamp: string | Date;
  completed: number;
  failed: number;
}

/** Props for the {@link ThroughputChart}. */
export interface ThroughputChartProps {
  data: ThroughputPoint[];
  range: string;
  onRangeChange: (range: string) => void;
}

const RANGES = [
  { value: "12m", label: "Last 12 min" },
  { value: "12h", label: "Last 12 hrs" },
  { value: "12d", label: "Last 12 days" },
];

function hhmm(timestamp: string | Date): string {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/**
 * ThroughputChart — completed vs failed jobs over time, drawn with Chart.js, plus a
 * range selector. Guards against environments without a 2D canvas context or
 * ResizeObserver (jsdom) so it renders inertly under test.
 */
export function ThroughputChart({ data, range, onRangeChange }: ThroughputChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || typeof ResizeObserver === "undefined") {
      return;
    }
    const config: ChartConfiguration = {
      type: "line",
      data: {
        labels: data.map((point) => hhmm(point.timestamp)),
        datasets: [
          {
            label: "Completed",
            data: data.map((point) => point.completed),
            borderColor: "#4faf75",
            backgroundColor: "rgba(79,175,117,0.10)",
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            borderWidth: 2,
          },
          {
            label: "Failed",
            data: data.map((point) => point.failed),
            borderColor: "#b75252",
            backgroundColor: "rgba(183,82,82,0.10)",
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        scales: {
          x: { ticks: { color: "#6b7688", font: { size: 10 }, maxRotation: 0 }, grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: { color: "#6b7688", font: { size: 10 }, maxTicksLimit: 5 },
            grid: { color: "rgba(255,255,255,0.045)" },
            border: { display: false },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#0b0f1a",
            borderColor: "#2a3b5f",
            borderWidth: 1,
            titleColor: "#cdd5e0",
            bodyColor: "#9aa6ba",
            padding: 10,
            cornerRadius: 8,
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
          },
        },
      },
    };
    const chart = new Chart(ctx, config);
    const box = canvas.parentElement;
    const observer = new ResizeObserver(() => chart.resize());
    if (box) {
      observer.observe(box);
    }
    return () => {
      observer.disconnect();
      chart.destroy();
    };
  }, [data]);

  return (
    <div className="bg-surface-raised border border-edge rounded-xl px-5 py-[18px]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-semibold text-fg-strong">Job throughput</div>
          <div className="text-xs text-fg-muted">Completed vs failed over time</div>
        </div>
        <div className="w-36">
          <Select value={range} onChange={(e) => onRangeChange(e.target.value)} size="sm" options={RANGES} />
        </div>
      </div>
      <div className="relative w-full h-[260px]">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

import type { StatTone } from "../../../ui/StatCard";
import { StatCard } from "../../../ui/StatCard";
import { useOverview, useOverviewTimeseries } from "../../hooks/use-overview";

const CARDS: { key: string; label: string; tone: StatTone }[] = [
  { key: "waiting", label: "Waiting", tone: "scheduled" },
  { key: "running", label: "Running", tone: "running" },
  { key: "completed", label: "Completed", tone: "completed" },
  { key: "failed", label: "Failed", tone: "failed" },
  { key: "canceled", label: "Canceled", tone: "neutral" },
  { key: "total", label: "Total", tone: "neutral" },
];

/** The overview home: live counts and a small throughput chart. */
export function OverviewPage() {
  const { data, isLoading } = useOverview("12m", { refetchInterval: 2000 });

  return (
    <div>
      <h1 style={{ fontSize: "var(--text-xl)", marginBottom: "1.25rem" }}>Overview</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "1rem" }}>
        {CARDS.map((card) => (
          <StatCard
            key={card.key}
            label={card.label}
            tone={card.tone}
            value={data ? data[card.key as keyof typeof data] : isLoading ? "…" : 0}
          />
        ))}
      </div>
      <Timeseries />
    </div>
  );
}

/** A minimal SVG bar chart of total jobs per time bucket. No charting dependency. */
function Timeseries() {
  const { data } = useOverviewTimeseries("12m", { refetchInterval: 5000 });
  const points = data ?? [];
  if (points.length === 0) return null;

  const max = Math.max(1, ...points.map((p) => p.total));
  const width = 100 / points.length;

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <h2 style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Throughput</h2>
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" style={{ width: "100%", height: 120 }}>
        {points.map((point, i) => (
          <rect
            key={i}
            x={i * width + width * 0.15}
            y={30 - (point.total / max) * 30}
            width={width * 0.7}
            height={(point.total / max) * 30}
            fill="var(--brand-primary)"
          />
        ))}
      </svg>
    </div>
  );
}

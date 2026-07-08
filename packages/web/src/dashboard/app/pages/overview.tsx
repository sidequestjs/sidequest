import { useState } from "react";
import { StatTrendCard, type StatTrendTone } from "../../components/StatTrendCard";
import { SuccessRateCard } from "../../components/SuccessRateCard";
import { ThroughputChart } from "../../components/ThroughputChart";
import { useOverview, useOverviewTimeseries } from "../../hooks/use-overview";

type CountKey = "running" | "completed" | "failed" | "waiting";

const RANGE_LABEL: Record<string, string> = { "12m": "last 12m", "12h": "last 12h", "12d": "last 12d" };

const CARDS: { key: CountKey; label: string; tone: StatTrendTone }[] = [
  { key: "running", label: "Running", tone: "running" },
  { key: "completed", label: "Completed", tone: "completed" },
  { key: "failed", label: "Failed", tone: "failed" },
  { key: "waiting", label: "Scheduled", tone: "scheduled" },
];

/** Percentage trend from the first to the last point of a series. */
function trend(series: number[]): number {
  if (series.length < 2) {
    return 0;
  }
  const first = series[0];
  const last = series[series.length - 1];
  return Math.round(((last - first) / Math.max(1, first)) * 100);
}

/** The overview home: sparkline stat cards, a throughput chart, and success/worker panels. */
export function OverviewPage() {
  const [range, setRange] = useState("12m");
  const { data: stats } = useOverview(range, { refetchInterval: 2000 });
  const { data: series } = useOverviewTimeseries(range, { refetchInterval: 5000 });
  const points = series ?? [];

  const seriesFor = (key: CountKey): number[] => {
    const values = points.map((point) => Number(point[key] ?? 0));
    return values.length > 0 ? values : [Number(stats?.[key] ?? 0)];
  };

  const completed = stats?.completed ?? 0;
  const failed = stats?.failed ?? 0;
  const throughput = completed + failed;
  const rate = throughput > 0 ? Math.round((completed / throughput) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-4 gap-3.5">
        {CARDS.map((card) => {
          const cardSeries = seriesFor(card.key);
          return (
            <StatTrendCard
              key={card.key}
              label={card.label}
              tone={card.tone}
              value={stats ? Number(stats[card.key]) : 0}
              series={cardSeries}
              delta={trend(cardSeries)}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-[1fr_260px] gap-3.5 items-stretch">
        <ThroughputChart
          data={points.map((point) => ({ timestamp: point.timestamp, completed: point.completed, failed: point.failed }))}
          range={range}
          onRangeChange={setRange}
        />
        <div className="flex flex-col gap-3.5">
          <SuccessRateCard rate={rate} throughput={throughput} rangeLabel={RANGE_LABEL[range] ?? range} />
        </div>
      </div>
    </div>
  );
}

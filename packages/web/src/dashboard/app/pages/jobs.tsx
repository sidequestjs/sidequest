import { useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { JobDetailView } from "../../components/JobDetailView";
import { JobsTable } from "../../components/JobsTable";
import { JobsToolbar } from "../../components/JobsToolbar";
import { SegmentedFilter, type Segment } from "../../components/SegmentedFilter";
import { useJob, useJobActions, useJobs } from "../../hooks/use-jobs";
import { useOverview } from "../../hooks/use-overview";

const PAGE_SIZE = 11;

/** The jobs list route (`/jobs`): opens a job by navigating to its detail route. */
export function JobsPage() {
  const navigate = useNavigate();
  return <JobsListView onOpenJob={(id) => void navigate({ to: `/jobs/${id}` })} />;
}

/** The job detail route (`/jobs/$id`): reads the id from the route and wires rerun/cancel. */
export function JobDetailPage() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  return <JobDetailContainer id={Number(id)} onBack={() => void navigate({ to: "/jobs" })} />;
}

/** Loads a job by id and renders its detail, wiring the rerun/cancel actions. */
function JobDetailContainer({ id, onBack }: { id: number; onBack: () => void }) {
  const { data: job, refetch } = useJob(id, { refetchInterval: 3000 });
  const actions = useJobActions();
  if (!job) {
    return <div className="font-mono text-sm text-fg-muted py-10">Loading job #{id}…</div>;
  }
  const act = (promise: Promise<unknown>) => void promise.then(refetch);
  return (
    <JobDetailView
      job={job}
      onBack={onBack}
      onRerun={(jobId) => act(actions.rerun(jobId))}
      onCancel={(jobId) => act(actions.cancel(jobId))}
    />
  );
}

const SEGMENTS: { key: string; label: string; countKey: "total" | "running" | "completed" | "failed" | "waiting" | "canceled" }[] =
  [
    { key: "all", label: "All", countKey: "total" },
    { key: "running", label: "Running", countKey: "running" },
    { key: "completed", label: "Completed", countKey: "completed" },
    { key: "failed", label: "Failed", countKey: "failed" },
    { key: "waiting", label: "Waiting", countKey: "waiting" },
    { key: "canceled", label: "Canceled", countKey: "canceled" },
  ];

/** The jobs list: search, segmented status filters, and the paginated table. */
export function JobsListView({ onOpenJob }: { onOpenJob: (id: number) => void }) {
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const { data, refetch } = useJobs(
    { state: status === "all" ? undefined : status, class: query || undefined, page, pageSize: PAGE_SIZE },
    { refetchInterval: 3000 },
  );
  const { data: counts } = useOverview(undefined, { refetchInterval: 5000 });
  const actions = useJobActions();

  const changeStatus = (key: string) => {
    setStatus(key);
    setPage(1);
  };
  const changeQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };
  const act = (promise: Promise<unknown>) => void promise.then(refetch);

  const segments: Segment[] = SEGMENTS.map((segment) => ({
    key: segment.key,
    label: segment.label,
    count: counts ? Number(counts[segment.countKey] ?? 0) : 0,
  }));

  const jobs = data?.jobs ?? [];
  const total = counts ? Number(counts[status === "all" ? "total" : (status as "running")] ?? jobs.length) : jobs.length;

  return (
    <div className="flex flex-col gap-4">
      <JobsToolbar query={query} onQuery={changeQuery} />
      <SegmentedFilter segments={segments} value={status} onChange={changeStatus} />
      <JobsTable
        jobs={jobs}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        hasNext={data?.pagination.hasNextPage ?? false}
        onPage={(delta) => setPage((current) => Math.max(1, current + delta))}
        onOpenJob={onOpenJob}
        onRerun={(id) => act(actions.rerun(id))}
        onCancel={(id) => act(actions.cancel(id))}
      />
    </div>
  );
}

import type { JobData } from "@sidequest/core";
import { useState } from "react";
import { Badge, type JobState } from "../../../ui/Badge";
import { Button } from "../../../ui/Button";
import { Input } from "../../../ui/Input";
import { Pagination } from "../../../ui/Pagination";
import { Select } from "../../../ui/Select";
import { type Column, Table } from "../../../ui/Table";
import { type JobsFilter, useJobActions, useJobs, useJobsMeta } from "../../hooks/use-jobs";

const STATES = ["waiting", "running", "completed", "failed", "canceled"];

/** The jobs screen: filters, a paginated table, and per-row actions. */
export function JobsPage() {
  const [filters, setFilters] = useState<JobsFilter>({ page: 1, pageSize: 20 });
  const { data, refetch } = useJobs(filters, { refetchInterval: 3000 });
  const { data: meta } = useJobsMeta();
  const actions = useJobActions();

  const patch = (next: Partial<JobsFilter>) => setFilters((f) => ({ ...f, page: 1, ...next }));
  const act = (fn: Promise<unknown>) => void fn.then(refetch);

  const columns: Column<JobData>[] = [
    { key: "id", label: "ID", mono: true, width: "60px" },
    { key: "class", label: "Class" },
    { key: "queue", label: "Queue" },
    { key: "state", label: "State", render: (job) => <Badge state={job.state as JobState} /> },
    { key: "attempt", label: "Attempt", render: (job) => `${job.attempt}/${job.max_attempts}` },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (job) => (
        <div style={{ display: "flex", gap: "0.35rem", justifyContent: "flex-end" }}>
          <Button size="sm" variant="ghost" onClick={() => act(actions.run(job.id))}>
            Run
          </Button>
          <Button size="sm" variant="ghost" onClick={() => act(actions.rerun(job.id))}>
            Rerun
          </Button>
          <Button size="sm" variant="danger" onClick={() => act(actions.cancel(job.id))}>
            Cancel
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <h1 style={{ fontSize: "var(--text-xl)", marginBottom: "1.25rem" }}>Jobs</h1>

      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <Select
          size="sm"
          value={filters.state ?? ""}
          onChange={(e) => patch({ state: e.target.value || undefined })}
          options={[{ value: "", label: "All states" }, ...STATES.map((s) => ({ value: s, label: s }))]}
        />
        <Select
          size="sm"
          value={filters.queue ?? ""}
          onChange={(e) => patch({ queue: e.target.value || undefined })}
          options={[{ value: "", label: "All queues" }, ...(meta?.queues ?? []).map((q) => ({ value: q, label: q }))]}
        />
        <Input
          size="sm"
          placeholder="Filter by class…"
          value={filters.class ?? ""}
          onChange={(e) => patch({ class: e.target.value || undefined })}
        />
      </div>

      <Table columns={columns} rows={data?.jobs ?? []} rowKey="id" empty="No jobs match these filters." />

      <div style={{ marginTop: "1rem" }}>
        <Pagination
          page={filters.page ?? 1}
          hasNext={data?.pagination.hasNextPage ?? false}
          onPrev={() => setFilters((f) => ({ ...f, page: Math.max(1, (f.page ?? 1) - 1) }))}
          onNext={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
        />
      </div>
    </div>
  );
}

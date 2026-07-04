import type { QueueWithCounts } from "../../../api/services/queue-service";
import { Badge, type QueueState } from "../../../ui/Badge";
import { Button } from "../../../ui/Button";
import { type Column, Table } from "../../../ui/Table";
import { useQueueActions, useQueues } from "../../hooks/use-queues";

/** The queues screen: each queue with its counts and a pause/resume toggle. */
export function QueuesPage() {
  const { data, refetch } = useQueues({ refetchInterval: 3000 });
  const actions = useQueueActions();

  const columns: Column<QueueWithCounts>[] = [
    { key: "name", label: "Queue" },
    { key: "state", label: "State", render: (queue) => <Badge state={queue.state as QueueState} /> },
    { key: "concurrency", label: "Concurrency", align: "right" },
    { key: "priority", label: "Priority", align: "right" },
    { key: "jobs", label: "Jobs", align: "right", render: (queue) => queue.jobs?.total ?? 0 },
    {
      key: "toggle",
      label: "",
      align: "right",
      render: (queue) => (
        <Button size="sm" variant="outline" onClick={() => void actions.toggle(queue.name).then(refetch)}>
          {queue.state === "active" ? "Pause" : "Resume"}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <h1 style={{ fontSize: "var(--text-xl)", marginBottom: "1.25rem" }}>Queues</h1>
      <Table columns={columns} rows={data ?? []} rowKey="name" empty="No queues yet." />
    </div>
  );
}

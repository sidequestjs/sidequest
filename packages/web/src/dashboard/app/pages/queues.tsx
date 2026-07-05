import { QueueCard } from "../../components/QueueCard";
import { useQueueActions, useQueues } from "../../hooks/use-queues";

/** The queues screen: a card per queue with its load bar and a pause/activate toggle. */
export function QueuesPage() {
  const { data, refetch } = useQueues({ refetchInterval: 3000 });
  const actions = useQueueActions();
  const queues = data ?? [];

  return (
    <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
      {queues.map((queue) => (
        <QueueCard key={queue.name} queue={queue} onToggle={(name) => void actions.toggle(name).then(refetch)} />
      ))}
    </div>
  );
}

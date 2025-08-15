import { Backend } from "@sidequest/backend";
import { Request, Response, Router } from "express";

export async function renderQueuesTable(backend: Backend, req: Request, res: Response) {
  const queues = await backend.listQueues({ column: "name", order: "asc" });
  const jobsFromQueues = await backend.countJobsByQueues();
  const parsedQueues = queues?.map((queue) => ({
    ...queue,
    jobs: jobsFromQueues[queue.name] ?? {
      total: 0,
      waiting: 0,
      claimed: 0,
      running: 0,
      completed: 0,
      failed: 0,
      canceled: 0,
    },
  }));

  const isHtmx = req.get("hx-request");
  if (isHtmx) {
    res.render("partials/queues-table", { queues: parsedQueues, layout: false });
  } else {
    res.render("pages/queues", { title: "Queues", queues: parsedQueues });
  }
}

export function createQueuesRouter(backend: Backend) {
  const queuesRouter = Router();

  queuesRouter.get("/", async (req, res) => {
    await renderQueuesTable(backend, req, res);
  });

  queuesRouter.patch("/:name/toggle", async (req, res) => {
    const queue = await backend.getQueue(req.params.name);
    if (queue) {
      await backend.updateQueue({ ...queue, state: queue.state === "active" ? "paused" : "active" });
      res.header("HX-Trigger", "toggleQueue").status(200).end();
    } else {
      res.status(404).end();
    }
  });

  return ["/queues", queuesRouter] as const;
}

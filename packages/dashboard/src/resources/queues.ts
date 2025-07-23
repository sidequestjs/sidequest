import { Backend } from "@sidequest/backend";
import { Request, Response, Router } from "express";
import { getBackend } from "../backend-driver";

export async function renderQueuesTable(backend: Backend, req: Request, res: Response) {
  const queues = await backend.listQueues({ column: "name", order: "asc" });
  const jobsFromQueues = await backend?.listJobs({ queue: queues?.map((queue) => queue.name) });
  const parsedQueues = queues?.map((queue) => ({
    ...queue,
    jobs: jobsFromQueues?.filter((job) => job.queue === queue.name),
  }));

  const isHtmx = req.get("hx-request");
  if (isHtmx) {
    res.render("partials/queues-table", { queues: parsedQueues, layout: false });
  } else {
    res.render("pages/queues", { title: "Queues", queues: parsedQueues });
  }
}

const queuesRouter = Router();

queuesRouter.get("/", async (req, res) => {
  const backend = getBackend();
  await renderQueuesTable(backend, req, res);
});

queuesRouter.patch("/:name/toggle", async (req, res) => {
  const backend = getBackend();
  const queue = await backend.getQueueConfig(req.params.name);
  await backend.updateQueue({ ...queue, state: queue.state === "active" ? "paused" : "active" });
  await renderQueuesTable(backend, req, res);
});

export default queuesRouter;

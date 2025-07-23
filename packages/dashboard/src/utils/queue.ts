import { SQLBackend } from "@sidequest/backend";
import { Request, Response } from "express";

export async function renderQueuesTable(backend: SQLBackend, req: Request, res: Response) {
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

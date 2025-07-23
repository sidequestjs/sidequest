import { NewJobData } from "@sidequest/backend";
import { describe, it } from "vitest";
import { backend } from ".";

export default function defineGetJobTestSuite() {
  describe("getJob", () => {
    it("should get no job", async () => {
      const job = await backend.getJob(-1);
      expect(job).toBeFalsy();
    });

    it("should get a job", async () => {
      // Insert a waiting job
      const job: NewJobData = {
        queue: "default",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        script: "test.js",
        attempt: 0,
      };

      const insertedJob = await backend.createNewJob(job);

      const foundJob = await backend.getJob(insertedJob.id);
      expect(foundJob).toBeTruthy();
    });
  });
}

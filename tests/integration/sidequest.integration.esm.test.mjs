import { Sidequest } from "sidequest";
import { FailingJob, RetryJob, SuccessJob, TimeoutJob } from "./jobs/test-jobs.js";
import { createIntegrationTestSuite } from "./shared-test-suite.js";

// Run the shared test suite with ESM jobs
createIntegrationTestSuite(
  Sidequest,
  {
    SuccessJob,
    RetryJob,
    FailingJob,
    TimeoutJob,
  },
  "ESM",
);

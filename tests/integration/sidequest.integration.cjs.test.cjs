/* eslint-disable @typescript-eslint/no-require-imports */
const { Sidequest } = require("sidequest");
const { FailingJob, RetryJob, SuccessJob, TimeoutJob, EnqueueFromWithinJob } = require("./jobs/test-jobs.cjs");
const { createIntegrationTestSuite } = require("./shared-test-suite.js");

// Run the shared test suite with ESM jobs
createIntegrationTestSuite(
  Sidequest,
  {
    SuccessJob,
    RetryJob,
    FailingJob,
    TimeoutJob,
    EnqueueFromWithinJob,
  },
  "CJS",
);

import { SQLBackend } from "@sidequest/backend";
import defineClaimPendingJobTestSuite from "./claimPendingJob";
import defineCreateNewJobTestSuite from "./createNewJob";
import defineDeleteFinishedJobsTestSuite from "./deleteFinishedJobs";
import defineGetJobTestSuite from "./getJob";
import defineGetQueuesFromJobsTestSuite from "./getQueuesFromJobs";
import defineInsertQueueConfigTestSuite from "./insertQueueConfig";
import defineListJobsTestSuite from "./listJobs";
import defineListQueuesTestSuite from "./listQueues";
import defineStaleJobsTestSuite from "./staleJobs";
import defineTruncateTestSuite from "./truncate";
import defineUpdateJobTestSuite from "./updateJob";

export let backend: SQLBackend;

export function testBackend<P>(config: P, backendFactory: (config: P) => SQLBackend) {
  beforeEach(async () => {
    backend = backendFactory(config);
    await backend.setup();
  });

  afterEach(async () => {
    await backend.truncate();
    await backend.close();
  });

  defineTruncateTestSuite();
  defineClaimPendingJobTestSuite();
  defineCreateNewJobTestSuite();
  defineDeleteFinishedJobsTestSuite();
  defineGetJobTestSuite();
  defineGetQueuesFromJobsTestSuite();
  defineInsertQueueConfigTestSuite();
  defineListQueuesTestSuite();
  defineListJobsTestSuite();
  defineStaleJobsTestSuite();
  defineUpdateJobTestSuite();
}

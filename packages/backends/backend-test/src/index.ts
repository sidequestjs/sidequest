import { Backend } from "@sidequest/backend";
import { backend, setTestBackend } from "./backend";
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

/**
 * Sets up and runs a comprehensive test suite for a backend implementation.
 *
 * This function initializes the backend using the provided configuration and factory,
 * and automatically registers a series of standardized test suites to validate
 * backend behavior. It also manages backend setup and teardown for each test.
 *
 * **🚨 ATTENTION 🚨**: This function is intended for use in a testing environment only and with
 * testing data. It will truncate the database after every test to ensure a clean state.
 * It should not be used in production or with real data.
 *
 * @param backendFactory - A factory function that creates a backend instance.
 */
export function testBackend(backendFactory: () => Backend) {
  beforeEach(async () => {
    setTestBackend(backendFactory());
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

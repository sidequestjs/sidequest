---
outline: deep
title: Job.run Method
description: Job.run method guide for Sidequest.js
---

# Job.run Method

Anything returned from the `run` method will be stored in the job's result field and the job will be marked as completed. If an error is thrown, the job will be marked as failed (if no more retry attempts are remaining) and the error will be stored in the job's error field. Jobs can also be retried if they fail, and you can configure the number of attempts when enqueuing the job.

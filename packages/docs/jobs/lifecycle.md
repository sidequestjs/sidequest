---
outline: deep
title: Job Lifecycle
description: Jobs Lifecycle guide for Sidequest.js
---

# Job Lifecycle

Jobs in Sidequest go through the following states:

- `waiting` - Job is queued and waiting to be processed
- `claimed` - Job has been claimed by a worker
- `running` - Job is currently being processed
- `completed` - Job finished successfully
- `failed` - Job failed and won't be retried
- `canceled` - Job was manually canceled

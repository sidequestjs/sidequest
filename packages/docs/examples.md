---
outline: deep
title: Examples
description: Examples for Sidequest.js
---

# Examples

## Express.js Integration

```typescript
import express from "express";
import { Sidequest } from "sidequest";
import { EmailJob } from "./jobs/EmailJob.js";

const app = express();

app.post("/send-email", async (req, res) => {
  const { to, subject, body } = req.body;

  const job = await Sidequest.build(EmailJob).queue("emails").enqueue(to, subject, body);

  res.json({ jobId: job.id, message: "Email queued successfully" });
});

await Sidequest.start();

app.listen(3000);
```

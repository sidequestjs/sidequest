/* eslint-disable no-console */

import { Sidequest } from "sidequest";

import express from "express";
import { SendEmailJob } from "./send-email-job.js";

const app = express();

app.get("/send-email", (req, res) => {
  const email = req.query.email ?? "email@example.com";
  void Sidequest.build(SendEmailJob).enqueue(email as string);
  res.send(204);
});

await Sidequest.start();

app.listen(3000, () => {
  console.log("call http://localhost:3000/send-email?email=test@example.com");
});

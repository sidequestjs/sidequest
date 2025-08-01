import { Sidequest } from "sidequest";
import { SnoozeJob } from "./snooze-job.js";

await Sidequest.start();

await Sidequest.build(SnoozeJob).enqueue();

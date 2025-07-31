import { Sidequest } from "sidequest";
import { SampleJob } from "./sample-job.js";

await Sidequest.start();

// every 10 minutes
await Sidequest.build(SampleJob).schedule("*/10 * * * * *");

import { Sidequest } from "sidequest";
import { HelloJob } from "./hello-job.js";

await Sidequest.start();

await Sidequest.build(HelloJob).enqueue("John Doe");

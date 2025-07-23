import { Sidequest } from "sidequest";
import { MyJob } from "./main_job.js";

await Sidequest.start();
await Sidequest.build(MyJob).availableAt(new Date(9999999999999)).enqueue();

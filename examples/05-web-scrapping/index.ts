import { Sidequest } from "sidequest";
import { CountWordJob } from "./count-word-job.js";

await Sidequest.start();

await Sidequest.build(CountWordJob).enqueue("https://en.wikipedia.org/wiki/Node.js", "package");

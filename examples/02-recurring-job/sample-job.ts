/* eslint-disable no-console */

import { Job } from "sidequest";

export class SampleJob extends Job {
  run() {
    const msg = "sample job";
    console.log(msg);
    return msg;
  }
}

/* eslint-disable no-console */

import { Job } from "sidequest";

export class HelloJob extends Job {
  run(name: string) {
    const msg = `hello ${name}`;
    console.log(msg);
    return msg;
  }
}

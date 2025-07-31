/* eslint-disable no-console */

import { Job } from "sidequest";

export class SendEmailJob extends Job {
  run(email: string) {
    const msg = `sending email to ${email}`;
    console.log(msg);
    return msg;
  }
}

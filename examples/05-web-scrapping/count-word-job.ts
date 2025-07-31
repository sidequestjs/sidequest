/* eslint-disable no-console */

import { load } from "cheerio";
import { Job } from "sidequest";

export class CountWordJob extends Job {
  async run(url: string, word: string) {
    const response = await fetch(url);
    const html = await response.text();

    const $ = load(html);
    const text = $("body").text();

    const regex = new RegExp(`\\b${word}\\b`, "gi");
    const matches = text.match(regex);
    const count = matches ? matches.length : 0;

    console.log(`The word "${word}" appears ${count} times on the page ${url}`);
    
    // Return the result as an object
    // Will be available in the result of the job
    return {
      word,
      count,
      url,
    };
  }
}

import { Engine, SidequestConfig } from "@sidequest/engine";
import { runWeb } from "@sidequest/dashboard";

export * from "@sidequest/engine";

export class Sidequest {
  static start(config: SidequestConfig){
    const engine = Engine.start(config);

    runWeb();

    return engine;
  }
}
import { AliveJobUniqueness } from "./alive-job-uniqueness";
import { FixedWindowUniqueness } from "./fixed-window-uniqueness";
import { Uniqueness, UniquenessConfig } from "./uniqueness";

const availableUniqueness = {
  "alive-job": AliveJobUniqueness,
  "fixed-window": FixedWindowUniqueness,
} as const;

type UniquenessConstructor = new (config: UniquenessConfig) => Uniqueness;

export class UniquenessFactory {
  static create(config: UniquenessConfig): Uniqueness {
    const Ctor = availableUniqueness[config.type] as UniquenessConstructor | undefined;
    if (!Ctor) {
      throw new Error(`Unknown uniqueness strategy: ${config.type}`);
    }
    return new Ctor(config);
  }
}

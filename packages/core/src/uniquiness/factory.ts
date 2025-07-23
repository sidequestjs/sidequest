import { AliveJobUniqueness } from "./alive-job-uniqueness";
import { FixedWindowUniqueness } from "./fixed-window-uniqueness";
import { Uniqueness, UniquenessConfig } from "./uniqueness";

const availableUniqueness = {
  "alive-job": AliveJobUniqueness,
  "fixed-window": FixedWindowUniqueness,
} as const;

type UniquenessConstructor = new (config: UniquenessConfig) => Uniqueness;

/**
 * Factory for creating uniqueness strategy instances.
 */
export class UniquenessFactory {
  /**
   * Creates a uniqueness strategy instance from the given config.
   * @param config The uniqueness configuration.
   * @returns The uniqueness strategy instance.
   */
  static create(config: UniquenessConfig): Uniqueness {
    const Ctor = availableUniqueness[config.type] as UniquenessConstructor | undefined;
    if (!Ctor) {
      throw new Error(`Unknown uniqueness strategy: ${config.type}`);
    }
    return new Ctor(config);
  }
}

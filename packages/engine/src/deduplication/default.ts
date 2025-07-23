import { JobClassType } from "../job/job";
import { DeduplicationStrategy } from "./strategy";

import crypto from "crypto";
import stableStringify from "json-stable-stringify";

export class DefaultDeduplicationStrategy implements DeduplicationStrategy {
  constructor(public withArgs = false) {}

  getDigest<T extends JobClassType>(
    JobClass: T,
    constructorArgs: ConstructorParameters<T>,
    args: Parameters<T["prototype"]["run"]>,
  ): string {
    let key = JobClass.name;
    if (this.withArgs) {
      // stableStringify parses in a deterministic way
      key += "::args=" + stableStringify(args ?? []);
      key += "::ctor=" + stableStringify(constructorArgs ?? []);
    }
    return crypto.createHash("sha256").update(key).digest("hex");
  }
}

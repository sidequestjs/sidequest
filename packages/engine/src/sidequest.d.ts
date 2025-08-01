/// <reference types="./engine" />
declare module "sidequest" {
  export const Sidequest: {
    configure: (config: EngineConfig) => Promise<void>;
  };
}

import { Backend } from "@sidequest/backend";
import { NonNullableEngineConfig } from "../dist";

/**
 * Enumeration of available dependency tokens for the dependency registry.
 * Used as keys to register and retrieve dependencies throughout the engine.
 */
export enum Dependency {
  /** Engine configuration */
  Config = "config",
  /** Backend instance */
  Backend = "backend",
}

/**
 * Type mapping interface that associates each dependency token with its corresponding type.
 * This ensures type safety when registering and retrieving dependencies.
 */
interface DependencyRegistryTypes {
  [Dependency.Config]: NonNullableEngineConfig;
  [Dependency.Backend]: Backend;
}

/**
 * Union type of all valid dependency registry keys.
 */
type DependencyRegistryKey = keyof DependencyRegistryTypes;

/**
 * A type-safe dependency injection container for managing core engine dependencies.
 * Provides methods to register, retrieve, and clear dependencies used throughout the engine lifecycle.
 */
class DependencyRegistry {
  /**
   * Internal storage for registered dependencies.
   */
  private registry = new Map<DependencyRegistryKey, unknown>();

  /**
   * Retrieves a registered dependency by its token.
   * @param token - The dependency token to look up
   * @returns The registered dependency instance, or undefined if not found
   */
  get<T extends DependencyRegistryKey>(token: T): DependencyRegistryTypes[T] | undefined {
    return this.registry.get(token) as DependencyRegistryTypes[T] | undefined;
  }

  /**
   * Registers a dependency instance with the specified token.
   * @param token - The dependency token to register under
   * @param instance - The dependency instance to register
   * @returns The registered instance
   */
  register<T extends DependencyRegistryKey>(token: T, instance: DependencyRegistryTypes[T]) {
    this.registry.set(token, instance);
    return instance;
  }

  /**
   * Clears all registered dependencies from the registry.
   * Useful for cleanup and testing scenarios.
   */
  clear() {
    this.registry.clear();
  }
}

/**
 * Singleton instance of the dependency registry.
 * This is the main container used throughout the engine to manage dependencies.
 */
export const dependencyRegistry = new DependencyRegistry();

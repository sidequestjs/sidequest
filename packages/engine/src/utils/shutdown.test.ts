import { describe, expect, it, vi } from "vitest";
import { clearGracefulShutdown, gracefulShutdown } from "./shutdown";

describe("graceful shutdown handlers", () => {
  it("clears only signal handlers registered by Sidequest", () => {
    const hostSigintHandler = vi.fn();
    const hostSigtermHandler = vi.fn();
    process.on("SIGINT", hostSigintHandler);
    process.on("SIGTERM", hostSigtermHandler);

    try {
      const sigintListenersBefore = process.listeners("SIGINT");
      const sigtermListenersBefore = process.listeners("SIGTERM");

      gracefulShutdown(vi.fn(), "Test", true);

      expect(process.listenerCount("SIGINT")).toBe(sigintListenersBefore.length + 1);
      expect(process.listenerCount("SIGTERM")).toBe(sigtermListenersBefore.length + 1);

      clearGracefulShutdown();

      expect(process.listeners("SIGINT")).toEqual(sigintListenersBefore);
      expect(process.listeners("SIGTERM")).toEqual(sigtermListenersBefore);
    } finally {
      clearGracefulShutdown();
      process.off("SIGINT", hostSigintHandler);
      process.off("SIGTERM", hostSigtermHandler);
    }
  });

  it("does not remove host handlers when Sidequest signal handling is disabled", () => {
    const hostSigintHandler = vi.fn();
    const hostSigtermHandler = vi.fn();
    process.on("SIGINT", hostSigintHandler);
    process.on("SIGTERM", hostSigtermHandler);

    try {
      const sigintListenersBefore = process.listeners("SIGINT");
      const sigtermListenersBefore = process.listeners("SIGTERM");

      gracefulShutdown(vi.fn(), "Test", false);
      clearGracefulShutdown();

      expect(process.listeners("SIGINT")).toEqual(sigintListenersBefore);
      expect(process.listeners("SIGTERM")).toEqual(sigtermListenersBefore);
    } finally {
      clearGracefulShutdown();
      process.off("SIGINT", hostSigintHandler);
      process.off("SIGTERM", hostSigtermHandler);
    }
  });
});

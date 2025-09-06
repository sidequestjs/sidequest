import { ScheduledTask } from "node-cron";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScheduledJobRegistry } from "./cron-registry";

describe("ScheduledJobRegistry", () => {
  let mockTask: ScheduledTask;
  let stopSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Create a mock ScheduledTask
    stopSpy = vi.fn().mockResolvedValue(undefined);
    mockTask = {
      id: "test-task-1",
      stop: stopSpy,
      getStatus: vi.fn().mockReturnValue("scheduled"),
    } as unknown as ScheduledTask;
  });

  afterEach(async () => {
    // Clean up after each test
    await ScheduledJobRegistry.stopAll();
    vi.clearAllMocks();
  });

  describe("register", () => {
    it("should register a scheduled task and return the task ID", () => {
      const taskId = ScheduledJobRegistry.register(mockTask);

      expect(taskId).toBe("test-task-1");
      expect(ScheduledJobRegistry.hasTask("test-task-1")).toBe(true);
      expect(ScheduledJobRegistry.hasTask("test-task-2")).toBe(false);
      expect(ScheduledJobRegistry.getTaskCount()).toBe(1);
    });

    it("should handle multiple task registrations", () => {
      const mockTask2 = {
        id: "test-task-2",
        stop: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue("scheduled"),
      } as unknown as ScheduledTask;

      const taskId1 = ScheduledJobRegistry.register(mockTask);
      const taskId2 = ScheduledJobRegistry.register(mockTask2);

      expect(taskId1).toBe("test-task-1");
      expect(taskId2).toBe("test-task-2");
      expect(ScheduledJobRegistry.getTaskCount()).toBe(2);
      expect(ScheduledJobRegistry.hasTask("test-task-1")).toBe(true);
      expect(ScheduledJobRegistry.hasTask("test-task-2")).toBe(true);
    });

    it("should overwrite task with same ID", () => {
      const mockTask2 = {
        id: "test-task-1", // Same ID as first task
        stop: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue("scheduled"),
      } as unknown as ScheduledTask;

      ScheduledJobRegistry.register(mockTask);
      expect(ScheduledJobRegistry.getTaskCount()).toBe(1);

      ScheduledJobRegistry.register(mockTask2);
      expect(ScheduledJobRegistry.getTaskCount()).toBe(1); // Still 1, task was overwritten
    });
  });

  describe("stop", () => {
    it("should stop and unregister a specific task", async () => {
      ScheduledJobRegistry.register(mockTask);
      expect(ScheduledJobRegistry.hasTask("test-task-1")).toBe(true);

      const result = await ScheduledJobRegistry.stop("test-task-1");

      expect(result).toBe(true);
      expect(stopSpy).toHaveBeenCalledOnce();
      expect(ScheduledJobRegistry.hasTask("test-task-1")).toBe(false);
      expect(ScheduledJobRegistry.getTaskCount()).toBe(0);
    });

    it("should return false when trying to stop a non-existent task", async () => {
      const result = await ScheduledJobRegistry.stop("non-existent-task");
      expect(result).toBe(false);
    });

    it("should handle task stop errors gracefully", async () => {
      const errorStopSpy = vi.fn().mockRejectedValue(new Error("Stop failed"));
      const errorTask = {
        id: "error-task",
        stop: errorStopSpy,
        getStatus: vi.fn().mockReturnValue("scheduled"),
      } as unknown as ScheduledTask;

      ScheduledJobRegistry.register(errorTask);
      expect(ScheduledJobRegistry.hasTask("error-task")).toBe(true);

      // The stop method should still throw the error
      await ScheduledJobRegistry.stop("error-task");

      // But the task should still be removed from registry even if stop fails
      expect(ScheduledJobRegistry.hasTask("error-task")).toBe(false);
      expect(ScheduledJobRegistry.getTaskCount()).toBe(0);
    });
  });

  describe("stopAll", () => {
    it("should stop all registered tasks and clear the registry", async () => {
      const stopSpy1 = vi.fn().mockResolvedValue(undefined);
      const stopSpy2 = vi.fn().mockResolvedValue(undefined);

      const mockTask1 = {
        id: "task-1",
        stop: stopSpy1,
        getStatus: vi.fn().mockReturnValue("scheduled"),
      } as unknown as ScheduledTask;

      const mockTask2 = {
        id: "task-2",
        stop: stopSpy2,
        getStatus: vi.fn().mockReturnValue("scheduled"),
      } as unknown as ScheduledTask;

      ScheduledJobRegistry.register(mockTask1);
      ScheduledJobRegistry.register(mockTask2);
      expect(ScheduledJobRegistry.getTaskCount()).toBe(2);

      await ScheduledJobRegistry.stopAll();

      expect(stopSpy1).toHaveBeenCalledOnce();
      expect(stopSpy2).toHaveBeenCalledOnce();
      expect(ScheduledJobRegistry.getTaskCount()).toBe(0);
    });

    it("should handle empty registry gracefully", async () => {
      expect(ScheduledJobRegistry.getTaskCount()).toBe(0);
      await expect(ScheduledJobRegistry.stopAll()).resolves.not.toThrow();
      expect(ScheduledJobRegistry.getTaskCount()).toBe(0);
    });

    it("should continue stopping other tasks even if one fails", async () => {
      const stopSpy1 = vi.fn().mockResolvedValue(undefined);
      const stopSpy2 = vi.fn().mockResolvedValue(undefined);
      const errorStopSpy = vi.fn().mockRejectedValue(new Error("Stop failed"));

      const mockTask1 = {
        id: "task-1",
        stop: stopSpy1,
        getStatus: vi.fn().mockReturnValue("scheduled"),
      } as unknown as ScheduledTask;

      const errorTask = {
        id: "error-task",
        stop: errorStopSpy,
        getStatus: vi.fn().mockReturnValue("scheduled"),
      } as unknown as ScheduledTask;

      const mockTask2 = {
        id: "task-2",
        stop: stopSpy2,
        getStatus: vi.fn().mockReturnValue("scheduled"),
      } as unknown as ScheduledTask;

      ScheduledJobRegistry.register(mockTask1);
      ScheduledJobRegistry.register(errorTask);
      ScheduledJobRegistry.register(mockTask2);
      expect(ScheduledJobRegistry.getTaskCount()).toBe(3);

      await ScheduledJobRegistry.stopAll();

      expect(stopSpy1).toHaveBeenCalledOnce();
      expect(errorStopSpy).toHaveBeenCalledOnce();
      expect(stopSpy2).toHaveBeenCalledOnce();

      // Registry should be cleared even with errors
      expect(ScheduledJobRegistry.getTaskCount()).toBe(0);
    });
  });

  describe("registry state management", () => {
    it("should properly manage registry state across multiple operations", async () => {
      // Start with empty registry
      expect(ScheduledJobRegistry.getTaskCount()).toBe(0);

      // Register multiple tasks
      ScheduledJobRegistry.register(mockTask);
      const mockTask2 = {
        id: "task-2",
        stop: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue("scheduled"),
      } as unknown as ScheduledTask;
      ScheduledJobRegistry.register(mockTask2);

      expect(ScheduledJobRegistry.getTaskCount()).toBe(2);
      expect(ScheduledJobRegistry.hasTask("test-task-1")).toBe(true);
      expect(ScheduledJobRegistry.hasTask("task-2")).toBe(true);

      // Stop one task
      await ScheduledJobRegistry.stop("test-task-1");
      expect(ScheduledJobRegistry.getTaskCount()).toBe(1);
      expect(ScheduledJobRegistry.hasTask("test-task-1")).toBe(false);
      expect(ScheduledJobRegistry.hasTask("task-2")).toBe(true);

      // Stop all remaining tasks
      await ScheduledJobRegistry.stopAll();
      expect(ScheduledJobRegistry.getTaskCount()).toBe(0);
      expect(ScheduledJobRegistry.hasTask("task-2")).toBe(false);
    });
  });
});

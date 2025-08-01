/* eslint-disable @typescript-eslint/unbound-method */
import { Backend, NewQueueData } from "@sidequest/backend";
import { QueueConfig } from "@sidequest/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueueOperations } from "./queue";

describe("QueueOperations", () => {
  let mockBackend: Backend;

  beforeEach(() => {
    // Mock the backend
    mockBackend = {
      getQueue: vi.fn(),
      updateQueue: vi.fn(),
      listQueues: vi.fn(),
      createNewQueue: vi.fn(),
    } as Partial<Backend> as Backend;

    QueueOperations.instance.setBackend(mockBackend);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("toggle", () => {
    it("should toggle active queue to paused", async () => {
      const queueConfig: QueueConfig = {
        id: 1,
        name: "test-queue",
        state: "active",
        concurrency: 10,
        priority: 0,
      };

      const updatedConfig: QueueConfig = { ...queueConfig, state: "paused" };

      vi.mocked(mockBackend.getQueue).mockResolvedValue(queueConfig);
      vi.mocked(mockBackend.updateQueue).mockResolvedValue(updatedConfig);

      const result = await QueueOperations.instance.toggle("test-queue");

      expect(mockBackend.getQueue).toHaveBeenCalledWith("test-queue");
      expect(mockBackend.updateQueue).toHaveBeenCalledWith({ ...queueConfig, state: "paused" });
      expect(result).toEqual(updatedConfig);
    });

    it("should toggle paused queue to active", async () => {
      const queueConfig: QueueConfig = {
        id: 1,
        name: "test-queue",
        state: "paused",
        concurrency: 10,
        priority: 0,
      };

      const updatedConfig: QueueConfig = { ...queueConfig, state: "active" };

      vi.mocked(mockBackend.getQueue).mockResolvedValue(queueConfig);
      vi.mocked(mockBackend.updateQueue).mockResolvedValue(updatedConfig);

      const result = await QueueOperations.instance.toggle("test-queue");

      expect(mockBackend.updateQueue).toHaveBeenCalledWith({ ...queueConfig, state: "active" });
      expect(result).toEqual(updatedConfig);
    });

    it("should throw error when queue not found", async () => {
      vi.mocked(mockBackend.getQueue).mockResolvedValue(undefined);

      await expect(QueueOperations.instance.toggle("nonexistent")).rejects.toThrow();
    });
  });

  describe("pause", () => {
    it("should pause an active queue", async () => {
      const queueConfig: QueueConfig = {
        id: 1,
        name: "test-queue",
        state: "active",
        concurrency: 10,
        priority: 0,
      };

      const updatedConfig: QueueConfig = { ...queueConfig, state: "paused" };

      vi.mocked(mockBackend.getQueue).mockResolvedValue(queueConfig);
      vi.mocked(mockBackend.updateQueue).mockResolvedValue(updatedConfig);

      const result = await QueueOperations.instance.pause("test-queue");

      expect(mockBackend.updateQueue).toHaveBeenCalledWith({ ...queueConfig, state: "paused" });
      expect(result).toEqual(updatedConfig);
    });

    it("should throw error when queue not found", async () => {
      vi.mocked(mockBackend.getQueue).mockResolvedValue(undefined);

      await expect(QueueOperations.instance.pause("nonexistent")).rejects.toThrow();
    });
  });

  describe("activate", () => {
    it("should activate a paused queue", async () => {
      const queueConfig: QueueConfig = {
        id: 1,
        name: "test-queue",
        state: "paused",
        concurrency: 10,
        priority: 0,
      };

      const updatedConfig: QueueConfig = { ...queueConfig, state: "active" };

      vi.mocked(mockBackend.getQueue).mockResolvedValue(queueConfig);
      vi.mocked(mockBackend.updateQueue).mockResolvedValue(updatedConfig);

      const result = await QueueOperations.instance.activate("test-queue");

      expect(mockBackend.updateQueue).toHaveBeenCalledWith({ ...queueConfig, state: "active" });
      expect(result).toEqual(updatedConfig);
    });

    it("should throw error when queue not found", async () => {
      vi.mocked(mockBackend.getQueue).mockResolvedValue(undefined);

      await expect(QueueOperations.instance.activate("nonexistent")).rejects.toThrow();
    });
  });

  describe("setConcurrency", () => {
    it("should update queue concurrency", async () => {
      const queueConfig: QueueConfig = {
        id: 1,
        name: "test-queue",
        state: "active",
        concurrency: 10,
        priority: 0,
      };

      const updatedConfig: QueueConfig = { ...queueConfig, concurrency: 20 };

      vi.mocked(mockBackend.getQueue).mockResolvedValue(queueConfig);
      vi.mocked(mockBackend.updateQueue).mockResolvedValue(updatedConfig);

      const result = await QueueOperations.instance.setConcurrency("test-queue", 20);

      expect(mockBackend.updateQueue).toHaveBeenCalledWith({ ...queueConfig, concurrency: 20 });
      expect(result).toEqual(updatedConfig);
    });

    it("should throw error when queue not found", async () => {
      vi.mocked(mockBackend.getQueue).mockResolvedValue(undefined);

      await expect(QueueOperations.instance.setConcurrency("nonexistent", 5)).rejects.toThrow();
    });
  });

  describe("setPriority", () => {
    it("should update queue priority", async () => {
      const queueConfig: QueueConfig = {
        id: 1,
        name: "test-queue",
        state: "active",
        concurrency: 10,
        priority: 0,
      };

      const updatedConfig: QueueConfig = { ...queueConfig, priority: 100 };

      vi.mocked(mockBackend.getQueue).mockResolvedValue(queueConfig);
      vi.mocked(mockBackend.updateQueue).mockResolvedValue(updatedConfig);

      const result = await QueueOperations.instance.setPriority("test-queue", 100);

      expect(mockBackend.updateQueue).toHaveBeenCalledWith({ ...queueConfig, priority: 100 });
      expect(result).toEqual(updatedConfig);
    });

    it("should throw error when queue not found", async () => {
      vi.mocked(mockBackend.getQueue).mockResolvedValue(undefined);

      await expect(QueueOperations.instance.setPriority("nonexistent", 5)).rejects.toThrow();
    });
  });

  describe("list", () => {
    it("should list queues without ordering", async () => {
      const queues: QueueConfig[] = [
        { id: 1, name: "queue1", state: "active", concurrency: 10, priority: 0 },
        { id: 2, name: "queue2", state: "paused", concurrency: 5, priority: 10 },
      ];

      vi.mocked(mockBackend.listQueues).mockResolvedValue(queues);

      const result = await QueueOperations.instance.list();

      expect(mockBackend.listQueues).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(queues);
    });

    it("should list queues with complete ordering", async () => {
      const queues: QueueConfig[] = [
        { id: 1, name: "queue1", state: "active", concurrency: 10, priority: 0 },
        { id: 2, name: "queue2", state: "paused", concurrency: 5, priority: 10 },
      ];

      vi.mocked(mockBackend.listQueues).mockResolvedValue(queues);

      const result = await QueueOperations.instance.list({ column: "name", order: "asc" });

      expect(mockBackend.listQueues).toHaveBeenCalledWith({ column: "name", order: "asc" });
      expect(result).toEqual(queues);
    });

    it("should list queues with partial ordering (defaults column to priority)", async () => {
      const queues: QueueConfig[] = [
        { id: 1, name: "queue1", state: "active", concurrency: 10, priority: 0 },
        { id: 2, name: "queue2", state: "paused", concurrency: 5, priority: 10 },
      ];

      vi.mocked(mockBackend.listQueues).mockResolvedValue(queues);

      const result = await QueueOperations.instance.list({ order: "asc" });

      expect(mockBackend.listQueues).toHaveBeenCalledWith({ order: "asc" });
      expect(result).toEqual(queues);
    });
  });

  describe("create", () => {
    it("should create a new queue successfully", async () => {
      const newQueueData: NewQueueData = {
        name: "new-queue",
        concurrency: 15,
        priority: 5,
        state: "active",
      };

      const createdQueue: QueueConfig = {
        id: 1,
        name: newQueueData.name,
        concurrency: newQueueData.concurrency!,
        priority: newQueueData.priority!,
        state: newQueueData.state!,
      };

      vi.mocked(mockBackend.getQueue).mockResolvedValue(undefined); // Queue doesn't exist
      vi.mocked(mockBackend.createNewQueue).mockResolvedValue(createdQueue);

      const result = await QueueOperations.instance.create(newQueueData);

      expect(mockBackend.getQueue).toHaveBeenCalledWith("new-queue");
      expect(mockBackend.createNewQueue).toHaveBeenCalledWith(newQueueData);
      expect(result).toEqual(createdQueue);
    });

    it("should throw error when queue already exists", async () => {
      const newQueueData: NewQueueData = {
        name: "existing-queue",
        concurrency: 10,
      };

      const existingQueue: QueueConfig = {
        id: 1,
        name: "existing-queue",
        concurrency: 10,
        priority: 0,
        state: "active",
      };

      vi.mocked(mockBackend.getQueue).mockResolvedValue(existingQueue);

      await expect(QueueOperations.instance.create(newQueueData)).rejects.toThrow();

      expect(mockBackend.getQueue).toHaveBeenCalledWith("existing-queue");
      expect(mockBackend.createNewQueue).not.toHaveBeenCalled();
    });

    it("should create queue with minimal data", async () => {
      const newQueueData: NewQueueData = {
        name: "minimal-queue",
      };

      const createdQueue: QueueConfig = {
        id: 2,
        name: "minimal-queue",
        concurrency: 10, // Backend default
        priority: 0, // Backend default
        state: "active", // Backend default
      };

      vi.mocked(mockBackend.getQueue).mockResolvedValue(undefined);
      vi.mocked(mockBackend.createNewQueue).mockResolvedValue(createdQueue);

      const result = await QueueOperations.instance.create(newQueueData);

      expect(mockBackend.createNewQueue).toHaveBeenCalledWith(newQueueData);
      expect(result).toEqual(createdQueue);
    });
  });

  describe("get", () => {
    it("should return queue when it exists", async () => {
      const queueConfig: QueueConfig = {
        id: 1,
        name: "test-queue",
        state: "active",
        concurrency: 10,
        priority: 0,
      };

      vi.mocked(mockBackend.getQueue).mockResolvedValue(queueConfig);

      const result = await QueueOperations.instance.get("test-queue");

      expect(mockBackend.getQueue).toHaveBeenCalledWith("test-queue");
      expect(result).toEqual(queueConfig);
    });

    it("should return undefined when queue does not exist", async () => {
      vi.mocked(mockBackend.getQueue).mockResolvedValue(undefined);

      const result = await QueueOperations.instance.get("nonexistent-queue");

      expect(mockBackend.getQueue).toHaveBeenCalledWith("nonexistent-queue");
      expect(result).toBeUndefined();
    });
  });
});

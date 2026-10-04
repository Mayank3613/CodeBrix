import { describe, it, expect, beforeEach } from "vitest";
import { useExecutionStore, useValidationStore } from "../stores";
import type { ExecutionResult } from "@codebrix/types";

describe("Per-Block Status Tracking & Highlighting (D1-4.2)", () => {
  beforeEach(() => {
    useExecutionStore.getState().resetExecution();
    useValidationStore.getState().clearValidation();
  });

  it("updates individual block statuses during execution lifecycle", () => {
    const store = useExecutionStore.getState();

    // 1. Initial idle
    expect(store.blockStatuses["blk-csv"]).toBeUndefined();

    // 2. Block starts executing
    store.setBlockStatus("blk-csv", "running");
    store.setActiveBlockId("blk-csv");
    expect(useExecutionStore.getState().blockStatuses["blk-csv"]).toBe("running");
    expect(useExecutionStore.getState().activeBlockId).toBe("blk-csv");

    // 3. Block completes successfully
    store.setBlockStatus("blk-csv", "success");
    expect(useExecutionStore.getState().blockStatuses["blk-csv"]).toBe("success");

    // 4. Downstream block fails
    store.setBlockStatus("blk-split", "failed");
    expect(useExecutionStore.getState().blockStatuses["blk-split"]).toBe("failed");
  });

  it("populates blockStatuses when latestResult with blockResults is loaded", () => {
    const result: ExecutionResult = {
      executionId: "exec-test-1",
      workflowId: "wf-1",
      status: "success",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: 95,
      exitCode: 0,
      blockResults: {
        "blk-csv": {
          blockId: "blk-csv",
          status: "success",
        },
        "blk-split": {
          blockId: "blk-split",
          status: "success",
        },
        "blk-rf": {
          blockId: "blk-rf",
          status: "failed",
        },
      },
      outputs: [],
    };

    useExecutionStore.getState().setLatestResult(result);

    const statuses = useExecutionStore.getState().blockStatuses;
    expect(statuses["blk-csv"]).toBe("success");
    expect(statuses["blk-split"]).toBe("success");
    expect(statuses["blk-rf"]).toBe("failed");
  });

  it("resets all block statuses on resetExecution", () => {
    useExecutionStore.getState().setBlockStatus("blk-1", "success");
    useExecutionStore.getState().setBlockStatus("blk-2", "failed");

    expect(Object.keys(useExecutionStore.getState().blockStatuses).length).toBe(2);

    useExecutionStore.getState().resetExecution();
    expect(Object.keys(useExecutionStore.getState().blockStatuses).length).toBe(0);
    expect(useExecutionStore.getState().runState).toBe("idle");
  });
});

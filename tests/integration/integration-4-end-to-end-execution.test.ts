import { describe, it, expect, beforeEach } from "vitest";
import { createIrisWorkflowMock } from "@codebrix/shared";
import { EngineWorkflowService } from "../../apps/desktop/src/services/engineWorkflowService.js";
import { useExecutionStore } from "../../apps/desktop/src/stores/executionStore.js";

describe("Integration 4 Gate: End-to-End Workflow Execution & UI Store Synchronization", () => {
  let service: EngineWorkflowService;

  beforeEach(() => {
    service = new EngineWorkflowService();
    useExecutionStore.getState().resetExecution();
  });

  it("validates the canonical Iris graph with zero errors", async () => {
    const irisGraph = createIrisWorkflowMock();
    const valResult = await service.validateGraph(irisGraph);

    expect(valResult.valid).toBe(true);
    expect(valResult.errors).toHaveLength(0);
  });

  it("generates an ordered topological execution plan with Kahn's algorithm", async () => {
    const irisGraph = createIrisWorkflowMock();
    const plan = await service.getExecutionPlan(irisGraph);

    expect(plan.workflowId).toBe(irisGraph.id);
    expect(plan.executionOrder).toEqual([
      "blk-csv",
      "blk-split",
      "blk-rf",
      "blk-predict",
      "blk-acc",
      "blk-cm",
    ]);
  });

  it("generates a runnable Python script containing imports, pipeline stages, and hooks", async () => {
    const irisGraph = createIrisWorkflowMock();
    const script = await service.generatePythonScript(irisGraph);

    expect(script).toContain("import pandas as pd");
    expect(script).toContain("from sklearn.ensemble import RandomForestClassifier");
    expect(script).toContain("emit_json");
    expect(script).toContain("block_start");
    expect(script).toContain("block_done");
    expect(script).toContain("blk-csv");
    expect(script).toContain("blk-split");
    expect(script).toContain("blk-rf");
    expect(script).toContain("blk-predict");
    expect(script).toContain("blk-acc");
    expect(script).toContain("blk-cm");
  });

  it("executes the Iris workflow end-to-end and synchronizes execution store state", async () => {
    const irisGraph = createIrisWorkflowMock();
    const result = await service.executeWorkflow(irisGraph);

    // 1. Result invariants
    expect(result.status).toBe("success");
    expect(result.exitCode).toBe(0);
    expect(result.durationMs).toBeGreaterThan(0);

    // 2. Block results verification
    expect(Object.keys(result.blockResults)).toEqual(
      expect.arrayContaining([
        "blk-csv",
        "blk-split",
        "blk-rf",
        "blk-predict",
        "blk-acc",
        "blk-cm",
      ])
    );
    for (const bId of Object.keys(result.blockResults)) {
      expect(result.blockResults[bId]?.status).toBe("success");
    }

    // 3. Output messages verification
    expect(result.outputs.length).toBeGreaterThan(0);
    const metricMsg = result.outputs.find((o) => o.type === "metrics");
    expect(metricMsg).toBeDefined();
    if (metricMsg && metricMsg.type === "metrics") {
      expect(metricMsg.metrics["accuracy"]).toBeDefined();
    }

    // 4. Reactive execution store verification
    const storeState = useExecutionStore.getState();
    expect(storeState.runState).toBe("success");
    expect(storeState.latestResult).toBeDefined();
    expect(storeState.latestResult?.executionId).toBe(result.executionId);
    expect(storeState.blockStatuses["blk-csv"]).toBe("success");
    expect(storeState.blockStatuses["blk-rf"]).toBe("success");
    expect(storeState.blockStatuses["blk-acc"]).toBe("success");
  });
});

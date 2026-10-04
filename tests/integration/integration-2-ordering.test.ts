import { describe, it, expect } from "vitest";
import type { WorkflowGraph } from "@codebrix/types";
import { MockWorkflowService, isCompatiblePortType } from "@codebrix/shared";
import { csvBlockDefinition } from "../../libraries/data/src/index";

describe("Integration 2 Gate: CSV to Train/Test Split Ordering", () => {
  const workflowService = new MockWorkflowService();

  const testGraph: WorkflowGraph = {
    id: "wf-csv-to-split",
    name: "CSV to Train/Test Split",
    version: "0.1.0",
    blocks: {
      "blk-csv": {
        id: "blk-csv",
        definitionId: "data.csv_loader",
        label: "Iris CSV Loader",
        position: { x: 50, y: 150 },
        config: { filePath: "tests/fixtures/iris.csv" },
        state: "idle",
      },
      "blk-split": {
        id: "blk-split",
        definitionId: "ml.train_test_split",
        label: "Train/Test Split",
        position: { x: 300, y: 150 },
        config: { test_size: 0.2, random_state: 42 },
        state: "idle",
      },
    },
    connections: [
      {
        id: "c1",
        sourceBlockId: "blk-csv",
        sourcePortId: "dataset_out",
        targetBlockId: "blk-split",
        targetPortId: "dataset_in",
      },
    ],
  };

  it("verifies port compatibility between CSV output and Split input", () => {
    const csvDef = csvBlockDefinition;
    const csvPort = csvDef.outputs.find((p) => p.id === "dataset_out");
    expect(csvPort).toBeDefined();
    expect(csvPort?.type).toBe("dataframe");

    // Split accepts dataframe input
    const isCompatible = isCompatiblePortType(csvPort!.type, "dataframe");
    expect(isCompatible).toBe(true);
  });

  it("validates graph without errors", async () => {
    const res = await workflowService.validateGraph(testGraph);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it("produces an execution plan with correct topological order (CSV before Split)", async () => {
    const plan = await workflowService.getExecutionPlan(testGraph);
    expect(plan.workflowId).toBe(testGraph.id);
    expect(plan.executionOrder).toBeDefined();

    const csvIndex = plan.executionOrder.indexOf("blk-csv");
    const splitIndex = plan.executionOrder.indexOf("blk-split");

    expect(csvIndex).toBeGreaterThanOrEqual(0);
    expect(splitIndex).toBeGreaterThanOrEqual(0);
    expect(csvIndex).toBeLessThan(splitIndex);
  });
});

import { describe, it, expect } from "vitest";
import {
  BlockDefinitionRegistry,
  GraphValidator,
  topologicalSort,
  getExecutionPlan,
  detectCycles,
  IRIS_BLOCK_DEFINITIONS,
  GraphBuilder,
} from "../index.js";
import { createIrisWorkflowMock } from "@codebrix/shared";

describe("Phase 1 Integration: Iris Workflow End-to-End", () => {
  it("should validate and generate an execution plan for Iris classification", () => {
    // 1. Initialize registry with Iris block definitions
    const registry = new BlockDefinitionRegistry();
    registry.registerMany(IRIS_BLOCK_DEFINITIONS);
    expect(registry.size).toBe(6);

    // 2. Load the reference Iris workflow mock
    const workflow = createIrisWorkflowMock();
    expect(Object.keys(workflow.blocks)).toHaveLength(6);
    expect(workflow.connections).toHaveLength(8);

    // 3. Detect cycles
    const cycleResult = detectCycles(workflow);
    expect(cycleResult.hasCycle).toBe(false);
    expect(cycleResult.cycleBlockIds).toHaveLength(0);

    // 4. Validate graph
    const validator = new GraphValidator(registry);
    const validationResult = validator.validate(workflow);
    expect(validationResult.valid).toBe(true);
    expect(validationResult.errors).toHaveLength(0);

    // 5. Compute topological order
    const order = topologicalSort(workflow);
    expect(order).toHaveLength(6);

    // Specific ordering constraints:
    // load must run before split
    expect(order.indexOf("blk-csv")).toBeLessThan(order.indexOf("blk-split"));
    // split and model must run before predict
    expect(order.indexOf("blk-split")).toBeLessThan(order.indexOf("blk-predict"));
    expect(order.indexOf("blk-rf")).toBeLessThan(order.indexOf("blk-predict"));
    // predict must run before evaluation blocks
    expect(order.indexOf("blk-predict")).toBeLessThan(order.indexOf("blk-acc"));
    expect(order.indexOf("blk-predict")).toBeLessThan(order.indexOf("blk-cm"));

    // 6. Generate ExecutionPlan
    const plan = getExecutionPlan(workflow);
    expect(plan.workflowId).toBe(workflow.id);
    expect(plan.steps).toHaveLength(6);
    expect(plan.executionOrder).toEqual(order);

    // Verify step 1 has no dependencies
    const firstStep = plan.steps[0];
    expect(firstStep.dependencies).toHaveLength(0);

    // Verify evaluation steps depend on both split and predict
    const accStep = plan.steps.find((s) => s.blockId === "blk-acc");
    expect(accStep?.dependencies).toContain("blk-predict");
    expect(accStep?.dependencies).toContain("blk-split");

    const cmStep = plan.steps.find((s) => s.blockId === "blk-cm");
    expect(cmStep?.dependencies).toContain("blk-predict");
    expect(cmStep?.dependencies).toContain("blk-split");
  });

  it("should build a workflow from canvas nodes/edges, validate it, and generate an execution plan", () => {
    const registry = new BlockDefinitionRegistry();
    registry.registerMany(IRIS_BLOCK_DEFINITIONS);

    const builder = new GraphBuilder("canvas-pipeline", "Canvas Built Workflow");

    builder
      .addBlock("load", "data.csv_loader", "Load CSV", { x: 0, y: 0 }, { filepath: "data/iris.csv" })
      .addBlock("split", "ml.train_test_split", "Split Data", { x: 200, y: 0 }, { test_size: 0.2 })
      .addBlock("model", "ml.random_forest_classifier", "Random Forest", { x: 200, y: 200 }, { n_estimators: 100 })
      .addBlock("predict", "ml.predict", "Predict", { x: 400, y: 100 })
      .addBlock("acc", "eval.accuracy", "Accuracy", { x: 600, y: 100 })
      .connect("load", "dataset_out", "split", "dataset_in")
      .connect("split", "train_data_out", "model", "train_data_in")
      .connect("model", "model_out", "predict", "model_in")
      .connect("split", "test_data_out", "predict", "test_data_in")
      .connect("predict", "predictions_out", "acc", "predictions_in")
      .connect("split", "y_test_out", "acc", "ground_truth_in");

    const graph = builder.build();

    const validator = new GraphValidator(registry);
    const result = validator.validate(graph);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);

    const plan = getExecutionPlan(graph);
    expect(plan.steps).toHaveLength(5);
    expect(plan.executionOrder.indexOf("load")).toBe(0);
    expect(plan.executionOrder[plan.executionOrder.length - 1]).toBe("acc");
  });
});

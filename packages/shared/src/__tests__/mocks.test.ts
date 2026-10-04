import { describe, it, expect } from "vitest";
import {
  createIrisWorkflowMock,
  createMockWorkflowGraph,
  createMockExecutionPlan,
  createMockExecutionResult,
} from "../mocks.js";
import { isValidWorkflowGraph, isValidExecutionResult } from "../guards.js";

describe("Shared Mocks & Acceptance Fixtures", () => {
  it("should create valid basic mock workflow graph", () => {
    const wf = createMockWorkflowGraph();
    expect(isValidWorkflowGraph(wf)).toBe(true);
    expect(wf.blocks["block-1"]?.definitionId).toBe("mock.block");
  });

  it("should generate the full Iris Acceptance workflow with all 6 blocks and 8 connections", () => {
    const iris = createIrisWorkflowMock();
    expect(isValidWorkflowGraph(iris)).toBe(true);
    expect(Object.keys(iris.blocks)).toHaveLength(6);
    expect(iris.connections).toHaveLength(8);

    // Verify key blocks required for MVP
    expect(iris.blocks["blk-csv"]?.definitionId).toBe("data.csv_loader");
    expect(iris.blocks["blk-split"]?.definitionId).toBe("ml.train_test_split");
    expect(iris.blocks["blk-rf"]?.definitionId).toBe("ml.random_forest_classifier");
    expect(iris.blocks["blk-predict"]?.definitionId).toBe("ml.predict");
    expect(iris.blocks["blk-acc"]?.definitionId).toBe("eval.accuracy");
    expect(iris.blocks["blk-cm"]?.definitionId).toBe("eval.confusion_matrix");
  });

  it("should generate a valid ExecutionPlan and ExecutionResult", () => {
    const plan = createMockExecutionPlan();
    expect(plan.executionOrder).toEqual(["block-1"]);

    const res = createMockExecutionResult();
    expect(isValidExecutionResult(res)).toBe(true);
    expect(res.outputs[0]?.type).toBe("console");
  });

  it("should validate and execute using MockWorkflowService", async () => {
    const { MockWorkflowService } = await import("../mocks.js");
    const service = new MockWorkflowService();
    const iris = createIrisWorkflowMock();

    const val = await service.validateGraph(iris);
    expect(val.valid).toBe(true);
    expect(val.errors).toHaveLength(0);

    const plan = await service.getExecutionPlan(iris);
    expect(plan.executionOrder).toHaveLength(6);

    const exec = await service.executeWorkflow(iris);
    expect(exec.status).toBe("success");
    expect(exec.outputs.length).toBeGreaterThan(0);
  });
});


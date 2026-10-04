import { describe, it, expect } from "vitest";
import { workflowService } from "./index";
import { createIrisWorkflowMock } from "@codebrix/shared";

describe("WorkflowService (Desktop Service Provider)", () => {
  it("exports active workflow service instance", () => {
    expect(workflowService).toBeDefined();
    expect(typeof workflowService.validateGraph).toBe("function");
    expect(typeof workflowService.executeWorkflow).toBe("function");
    expect(typeof workflowService.getExecutionPlan).toBe("function");
  });

  it("validates the Iris MVP workflow graph as valid", async () => {
    const irisGraph = createIrisWorkflowMock();
    const result = await workflowService.validateGraph(irisGraph);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("generates an execution plan for the Iris workflow", async () => {
    const irisGraph = createIrisWorkflowMock();
    const plan = await workflowService.getExecutionPlan(irisGraph);
    expect(plan.workflowId).toBe(irisGraph.id);
    expect(plan.executionOrder.length).toBeGreaterThan(0);
    expect(plan.executionOrder).toContain("blk-csv");
  });

  it("executes the Iris workflow and returns mock outputs", async () => {
    const irisGraph = createIrisWorkflowMock();
    const result = await workflowService.executeWorkflow(irisGraph);
    expect(result.status).toBe("success");
    expect(result.outputs.length).toBeGreaterThan(0);
    const consoleOutput = result.outputs.find((o) => o.type === "console");
    expect(consoleOutput).toBeDefined();
  });
});

import { describe, it, expect } from "vitest";
import type { WorkflowGraph } from "@codebrix/types";
import {
  topologicalSort,
  computeDependencies,
  getExecutionPlan,
} from "../topological-sort.js";
import { createIrisWorkflowMock } from "@codebrix/shared";

describe("Topological Sort & Execution Planning", () => {
  describe("topologicalSort", () => {
    it("should sort a linear pipeline correctly", () => {
      const graph: WorkflowGraph = {
        id: "linear-wf",
        name: "Linear Workflow",
        version: "0.1.0",
        blocks: {
          step1: { id: "step1", definitionId: "load", position: { x: 0, y: 0 }, config: {} },
          step2: { id: "step2", definitionId: "process", position: { x: 0, y: 0 }, config: {} },
          step3: { id: "step3", definitionId: "save", position: { x: 0, y: 0 }, config: {} },
        },
        connections: [
          { id: "c1", sourceBlockId: "step1", sourcePortId: "out", targetBlockId: "step2", targetPortId: "in" },
          { id: "c2", sourceBlockId: "step2", sourcePortId: "out", targetBlockId: "step3", targetPortId: "in" },
        ],
      };

      const order = topologicalSort(graph);
      expect(order).toEqual(["step1", "step2", "step3"]);
    });

    it("should handle branching and merging pipelines (diamond graph)", () => {
      const graph: WorkflowGraph = {
        id: "diamond-wf",
        name: "Diamond",
        version: "0.1.0",
        blocks: {
          root: { id: "root", definitionId: "source", position: { x: 0, y: 0 }, config: {} },
          left: { id: "left", definitionId: "proc1", position: { x: 0, y: 0 }, config: {} },
          right: { id: "right", definitionId: "proc2", position: { x: 0, y: 0 }, config: {} },
          merge: { id: "merge", definitionId: "sink", position: { x: 0, y: 0 }, config: {} },
        },
        connections: [
          { id: "c1", sourceBlockId: "root", sourcePortId: "out", targetBlockId: "left", targetPortId: "in" },
          { id: "c2", sourceBlockId: "root", sourcePortId: "out", targetBlockId: "right", targetPortId: "in" },
          { id: "c3", sourceBlockId: "left", sourcePortId: "out", targetBlockId: "merge", targetPortId: "in1" },
          { id: "c4", sourceBlockId: "right", sourcePortId: "out", targetBlockId: "merge", targetPortId: "in2" },
        ],
      };

      const order = topologicalSort(graph);
      expect(order[0]).toBe("root");
      expect(order[order.length - 1]).toBe("merge");
      expect(order.indexOf("root")).toBeLessThan(order.indexOf("left"));
      expect(order.indexOf("root")).toBeLessThan(order.indexOf("right"));
      expect(order.indexOf("left")).toBeLessThan(order.indexOf("merge"));
      expect(order.indexOf("right")).toBeLessThan(order.indexOf("merge"));
    });

    it("should sort disconnected independent subgraphs", () => {
      const graph: WorkflowGraph = {
        id: "multi-wf",
        name: "Multiple Disconnected",
        version: "0.1.0",
        blocks: {
          a1: { id: "a1", definitionId: "src", position: { x: 0, y: 0 }, config: {} },
          a2: { id: "a2", definitionId: "sink", position: { x: 0, y: 0 }, config: {} },
          b1: { id: "b1", definitionId: "src", position: { x: 0, y: 0 }, config: {} },
        },
        connections: [
          { id: "c1", sourceBlockId: "a1", sourcePortId: "out", targetBlockId: "a2", targetPortId: "in" },
        ],
      };

      const order = topologicalSort(graph);
      expect(order).toHaveLength(3);
      expect(order.indexOf("a1")).toBeLessThan(order.indexOf("a2"));
      expect(order).toContain("b1");
    });

    it("should throw an error if a cycle exists", () => {
      const graph: WorkflowGraph = {
        id: "cycle-wf",
        name: "Cyclic",
        version: "0.1.0",
        blocks: {
          b1: { id: "b1", definitionId: "proc", position: { x: 0, y: 0 }, config: {} },
          b2: { id: "b2", definitionId: "proc", position: { x: 0, y: 0 }, config: {} },
        },
        connections: [
          { id: "c1", sourceBlockId: "b1", sourcePortId: "out", targetBlockId: "b2", targetPortId: "in" },
          { id: "c2", sourceBlockId: "b2", sourcePortId: "out", targetBlockId: "b1", targetPortId: "in" },
        ],
      };

      expect(() => topologicalSort(graph)).toThrow(/Cycle detected/i);
    });
  });

  describe("computeDependencies", () => {
    it("should compute direct dependencies accurately", () => {
      const graph: WorkflowGraph = {
        id: "deps-wf",
        name: "Deps Workflow",
        version: "0.1.0",
        blocks: {
          n1: { id: "n1", definitionId: "d1", position: { x: 0, y: 0 }, config: {} },
          n2: { id: "n2", definitionId: "d2", position: { x: 0, y: 0 }, config: {} },
          n3: { id: "n3", definitionId: "d3", position: { x: 0, y: 0 }, config: {} },
        },
        connections: [
          { id: "c1", sourceBlockId: "n1", sourcePortId: "out1", targetBlockId: "n3", targetPortId: "in1" },
          { id: "c2", sourceBlockId: "n1", sourcePortId: "out2", targetBlockId: "n3", targetPortId: "in2" },
          { id: "c3", sourceBlockId: "n2", sourcePortId: "out", targetBlockId: "n3", targetPortId: "in3" },
        ],
      };

      const deps = computeDependencies(graph);
      expect(deps.get("n1")).toEqual([]);
      expect(deps.get("n2")).toEqual([]);
      // Should deduplicate n1 even if multiple connections exist between n1 and n3
      expect(deps.get("n3")).toEqual(["n1", "n2"]);
    });
  });

  describe("getExecutionPlan", () => {
    it("should generate a complete execution plan for the Iris workflow", () => {
      const iris = createIrisWorkflowMock();
      const plan = getExecutionPlan(iris);

      expect(plan.planId).toMatch(/^plan-/);
      expect(plan.workflowId).toBe(iris.id);
      expect(plan.steps).toHaveLength(6);
      expect(plan.executionOrder).toHaveLength(6);
      expect(new Date(plan.createdAt).getTime()).not.toBeNaN();

      // Step indices should match executionOrder
      plan.steps.forEach((step, idx) => {
        expect(step.order).toBe(idx);
        expect(step.stepId).toBe(`step-${idx + 1}`);
        expect(step.blockId).toBe(plan.executionOrder[idx]);
      });

      // Topological invariants for Iris pipeline:
      // 1. blk-csv must precede blk-split
      const loadIdx = plan.executionOrder.indexOf("blk-csv");
      const splitIdx = plan.executionOrder.indexOf("blk-split");
      const modelIdx = plan.executionOrder.indexOf("blk-rf");
      const predictIdx = plan.executionOrder.indexOf("blk-predict");
      const accIdx = plan.executionOrder.indexOf("blk-acc");
      const cmIdx = plan.executionOrder.indexOf("blk-cm");

      expect(loadIdx).toBeLessThan(splitIdx);
      // 2. blk-split and blk-rf must precede blk-predict
      expect(splitIdx).toBeLessThan(predictIdx);
      expect(modelIdx).toBeLessThan(predictIdx);
      // 3. blk-predict must precede accuracy and confusion matrix
      expect(predictIdx).toBeLessThan(accIdx);
      expect(predictIdx).toBeLessThan(cmIdx);

      // Verify step dependencies
      const predictStep = plan.steps.find((s) => s.blockId === "blk-predict");
      expect(predictStep?.dependencies).toContain("blk-rf");
      expect(predictStep?.dependencies).toContain("blk-split");

      const accStep = plan.steps.find((s) => s.blockId === "blk-acc");
      expect(accStep?.dependencies).toContain("blk-predict");
      expect(accStep?.dependencies).toContain("blk-split");
    });
  });
});

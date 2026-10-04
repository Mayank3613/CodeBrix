import { describe, it, expect } from "vitest";
import {
  isCompatiblePortType,
  isValidWorkflowGraph,
  isValidBlockDefinition,
  isValidBlockInstance,
  isValidConnection,
  isValidExecutionResult,
} from "../guards.js";
import {
  createMockWorkflowGraph,
  createMockBlockDefinition,
  createMockBlockInstance,
  createMockExecutionResult,
} from "../mocks.js";

describe("Shared Contract Guards", () => {
  describe("isCompatiblePortType", () => {
    it("should allow matching port types", () => {
      expect(isCompatiblePortType("dataframe", "dataframe")).toBe(true);
      expect(isCompatiblePortType("model", "model")).toBe(true);
      expect(isCompatiblePortType("number", "number")).toBe(true);
    });

    it("should allow dataframe into dataset", () => {
      expect(isCompatiblePortType("dataframe", "dataset")).toBe(true);
      expect(isCompatiblePortType("dataset", "dataframe")).toBe(true);
    });

    it("should allow any type wildcard", () => {
      expect(isCompatiblePortType("any", "model")).toBe(true);
      expect(isCompatiblePortType("dataset", "any")).toBe(true);
    });

    it("should reject incompatible types", () => {
      expect(isCompatiblePortType("dataframe", "model")).toBe(false);
      expect(isCompatiblePortType("model", "dataset")).toBe(false);
    });
  });

  describe("Runtime validators", () => {
    it("validates BlockDefinition", () => {
      const def = createMockBlockDefinition();
      expect(isValidBlockDefinition(def)).toBe(true);
      expect(isValidBlockDefinition({ invalid: true })).toBe(false);
      expect(isValidBlockDefinition(null)).toBe(false);
    });

    it("validates BlockInstance", () => {
      const inst = createMockBlockInstance();
      expect(isValidBlockInstance(inst)).toBe(true);
      expect(isValidBlockInstance({ id: "1" })).toBe(false);
    });

    it("validates Connection", () => {
      const conn = {
        id: "c1",
        sourceBlockId: "b1",
        sourcePortId: "out",
        targetBlockId: "b2",
        targetPortId: "in",
      };
      expect(isValidConnection(conn)).toBe(true);
      expect(isValidConnection({ id: "c1" })).toBe(false);
    });

    it("validates WorkflowGraph", () => {
      const wf = createMockWorkflowGraph();
      expect(isValidWorkflowGraph(wf)).toBe(true);
      expect(isValidWorkflowGraph({})).toBe(false);
    });

    it("validates ExecutionResult", () => {
      const res = createMockExecutionResult();
      expect(isValidExecutionResult(res)).toBe(true);
      expect(isValidExecutionResult({ status: "success" })).toBe(false);
    });
  });
});

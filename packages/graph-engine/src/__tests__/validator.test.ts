import { describe, it, expect, beforeEach } from "vitest";
import type { WorkflowGraph } from "@codebrix/types";
import { GraphValidator } from "../validator.js";
import { BlockDefinitionRegistry } from "../registry.js";
import { IRIS_BLOCK_DEFINITIONS } from "../block-definitions.js";
import { createIrisWorkflowMock } from "@codebrix/shared";

describe("GraphValidator", () => {
  let registry: BlockDefinitionRegistry;
  let validator: GraphValidator;

  beforeEach(() => {
    registry = new BlockDefinitionRegistry();
    registry.registerMany(IRIS_BLOCK_DEFINITIONS);
    validator = new GraphValidator(registry);
  });

  describe("Valid graphs", () => {
    it("should validate the Iris MVP pipeline as valid", () => {
      const iris = createIrisWorkflowMock();
      const result = validator.validate(iris);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("Empty graph", () => {
    it("should reject an empty graph", () => {
      const empty: WorkflowGraph = {
        id: "empty",
        name: "Empty",
        version: "0.1.0",
        blocks: {},
        connections: [],
      };

      const result = validator.validate(empty);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.code).toBe("INVALID_TOPOLOGY");
    });
  });

  describe("Unknown block definitions", () => {
    it("should flag blocks with unregistered definition IDs", () => {
      const graph: WorkflowGraph = {
        id: "wf1",
        name: "Test",
        version: "0.1.0",
        blocks: {
          "b1": {
            id: "b1",
            definitionId: "nonexistent.block",
            label: "Mystery Block",
            position: { x: 0, y: 0 },
            config: {},
          },
        },
        connections: [],
      };

      const result = validator.validate(graph);
      expect(result.valid).toBe(false);
      const err = result.errors.find(
        (e) => e.code === "UNKNOWN_BLOCK_DEFINITION"
      );
      expect(err).toBeDefined();
      expect(err?.blockId).toBe("b1");
    });
  });

  describe("Dangling connections", () => {
    it("should flag connections referencing non-existent source blocks", () => {
      const graph: WorkflowGraph = {
        id: "wf1",
        name: "Test",
        version: "0.1.0",
        blocks: {
          "b2": {
            id: "b2",
            definitionId: "ml.train_test_split",
            position: { x: 0, y: 0 },
            config: {},
          },
        },
        connections: [
          {
            id: "c1",
            sourceBlockId: "ghost_block",
            sourcePortId: "out",
            targetBlockId: "b2",
            targetPortId: "dataset_in",
          },
        ],
      };

      const result = validator.validate(graph);
      expect(result.valid).toBe(false);
      const err = result.errors.find((e) => e.code === "DANGLING_CONNECTION");
      expect(err).toBeDefined();
      expect(err?.connectionId).toBe("c1");
    });

    it("should flag connections referencing non-existent ports", () => {
      const graph: WorkflowGraph = {
        id: "wf1",
        name: "Test",
        version: "0.1.0",
        blocks: {
          "b1": {
            id: "b1",
            definitionId: "data.csv_loader",
            position: { x: 0, y: 0 },
            config: {},
          },
          "b2": {
            id: "b2",
            definitionId: "ml.train_test_split",
            position: { x: 200, y: 0 },
            config: {},
          },
        },
        connections: [
          {
            id: "c1",
            sourceBlockId: "b1",
            sourcePortId: "fake_port",
            targetBlockId: "b2",
            targetPortId: "dataset_in",
          },
        ],
      };

      const result = validator.validate(graph);
      expect(result.valid).toBe(false);
      const err = result.errors.find(
        (e) => e.code === "DANGLING_CONNECTION" && e.portId === "fake_port"
      );
      expect(err).toBeDefined();
    });
  });

  describe("Missing required inputs", () => {
    it("should flag required input ports that are not connected", () => {
      const graph: WorkflowGraph = {
        id: "wf1",
        name: "Test",
        version: "0.1.0",
        blocks: {
          "b1": {
            id: "b1",
            definitionId: "ml.train_test_split",
            label: "Lonely Split",
            position: { x: 0, y: 0 },
            config: {},
          },
        },
        connections: [],
      };

      const result = validator.validate(graph);
      expect(result.valid).toBe(false);
      const err = result.errors.find(
        (e) => e.code === "MISSING_REQUIRED_INPUT"
      );
      expect(err).toBeDefined();
      expect(err?.blockId).toBe("b1");
      expect(err?.portId).toBe("dataset_in");
    });
  });

  describe("Port type compatibility", () => {
    it("should flag incompatible port type connections", () => {
      // Connecting model output to a dataframe input
      const graph: WorkflowGraph = {
        id: "wf1",
        name: "Test",
        version: "0.1.0",
        blocks: {
          "b1": {
            id: "b1",
            definitionId: "ml.random_forest_classifier",
            position: { x: 0, y: 0 },
            config: {},
          },
          "b2": {
            id: "b2",
            definitionId: "ml.train_test_split",
            position: { x: 200, y: 0 },
            config: {},
          },
        },
        connections: [
          {
            id: "c1",
            sourceBlockId: "b1",
            sourcePortId: "model_out",     // type: model
            targetBlockId: "b2",
            targetPortId: "dataset_in",    // type: dataframe
          },
        ],
      };

      const result = validator.validate(graph);
      const err = result.errors.find(
        (e) => e.code === "INCOMPATIBLE_PORT_TYPES"
      );
      expect(err).toBeDefined();
      expect(err?.connectionId).toBe("c1");
    });

    it("should allow compatible port type connections (dataframe → dataframe)", () => {
      const graph: WorkflowGraph = {
        id: "wf1",
        name: "Test",
        version: "0.1.0",
        blocks: {
          "b1": {
            id: "b1",
            definitionId: "data.csv_loader",
            position: { x: 0, y: 0 },
            config: {},
          },
          "b2": {
            id: "b2",
            definitionId: "ml.train_test_split",
            position: { x: 200, y: 0 },
            config: {},
          },
        },
        connections: [
          {
            id: "c1",
            sourceBlockId: "b1",
            sourcePortId: "dataset_out",   // type: dataframe
            targetBlockId: "b2",
            targetPortId: "dataset_in",    // type: dataframe
          },
        ],
      };

      const result = validator.validate(graph);
      const typeErr = result.errors.find(
        (e) => e.code === "INCOMPATIBLE_PORT_TYPES"
      );
      expect(typeErr).toBeUndefined();
    });
  });

  describe("Cycle detection via validator", () => {
    it("should flag cycles in the graph", () => {
      const graph: WorkflowGraph = {
        id: "wf1",
        name: "Cyclic",
        version: "0.1.0",
        blocks: {
          "a": {
            id: "a",
            definitionId: "data.csv_loader",
            position: { x: 0, y: 0 },
            config: {},
          },
          "b": {
            id: "b",
            definitionId: "ml.train_test_split",
            position: { x: 200, y: 0 },
            config: {},
          },
        },
        connections: [
          {
            id: "c1",
            sourceBlockId: "a",
            sourcePortId: "dataset_out",
            targetBlockId: "b",
            targetPortId: "dataset_in",
          },
          {
            id: "c2",
            sourceBlockId: "b",
            sourcePortId: "train_data_out",
            targetBlockId: "a",
            targetPortId: "file_path_in",
          },
        ],
      };

      const result = validator.validate(graph);
      expect(result.valid).toBe(false);
      const cycleErr = result.errors.find((e) => e.code === "CYCLE_DETECTED");
      expect(cycleErr).toBeDefined();
    });
  });
});

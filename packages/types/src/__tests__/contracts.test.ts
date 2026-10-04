import { describe, it, expect } from "vitest";
import {
  CONTRACT_VERSION,
  type BlockDefinition,
  type BlockInstance,
  type PortDefinition,
  type Connection,
  type WorkflowGraph,
  type ValidationResult,
  type ExecutionPlan,
  type ExecutionResult,
  type OutputMessage,
} from "../index.js";

describe("Phase 0 Contract Types (v0.1)", () => {
  it("should have frozen contract version 0.1.0", () => {
    expect(CONTRACT_VERSION).toBe("0.1.0");
  });

  it("should construct valid BlockDefinition and BlockInstance objects", () => {
    const portIn: PortDefinition = {
      id: "df_in",
      name: "Input Dataset",
      type: "dataframe",
      direction: "input",
      required: true,
    };

    const portOut: PortDefinition = {
      id: "df_out",
      name: "Output Dataset",
      type: "dataframe",
      direction: "output",
    };

    const def: BlockDefinition = {
      id: "data.csv_loader",
      name: "CSV Loader",
      category: "data",
      version: "0.1.0",
      description: "Loads tabular CSV files into a DataFrame",
      inputs: [],
      outputs: [portOut],
      configSchema: {
        filePath: {
          name: "filePath",
          label: "File Path",
          type: "file",
          required: true,
        },
      },
    };

    const instance: BlockInstance = {
      id: "blk-1",
      definitionId: def.id,
      label: "My Iris CSV",
      position: { x: 100, y: 150 },
      config: { filePath: "tests/fixtures/iris.csv" },
      state: "idle",
    };

    expect(def.id).toBe("data.csv_loader");
    expect(def.outputs[0]?.id).toBe("df_out");
    expect(instance.config["filePath"]).toBe("tests/fixtures/iris.csv");
    expect(portIn.direction).toBe("input");
  });

  it("should construct a valid WorkflowGraph with connections", () => {
    const conn: Connection = {
      id: "conn-1",
      sourceBlockId: "blk-1",
      sourcePortId: "df_out",
      targetBlockId: "blk-2",
      targetPortId: "df_in",
    };

    const graph: WorkflowGraph = {
      id: "wf-iris",
      name: "Iris Classification Pipeline",
      version: "0.1.0",
      blocks: {
        "blk-1": {
          id: "blk-1",
          definitionId: "data.csv_loader",
          position: { x: 50, y: 100 },
          config: {},
        },
        "blk-2": {
          id: "blk-2",
          definitionId: "ml.train_test_split",
          position: { x: 250, y: 100 },
          config: { test_size: 0.2 },
        },
      },
      connections: [conn],
    };

    expect(graph.connections).toHaveLength(1);
    expect(graph.blocks["blk-1"]?.id).toBe("blk-1");
  });

  it("should construct valid ValidationResult and ExecutionResult objects", () => {
    const validation: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    const plan: ExecutionPlan = {
      planId: "plan-1",
      workflowId: "wf-iris",
      steps: [
        {
          stepId: "step-1",
          blockId: "blk-1",
          order: 0,
          dependencies: [],
        },
        {
          stepId: "step-2",
          blockId: "blk-2",
          order: 1,
          dependencies: ["blk-1"],
        },
      ],
      executionOrder: ["blk-1", "blk-2"],
      createdAt: new Date().toISOString(),
    };

    const output: OutputMessage = {
      type: "metrics",
      title: "Iris Accuracy",
      metrics: {
        accuracy: 0.9667,
      },
      timestamp: new Date().toISOString(),
    };

    const execution: ExecutionResult = {
      executionId: "exec-1",
      workflowId: "wf-iris",
      status: "success",
      startedAt: new Date().toISOString(),
      blockResults: {
        "blk-1": { blockId: "blk-1", status: "success" },
        "blk-2": { blockId: "blk-2", status: "success" },
      },
      outputs: [output],
      exitCode: 0,
    };

    expect(validation.valid).toBe(true);
    expect(plan.executionOrder).toEqual(["blk-1", "blk-2"]);
    expect(execution.status).toBe("success");
    expect(execution.outputs[0]?.type).toBe("metrics");
  });
});

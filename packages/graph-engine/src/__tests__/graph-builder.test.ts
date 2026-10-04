import { describe, it, expect } from "vitest";
import { GraphBuilder } from "../graph-builder.js";

describe("GraphBuilder", () => {
  it("should build a WorkflowGraph from canvas nodes and edges", () => {
    const builder = new GraphBuilder();

    builder
      .setName("Test Pipeline")
      .setDescription("A test pipeline")
      .addNode({
        id: "n1",
        definitionId: "data.csv_loader",
        label: "CSV Loader",
        position: { x: 50, y: 100 },
        config: { filePath: "data.csv" },
      })
      .addNode({
        id: "n2",
        definitionId: "ml.train_test_split",
        label: "Split",
        position: { x: 300, y: 100 },
        config: { test_size: 0.2 },
      })
      .addEdge({
        id: "e1",
        source: "n1",
        sourceHandle: "dataset_out",
        target: "n2",
        targetHandle: "dataset_in",
      });

    const graph = builder.build();

    expect(graph.name).toBe("Test Pipeline");
    expect(graph.description).toBe("A test pipeline");
    expect(graph.version).toBe("0.1.0");
    expect(Object.keys(graph.blocks)).toHaveLength(2);
    expect(graph.connections).toHaveLength(1);

    // Verify block instances
    expect(graph.blocks["n1"]?.definitionId).toBe("data.csv_loader");
    expect(graph.blocks["n1"]?.position).toEqual({ x: 50, y: 100 });
    expect(graph.blocks["n1"]?.config["filePath"]).toBe("data.csv");
    expect(graph.blocks["n1"]?.state).toBe("idle");

    // Verify connection mapping
    const conn = graph.connections[0]!;
    expect(conn.sourceBlockId).toBe("n1");
    expect(conn.sourcePortId).toBe("dataset_out");
    expect(conn.targetBlockId).toBe("n2");
    expect(conn.targetPortId).toBe("dataset_in");
  });

  it("should build with the static fromCanvas factory", () => {
    const graph = GraphBuilder.fromCanvas(
      [
        {
          id: "a",
          definitionId: "mock.block",
          position: { x: 0, y: 0 },
          config: {},
        },
      ],
      [],
      "Quick Graph"
    );

    expect(graph.name).toBe("Quick Graph");
    expect(Object.keys(graph.blocks)).toHaveLength(1);
    expect(graph.connections).toHaveLength(0);
  });

  it("should reset builder state", () => {
    const builder = new GraphBuilder();
    builder.addNode({
      id: "x",
      definitionId: "mock",
      position: { x: 0, y: 0 },
      config: {},
    });

    builder.reset();
    const graph = builder.build();
    expect(Object.keys(graph.blocks)).toHaveLength(0);
    expect(graph.name).toBe("Untitled Workflow");
  });

  it("should generate metadata with timestamps", () => {
    const graph = GraphBuilder.fromCanvas(
      [
        {
          id: "a",
          definitionId: "mock.block",
          position: { x: 0, y: 0 },
          config: {},
        },
      ],
      []
    );

    expect(graph.metadata).toBeDefined();
    expect(graph.metadata?.createdAt).toBeTruthy();
    expect(graph.metadata?.contractVersion).toBe("0.1.0");
  });
});

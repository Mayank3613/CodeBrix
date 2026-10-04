import { describe, it, expect } from "vitest";
import { toNeutralGraph, toReactFlowGraph, type BlockNodeData, type FlowEdgePayload } from "./adapter";
import { createIrisWorkflowMock } from "@codebrix/shared";
import type { Node, Edge } from "@xyflow/react";

describe("Canvas Graph Adapter (D1-1.7)", () => {
  it("converts React Flow nodes and edges to neutral WorkflowGraph", () => {
    const nodes: Node<BlockNodeData>[] = [
      {
        id: "node-1",
        type: "blockNode",
        position: { x: 100, y: 150 },
        data: {
          definitionId: "data.csv_loader",
          label: "CSV Node",
          config: { filePath: "iris.csv" },
          state: "idle",
        },
      },
      {
        id: "node-2",
        type: "blockNode",
        position: { x: 400, y: 150 },
        data: {
          definitionId: "ml.train_test_split",
          label: "Split Node",
          config: { test_size: 0.2 },
          state: "idle",
        },
      },
    ];

    const edges: Edge<FlowEdgePayload>[] = [
      {
        id: "edge-1",
        source: "node-1",
        sourceHandle: "dataset_out",
        target: "node-2",
        targetHandle: "dataset_in",
        data: { connectionId: "edge-1" },
      },
    ];

    const neutral = toNeutralGraph(nodes, edges);

    expect(neutral.blocks["node-1"]).toBeDefined();
    expect(neutral.blocks["node-1"]?.definitionId).toBe("data.csv_loader");
    expect(neutral.blocks["node-1"]?.position).toEqual({ x: 100, y: 150 });
    expect(neutral.blocks["node-1"]?.config["filePath"]).toBe("iris.csv");

    expect(neutral.connections).toHaveLength(1);
    expect(neutral.connections[0]).toEqual({
      id: "edge-1",
      sourceBlockId: "node-1",
      sourcePortId: "dataset_out",
      targetBlockId: "node-2",
      targetPortId: "dataset_in",
    });
  });

  it("performs a lossless round-trip on the reference Iris MVP graph", () => {
    const originalGraph = createIrisWorkflowMock();

    // Neutral -> React Flow
    const { nodes, edges } = toReactFlowGraph(originalGraph);
    expect(nodes).toHaveLength(Object.keys(originalGraph.blocks).length);
    expect(edges).toHaveLength(originalGraph.connections.length);

    // React Flow -> Neutral
    const reconstructedGraph = toNeutralGraph(nodes, edges, originalGraph.metadata, originalGraph.id, originalGraph.name);

    expect(reconstructedGraph.id).toBe(originalGraph.id);
    expect(reconstructedGraph.name).toBe(originalGraph.name);
    expect(Object.keys(reconstructedGraph.blocks)).toEqual(Object.keys(originalGraph.blocks));

    for (const [id, block] of Object.entries(originalGraph.blocks)) {
      const reconstructedBlock = reconstructedGraph.blocks[id];
      expect(reconstructedBlock?.id).toBe(block.id);
      expect(reconstructedBlock?.definitionId).toBe(block.definitionId);
      expect(reconstructedBlock?.position).toEqual(block.position);
      expect(reconstructedBlock?.config).toEqual(block.config);
    }

    expect(reconstructedGraph.connections).toHaveLength(originalGraph.connections.length);
    for (let i = 0; i < originalGraph.connections.length; i++) {
      expect(reconstructedGraph.connections[i]?.sourceBlockId).toBe(originalGraph.connections[i]?.sourceBlockId);
      expect(reconstructedGraph.connections[i]?.sourcePortId).toBe(originalGraph.connections[i]?.sourcePortId);
      expect(reconstructedGraph.connections[i]?.targetBlockId).toBe(originalGraph.connections[i]?.targetBlockId);
      expect(reconstructedGraph.connections[i]?.targetPortId).toBe(originalGraph.connections[i]?.targetPortId);
    }
  });
});

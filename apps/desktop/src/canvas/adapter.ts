import type { Node, Edge } from "@xyflow/react";
import type {
  WorkflowGraph,
  WorkflowMetadata,
  BlockInstance,
  Connection,
  FlowEdgeData,
  BlockState,
} from "@codebrix/types";

export interface BlockNodeData extends Record<string, unknown> {
  definitionId: string;
  label?: string;
  config: Record<string, unknown>;
  state?: BlockState;
}

export type FlowEdgePayload = FlowEdgeData & Record<string, unknown>;

/**
 * Adapter converting React Flow nodes and edges to neutral WorkflowGraph.
 * This is the ONLY module in Developer 1's system that translates React Flow shapes.
 */
export function toNeutralGraph(
  nodes: Node<BlockNodeData>[],
  edges: Edge<FlowEdgePayload>[],
  metadata?: Partial<WorkflowMetadata>,
  id = "workflow-1",
  name = "CodeBrix Workflow"
): WorkflowGraph {
  const blocks: Record<string, BlockInstance> = {};

  for (const node of nodes) {
    blocks[node.id] = {
      id: node.id,
      definitionId: node.data.definitionId,
      label: node.data.label,
      position: {
        x: Math.round(node.position.x),
        y: Math.round(node.position.y),
      },
      config: node.data.config ?? {},
      state: node.data.state ?? "idle",
    };
  }

  const connections: Connection[] = edges.map((edge) => ({
    id: edge.id,
    sourceBlockId: edge.source,
    sourcePortId: edge.sourceHandle ?? "output",
    targetBlockId: edge.target,
    targetPortId: edge.targetHandle ?? "input",
  }));

  return {
    id,
    name,
    version: "0.1.0",
    blocks,
    connections,
    metadata: {
      name,
      createdAt: metadata?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      codebrixVersion: "0.1.0",
      contractVersion: "0.1.0",
      ...metadata,
    },
  };
}

/**
 * Reverse adapter converting a neutral WorkflowGraph back into React Flow nodes and edges.
 */
export function toReactFlowGraph(graph: WorkflowGraph): {
  nodes: Node<BlockNodeData>[];
  edges: Edge<FlowEdgePayload>[];
} {
  const nodes: Node<BlockNodeData>[] = Object.values(graph.blocks).map((block) => ({
    id: block.id,
    type: "blockNode",
    position: {
      x: block.position.x,
      y: block.position.y,
    },
    data: {
      definitionId: block.definitionId,
      label: block.label ?? block.definitionId,
      config: block.config,
      state: block.state ?? "idle",
    },
  }));

  const edges: Edge<FlowEdgePayload>[] = graph.connections.map((conn) => ({
    id: conn.id,
    source: conn.sourceBlockId,
    sourceHandle: conn.sourcePortId,
    target: conn.targetBlockId,
    targetHandle: conn.targetPortId,
    selectable: true,
    focusable: true,
    interactionWidth: 30,
    data: {
      connectionId: conn.id,
    },
  }));

  return { nodes, edges };
}

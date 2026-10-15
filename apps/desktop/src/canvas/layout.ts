import dagre from "@dagrejs/dagre";
import type { WorkflowGraph, Position2D } from "@codebrix/types";

/**
 * Arranges all blocks in the workflow DAG strictly from left to right as per data flow
 * using Dagre hierarchical graph layout.
 *
 * Parameters:
 * - rankdir: 'LR' (left to right)
 * - ranksep: 130 (horizontal clearance >= 120)
 * - nodesep: 56 (vertical node separation >= 48)
 * - node width: 280px (within 260-300px range)
 * - node height: 160px
 */
export function autoLayoutGraphLeftToRight(graph: WorkflowGraph): Record<string, Position2D> {
  const blockIds = Object.keys(graph.blocks);
  if (blockIds.length === 0) return {};

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "LR",
    align: "UL",
    ranksep: 130,
    nodesep: 56,
    marginx: 60,
    marginy: 60,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const NODE_WIDTH = 280;
  const NODE_HEIGHT = 160;

  // Add nodes to dagre
  for (const id of blockIds) {
    g.setNode(id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  // Add edges to dagre
  for (const conn of graph.connections) {
    if (graph.blocks[conn.sourceBlockId] && graph.blocks[conn.targetBlockId]) {
      g.setEdge(conn.sourceBlockId, conn.targetBlockId);
    }
  }

  dagre.layout(g);

  const positions: Record<string, Position2D> = {};

  for (const id of blockIds) {
    const node = g.node(id);
    if (node) {
      // Dagre calculates center (x, y); React Flow nodes require top-left coordinates
      positions[id] = {
        x: Math.round(node.x - NODE_WIDTH / 2),
        y: Math.round(node.y - NODE_HEIGHT / 2),
      };
    } else {
      positions[id] = graph.blocks[id]?.position || { x: 60, y: 60 };
    }
  }

  return positions;
}

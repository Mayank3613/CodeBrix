import type { WorkflowGraph, Position2D } from "@codebrix/types";

/**
 * Arranges all blocks in the workflow DAG strictly from left to right as per data flow.
 * 
 * Algorithm:
 * 1. Computes in-degree and adjacency for every block.
 * 2. Assigns layers (ranks) starting from root inputs (in-degree 0) at Column 0.
 * 3. Each child node is placed in max(parentLayer) + 1.
 * 4. Nodes within the same column are spaced and vertically centered.
 */
export function autoLayoutGraphLeftToRight(graph: WorkflowGraph): Record<string, Position2D> {
  const blockIds = Object.keys(graph.blocks);
  if (blockIds.length === 0) return {};

  const inDegree: Record<string, number> = {};
  const adj: Record<string, string[]> = {};
  for (const id of blockIds) {
    inDegree[id] = 0;
    adj[id] = [];
  }

  for (const conn of graph.connections) {
    if (graph.blocks[conn.sourceBlockId] && graph.blocks[conn.targetBlockId]) {
      adj[conn.sourceBlockId].push(conn.targetBlockId);
      inDegree[conn.targetBlockId] = (inDegree[conn.targetBlockId] || 0) + 1;
    }
  }

  // 2. Assign layer to each node using topological traversal
  const layer: Record<string, number> = {};
  const queue: string[] = [];

  for (const id of blockIds) {
    if (inDegree[id] === 0) {
      layer[id] = 0;
      queue.push(id);
    }
  }

  // Fallback for cycles or disconnected nodes
  if (queue.length === 0 && blockIds.length > 0) {
    layer[blockIds[0]] = 0;
    queue.push(blockIds[0]);
  }

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const currLayer = layer[curr] ?? 0;

    for (const neighbor of adj[curr] || []) {
      const nextLayer = currLayer + 1;
      if (layer[neighbor] === undefined || nextLayer > layer[neighbor]) {
        layer[neighbor] = nextLayer;
        queue.push(neighbor);
      }
    }
  }

  for (const id of blockIds) {
    if (layer[id] === undefined) {
      layer[id] = 0;
    }
  }

  // 3. Group nodes into layer buckets
  const layerBuckets: Record<number, string[]> = {};
  let maxLayer = 0;
  for (const id of blockIds) {
    const l = layer[id];
    if (l > maxLayer) maxLayer = l;
    if (!layerBuckets[l]) layerBuckets[l] = [];
    layerBuckets[l].push(id);
  }

  // 4. Compute X and Y positions
  const X_SPACING = 310;
  const Y_SPACING = 160;
  const START_X = 60;
  const START_Y = 80;

  let maxNodesInColumn = 1;
  for (let l = 0; l <= maxLayer; l++) {
    const count = layerBuckets[l]?.length || 0;
    if (count > maxNodesInColumn) maxNodesInColumn = count;
  }
  const totalMaxHeight = maxNodesInColumn * Y_SPACING;

  const positions: Record<string, Position2D> = {};

  for (let l = 0; l <= maxLayer; l++) {
    const nodesInCol = layerBuckets[l] || [];
    const colHeight = nodesInCol.length * Y_SPACING;
    const offsetY = START_Y + Math.max(0, (totalMaxHeight - colHeight) / 2);

    nodesInCol.forEach((id, index) => {
      positions[id] = {
        x: Math.round(START_X + l * X_SPACING),
        y: Math.round(offsetY + index * Y_SPACING),
      };
    });
  }

  return positions;
}

import type { WorkflowGraph } from "@codebrix/types";

/**
 * Result from the cycle detector.
 */
export interface CycleDetectionResult {
  /** True if at least one cycle was detected */
  hasCycle: boolean;
  /** Block IDs involved in the detected cycle(s) */
  cycleBlockIds: string[];
  /** Human-readable description of the cycle path(s) */
  cyclePaths: string[][];
}

/**
 * Detects directed cycles in a WorkflowGraph using depth-first search.
 *
 * A valid ML pipeline must be a DAG (Directed Acyclic Graph).
 * This function identifies any cycles and returns the specific block IDs
 * involved so the UI can highlight them.
 *
 * Algorithm: Standard DFS-based cycle detection with three-color marking:
 *   - WHITE (unvisited)
 *   - GRAY  (in current DFS path — if we encounter a GRAY node, we found a cycle)
 *   - BLACK (fully processed)
 */
export function detectCycles(graph: WorkflowGraph): CycleDetectionResult {
  const blockIds = Object.keys(graph.blocks);

  // Build adjacency list: blockId -> [downstream blockIds]
  const adjacency = new Map<string, string[]>();
  for (const id of blockIds) {
    adjacency.set(id, []);
  }
  for (const conn of graph.connections) {
    const neighbors = adjacency.get(conn.sourceBlockId);
    if (neighbors) {
      neighbors.push(conn.targetBlockId);
    }
  }

  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;

  const color = new Map<string, number>();
  for (const id of blockIds) {
    color.set(id, WHITE);
  }

  const parent = new Map<string, string | null>();
  const cycleBlockIds = new Set<string>();
  const cyclePaths: string[][] = [];

  /**
   * Reconstruct cycle path from the DFS parent chain.
   */
  function reconstructCycle(start: string, end: string): string[] {
    const path: string[] = [end];
    let current: string | null | undefined = start;
    while (current && current !== end) {
      path.push(current);
      current = parent.get(current);
    }
    path.push(end);
    path.reverse();
    return path;
  }

  /**
   * DFS visit function.
   */
  function dfs(node: string): boolean {
    color.set(node, GRAY);
    let foundCycle = false;

    const neighbors = adjacency.get(node) ?? [];
    for (const neighbor of neighbors) {
      const neighborColor = color.get(neighbor);

      if (neighborColor === GRAY) {
        // Found a back edge → cycle detected
        foundCycle = true;
        const cyclePath = reconstructCycle(node, neighbor);
        cyclePaths.push(cyclePath);
        for (const id of cyclePath) {
          cycleBlockIds.add(id);
        }
      } else if (neighborColor === WHITE) {
        parent.set(neighbor, node);
        if (dfs(neighbor)) {
          foundCycle = true;
        }
      }
      // BLACK nodes are fully processed, skip
    }

    color.set(node, BLACK);
    return foundCycle;
  }

  // Run DFS from all unvisited nodes
  for (const id of blockIds) {
    if (color.get(id) === WHITE) {
      dfs(id);
    }
  }

  return {
    hasCycle: cycleBlockIds.size > 0,
    cycleBlockIds: Array.from(cycleBlockIds),
    cyclePaths,
  };
}

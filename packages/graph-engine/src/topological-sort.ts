import type { WorkflowGraph, ExecutionPlan, ExecutionStep } from "@codebrix/types";
import { nanoid } from "nanoid";

/**
 * Performs topological sort on a WorkflowGraph using Kahn's algorithm (BFS-based).
 *
 * Returns the block IDs in a valid execution order where every block's
 * dependencies are processed before it runs.
 *
 * @throws Error if the graph contains a cycle (should be caught by validator first).
 */
export function topologicalSort(graph: WorkflowGraph): string[] {
  const blockIds = Object.keys(graph.blocks);

  // Build adjacency list and in-degree map
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const id of blockIds) {
    adjacency.set(id, []);
    inDegree.set(id, 0);
  }

  for (const conn of graph.connections) {
    // Only count edges between blocks that actually exist in the graph
    if (adjacency.has(conn.sourceBlockId) && inDegree.has(conn.targetBlockId)) {
      adjacency.get(conn.sourceBlockId)!.push(conn.targetBlockId);
      inDegree.set(
        conn.targetBlockId,
        (inDegree.get(conn.targetBlockId) ?? 0) + 1
      );
    }
  }

  // Initialize queue with all nodes that have in-degree 0
  const queue: string[] = [];
  for (const [id, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(id);
    }
  }

  const sorted: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    for (const neighbor of adjacency.get(current) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (sorted.length !== blockIds.length) {
    const remaining = blockIds.filter((id) => !sorted.includes(id));
    throw new Error(
      `Cycle detected: cannot topologically sort. Remaining blocks: ${remaining.join(", ")}`
    );
  }

  return sorted;
}

/**
 * Compute the set of direct upstream dependencies for each block.
 */
export function computeDependencies(
  graph: WorkflowGraph
): Map<string, string[]> {
  const deps = new Map<string, string[]>();

  for (const blockId of Object.keys(graph.blocks)) {
    deps.set(blockId, []);
  }

  for (const conn of graph.connections) {
    if (deps.has(conn.targetBlockId)) {
      const blockDeps = deps.get(conn.targetBlockId)!;
      if (!blockDeps.includes(conn.sourceBlockId)) {
        blockDeps.push(conn.sourceBlockId);
      }
    }
  }

  return deps;
}

/**
 * Generate a full ExecutionPlan from a validated WorkflowGraph.
 *
 * The plan contains:
 *   - Topologically sorted execution order
 *   - ExecutionStep for each block with its dependencies
 *   - Unique plan ID and timestamps
 *
 * @param graph - A validated WorkflowGraph (must be a DAG)
 * @returns ExecutionPlan ready for codegen or runtime
 * @throws Error if the graph contains cycles
 */
export function getExecutionPlan(graph: WorkflowGraph): ExecutionPlan {
  const executionOrder = topologicalSort(graph);
  const dependencies = computeDependencies(graph);

  const steps: ExecutionStep[] = executionOrder.map((blockId, index) => ({
    stepId: `step-${index + 1}`,
    blockId,
    order: index,
    dependencies: dependencies.get(blockId) ?? [],
  }));

  return {
    planId: `plan-${nanoid(8)}`,
    workflowId: graph.id,
    steps,
    executionOrder,
    createdAt: new Date().toISOString(),
  };
}

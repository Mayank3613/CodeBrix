import { describe, it, expect } from "vitest";
import type { WorkflowGraph } from "@codebrix/types";
import { detectCycles } from "../cycle-detector.js";

/**
 * Helper to build minimal WorkflowGraph fixtures for cycle tests.
 */
function makeGraph(
  blockIds: string[],
  edges: Array<[string, string]>
): WorkflowGraph {
  const blocks: WorkflowGraph["blocks"] = {};
  for (const id of blockIds) {
    blocks[id] = {
      id,
      definitionId: "mock.block",
      position: { x: 0, y: 0 },
      config: {},
    };
  }

  const connections = edges.map(([src, tgt], i) => ({
    id: `e${i}`,
    sourceBlockId: src,
    sourcePortId: "out",
    targetBlockId: tgt,
    targetPortId: "in",
  }));

  return {
    id: "test-graph",
    name: "Test",
    version: "0.1.0",
    blocks,
    connections,
  };
}

describe("CycleDetector", () => {
  it("should detect no cycles in a simple linear DAG", () => {
    //  A → B → C
    const graph = makeGraph(["A", "B", "C"], [
      ["A", "B"],
      ["B", "C"],
    ]);

    const result = detectCycles(graph);
    expect(result.hasCycle).toBe(false);
    expect(result.cycleBlockIds).toHaveLength(0);
    expect(result.cyclePaths).toHaveLength(0);
  });

  it("should detect no cycles in a diamond DAG", () => {
    //     A
    //    / \
    //   B   C
    //    \ /
    //     D
    const graph = makeGraph(["A", "B", "C", "D"], [
      ["A", "B"],
      ["A", "C"],
      ["B", "D"],
      ["C", "D"],
    ]);

    const result = detectCycles(graph);
    expect(result.hasCycle).toBe(false);
  });

  it("should detect a simple 2-node cycle", () => {
    //  A → B → A
    const graph = makeGraph(["A", "B"], [
      ["A", "B"],
      ["B", "A"],
    ]);

    const result = detectCycles(graph);
    expect(result.hasCycle).toBe(true);
    expect(result.cycleBlockIds).toContain("A");
    expect(result.cycleBlockIds).toContain("B");
  });

  it("should detect a 3-node cycle", () => {
    //  A → B → C → A
    const graph = makeGraph(["A", "B", "C"], [
      ["A", "B"],
      ["B", "C"],
      ["C", "A"],
    ]);

    const result = detectCycles(graph);
    expect(result.hasCycle).toBe(true);
    expect(result.cycleBlockIds.length).toBeGreaterThanOrEqual(3);
    expect(result.cyclePaths.length).toBeGreaterThanOrEqual(1);
  });

  it("should detect a self-loop", () => {
    //  A → A
    const graph = makeGraph(["A"], [["A", "A"]]);

    const result = detectCycles(graph);
    expect(result.hasCycle).toBe(true);
    expect(result.cycleBlockIds).toContain("A");
  });

  it("should detect no cycles in a single node with no edges", () => {
    const graph = makeGraph(["A"], []);

    const result = detectCycles(graph);
    expect(result.hasCycle).toBe(false);
  });

  it("should detect no cycles in an empty graph", () => {
    const graph = makeGraph([], []);

    const result = detectCycles(graph);
    expect(result.hasCycle).toBe(false);
  });

  it("should detect cycles in a complex graph with a mix of DAG and cycle", () => {
    //  A → B → C → D (DAG part)
    //      B → E → B (cycle in E → B)
    const graph = makeGraph(["A", "B", "C", "D", "E"], [
      ["A", "B"],
      ["B", "C"],
      ["C", "D"],
      ["B", "E"],
      ["E", "B"],
    ]);

    const result = detectCycles(graph);
    expect(result.hasCycle).toBe(true);
    expect(result.cycleBlockIds).toContain("B");
    expect(result.cycleBlockIds).toContain("E");
  });
});

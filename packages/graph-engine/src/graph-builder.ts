import type {
  BlockInstance,
  Connection,
  WorkflowGraph,
  Position2D,
} from "@codebrix/types";
import { nanoid } from "nanoid";

/**
 * CanvasNode: Simplified representation of a node on the React Flow canvas.
 * This is the bridge between the UI layer (Developer 1) and the graph engine.
 */
export interface CanvasNode {
  /** Block instance ID (React Flow node ID) */
  id: string;
  /** Reference to the block definition */
  definitionId: string;
  /** User label */
  label?: string;
  /** Canvas position */
  position: Position2D;
  /** User-configured parameters */
  config: Record<string, unknown>;
}

/**
 * CanvasEdge: Simplified representation of an edge on the React Flow canvas.
 */
export interface CanvasEdge {
  /** Edge ID (React Flow edge ID) */
  id: string;
  /** Source node ID */
  source: string;
  /** Source handle/port ID */
  sourceHandle: string;
  /** Target node ID */
  target: string;
  /** Target handle/port ID */
  targetHandle: string;
}

/**
 * GraphBuilder: Constructs a validated WorkflowGraph from raw canvas nodes and edges.
 *
 * This class bridges Developer 1's React Flow canvas representation
 * with the internal WorkflowGraph model used by the validator, codegen,
 * and execution layers.
 */
export class GraphBuilder {
  private nodes: CanvasNode[] = [];
  private edges: CanvasEdge[] = [];
  private workflowId?: string;
  private workflowName = "Untitled Workflow";
  private workflowDescription = "";

  constructor(id?: string, name?: string) {
    if (id) this.workflowId = id;
    if (name) this.workflowName = name;
  }

  /**
   * Set the workflow name.
   */
  setName(name: string): GraphBuilder {
    this.workflowName = name;
    return this;
  }

  /**
   * Set the workflow description.
   */
  setDescription(description: string): GraphBuilder {
    this.workflowDescription = description;
    return this;
  }

  /**
   * Add a single canvas node.
   */
  addNode(node: CanvasNode): GraphBuilder {
    this.nodes.push(node);
    return this;
  }

  /**
   * Add multiple canvas nodes.
   */
  addNodes(nodes: CanvasNode[]): GraphBuilder {
    this.nodes.push(...nodes);
    return this;
  }

  /**
   * Fluent helper: Add a block with simplified arguments.
   */
  addBlock(
    id: string,
    definitionId: string,
    label?: string,
    position?: Position2D,
    config: Record<string, unknown> = {}
  ): GraphBuilder {
    this.nodes.push({
      id,
      definitionId,
      label,
      position: position ?? { x: 0, y: 0 },
      config,
    });
    return this;
  }

  /**
   * Add a single canvas edge.
   */
  addEdge(edge: CanvasEdge): GraphBuilder {
    this.edges.push(edge);
    return this;
  }

  /**
   * Add multiple canvas edges.
   */
  addEdges(edges: CanvasEdge[]): GraphBuilder {
    this.edges.push(...edges);
    return this;
  }

  /**
   * Fluent helper: Connect two block ports directly.
   */
  connect(
    sourceBlockId: string,
    sourcePortId: string,
    targetBlockId: string,
    targetPortId: string,
    id?: string
  ): GraphBuilder {
    this.edges.push({
      id: id ?? `edge-${nanoid(6)}`,
      source: sourceBlockId,
      sourceHandle: sourcePortId,
      target: targetBlockId,
      targetHandle: targetPortId,
    });
    return this;
  }

  /**
   * Reset builder to initial empty state.
   */
  reset(): GraphBuilder {
    this.nodes = [];
    this.edges = [];
    this.workflowId = undefined;
    this.workflowName = "Untitled Workflow";
    this.workflowDescription = "";
    return this;
  }

  /**
   * Build the WorkflowGraph from all added nodes and edges.
   *
   * This converts the flat React Flow representation into the nested
   * WorkflowGraph model with blocks map and connection array.
   */
  build(): WorkflowGraph {
    const blocks: Record<string, BlockInstance> = {};

    for (const node of this.nodes) {
      blocks[node.id] = {
        id: node.id,
        definitionId: node.definitionId,
        label: node.label,
        position: { ...node.position },
        config: { ...node.config },
        state: "idle",
      };
    }

    const connections: Connection[] = this.edges.map((edge) => ({
      id: edge.id,
      sourceBlockId: edge.source,
      sourcePortId: edge.sourceHandle,
      targetBlockId: edge.target,
      targetPortId: edge.targetHandle,
    }));

    const now = new Date().toISOString();

    return {
      id: this.workflowId ?? `wf-${nanoid(8)}`,
      name: this.workflowName,
      version: "0.1.0",
      description: this.workflowDescription,
      blocks,
      connections,
      metadata: {
        name: this.workflowName,
        createdAt: now,
        updatedAt: now,
        codebrixVersion: "0.1.0",
        contractVersion: "0.1.0",
      },
    };
  }

  /**
   * Static factory: Build a WorkflowGraph directly from nodes and edges arrays.
   */
  static fromCanvas(
    nodes: CanvasNode[],
    edges: CanvasEdge[],
    name?: string
  ): WorkflowGraph {
    const builder = new GraphBuilder();
    if (name) builder.setName(name);
    builder.addNodes(nodes);
    builder.addEdges(edges);
    return builder.build();
  }
}

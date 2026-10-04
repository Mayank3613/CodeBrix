import type { BlockInstance } from "./blocks.js";
import type { Connection } from "./connections.js";

/**
 * Metadata associated with a CodeBrix project / workflow.
 */
export interface WorkflowMetadata {
  name: string;
  description?: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
  codebrixVersion: string;
  contractVersion: string;
  tags?: string[];
  [key: string]: unknown;
}

/**
 * WorkflowGraph: The central data model representing the entire DAG of blocks
 * and connections, independent of canvas rendering details.
 */
export interface WorkflowGraph {
  /** Unique project/workflow identifier */
  id: string;
  /** Workflow display name */
  name: string;
  /** Schema/graph format version (e.g. '0.1.0') */
  version: string;
  /** Description or goal of this workflow */
  description?: string;
  /** Map of block instance ID -> BlockInstance */
  blocks: Record<string, BlockInstance>;
  /** Directed connections between blocks */
  connections: Connection[];
  /** Project metadata */
  metadata?: WorkflowMetadata;
}

/**
 * Serialized .cbx project file schema representation.
 */
export interface CbxProjectFile {
  format: "codebrix-project";
  schemaVersion: "0.1.0";
  graph: WorkflowGraph;
  canvasViewport?: {
    x: number;
    y: number;
    zoom: number;
  };
  environment?: {
    pythonVersion?: string;
    requirements?: string[];
  };
}

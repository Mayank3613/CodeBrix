import type { OutputMessage } from "./output.js";

/**
 * Execution overall lifecycle status.
 */
export type ExecutionStatus =
  | "idle"
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "aborted";

/**
 * An individual resolved step in the topological execution sequence.
 */
export interface ExecutionStep {
  /** Unique ID for this step */
  stepId: string;
  /** ID of the block being executed */
  blockId: string;
  /** Sequence index (0-based) */
  order: number;
  /** List of block IDs that must complete before this step can run */
  dependencies: string[];
  /** Optional Python code snippet generated for this specific step */
  codeSnippet?: string;
  /** Additional metadata or variable mappings */
  metadata?: Record<string, unknown>;
}

/**
 * ExecutionPlan: The ordered topological DAG plan ready for Python codegen or runner.
 */
export interface ExecutionPlan {
  /** Unique execution plan identifier */
  planId: string;
  /** Originating workflow ID */
  workflowId: string;
  /** Ordered list of steps */
  steps: ExecutionStep[];
  /** Resolved linear topological block ID sequence */
  executionOrder: string[];
  /** Timestamp when plan was created */
  createdAt: string;
}

/**
 * Execution status for an individual block during runtime.
 */
export interface BlockExecutionStatus {
  blockId: string;
  status: ExecutionStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
  logs?: string[];
}

/**
 * ExecutionResult: Summary of execution outcome returned to UI and tests.
 */
export interface ExecutionResult {
  /** Unique execution session ID */
  executionId: string;
  /** ID of workflow that ran */
  workflowId: string;
  /** Overall terminal status */
  status: ExecutionStatus;
  /** ISO timestamp started */
  startedAt: string;
  /** ISO timestamp completed */
  completedAt?: string;
  /** Total elapsed time in milliseconds */
  durationMs?: number;
  /** Subprocess exit code (0 for success) */
  exitCode?: number;
  /** Per-block execution statuses (used for canvas node state/coloring) */
  blockResults: Record<string, BlockExecutionStatus>;
  /** Structured output messages captured during execution */
  outputs: OutputMessage[];
  /** High-level execution failure details if status is 'failed' */
  error?: {
    blockId?: string;
    message: string;
    stack?: string;
    traceback?: string;
  };
}

import type {
  ExecutionStatus,
  ExecutionResult,
  BlockExecutionStatus,
  OutputMessage,
} from "@codebrix/types";

/**
 * Information about a discovered Python execution environment.
 */
export interface PythonEnvironment {
  /** Path to the python executable (e.g. C:\path\to\.venv\Scripts\python.exe) */
  executable: string;
  /** Python version string (e.g. "3.11.8") */
  version: string;
  /** Whether this is a virtual environment (.venv) */
  isVenv: boolean;
  /** Working directory the detection was rooted in */
  cwd: string;
}

/**
 * Options configuring a Python script execution session.
 */
export interface ExecuteOptions {
  /** Python script content to execute */
  script: string;
  /** Optional workflow identifier */
  workflowId?: string;
  /** Custom working directory (defaults to process.cwd()) */
  cwd?: string;
  /** Maximum execution duration before timing out (milliseconds, default 60000) */
  timeoutMs?: number;
  /** Additional environment variables passed to the Python process */
  env?: Record<string, string>;
  /** Callback fired for every parsed OutputMessage (console, metrics, table, etc.) */
  onOutput?: (msg: OutputMessage) => void;
  /** Callback fired when overall status changes */
  onStatus?: (status: ExecutionStatus) => void;
  /** Callback fired when an individual block's status changes */
  onBlockStatus?: (blockId: string, status: BlockExecutionStatus) => void;
}

/**
 * Types of lifecycle control events emitted by CodeBrix scripts.
 */
export type ControlEventType =
  | "status"
  | "block_start"
  | "block_done"
  | "block_error"
  | "done"
  | "error";

/**
 * Protocol envelope for lifecycle control events.
 */
export interface ControlEvent {
  event: ControlEventType;
  payload?: unknown;
  timestamp?: string;
}

/**
 * Unified result of parsing a raw stdout or stderr line.
 */
export interface ParsedProtocolLine {
  isControl: boolean;
  controlEvent?: ControlEvent;
  outputMessage?: OutputMessage;
}

/**
 * Abstract interface for a Python runtime.
 */
export interface IPythonRuntime {
  /** Detect and return the active Python environment */
  discover(): Promise<PythonEnvironment>;

  /** Execute a Python script with streaming output and lifecycle tracking */
  execute(options: ExecuteOptions): Promise<ExecutionResult>;

  /** Stop/terminate a currently running execution session */
  stop(executionId: string): Promise<void>;
}

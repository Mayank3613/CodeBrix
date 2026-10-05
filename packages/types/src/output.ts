/**
 * Output channels supported by the CodeBrix output panel.
 */
export type OutputChannel =
  | "console"
  | "table"
  | "metrics"
  | "image"
  | "error";

/**
 * Standard console text stream event (stdout or stderr).
 */
export interface ConsoleOutputMessage {
  type: "console";
  stream: "stdout" | "stderr";
  text: string;
  blockId?: string;
  timestamp: string;
}

/**
 * Tabular dataset preview for DataFrames or loaded datasets.
 */
export interface TableOutputMessage {
  type: "table";
  title?: string;
  blockId?: string;
  columns: string[];
  rows: Array<Array<string | number | boolean | null>>;
  totalRows?: number;
  totalColumns?: number;
  shape?: [number, number];
  timestamp: string;
}

/**
 * Key-value metrics event (e.g. accuracy: 0.96, precision, recall, loss).
 */
export interface MetricsOutputMessage {
  type: "metrics";
  title?: string;
  blockId?: string;
  metrics: Record<string, number | string | boolean | unknown[]>;
  timestamp: string;
}

/**
 * Visual plot event: Plotly JSON, Confusion Matrix, Feature Importance, PNG/SVG base64.
 */
export interface ImageOutputMessage {
  type: "image";
  title?: string;
  blockId?: string;
  format: "png" | "svg" | "base64" | "plotly" | "confusion_matrix" | "feature_importance";
  /** Base64 string, SVG markup, or stringified Plotly spec JSON */
  data: string;
  caption?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Runtime error or traceback event.
 */
export interface ErrorOutputMessage {
  type: "error";
  message: string;
  blockId?: string;
  traceback?: string;
  timestamp: string;
}

/**
 * Discriminated union of all output messages streamed from the Python runtime
 * to the output engine.
 */
export type OutputMessage =
  | ConsoleOutputMessage
  | TableOutputMessage
  | MetricsOutputMessage
  | ImageOutputMessage
  | ErrorOutputMessage;

/**
 * Streaming protocol envelope emitted by the Python runtime spike and process manager.
 */
export interface RuntimeEventEnvelope {
  event: "status" | "output" | "progress" | "done" | "error";
  executionId?: string;
  blockId?: string;
  payload: unknown;
  timestamp: string;
}

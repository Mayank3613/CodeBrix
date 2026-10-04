import type { BlockInstance } from "@codebrix/types";

/**
 * Options configuring Python code generation.
 */
export interface CodegenOptions {
  /**
   * Whether to inject CodeBrix runtime JSON protocol hooks
   * (emit_json status, console, and metrics lines).
   * Default: true.
   */
  includeProtocolHooks?: boolean;

  /**
   * Whether to include human-readable section comments and docstrings.
   * Default: true.
   */
  includeComments?: boolean;

  /**
   * Target Python version string.
   * Default: "3.11"
   */
  targetPythonVersion?: string;

  /**
   * Number of indentation spaces.
   * Default: 4
   */
  indentSpaces?: number;
}

/**
 * Context provided to a block generator to render its Python snippet.
 */
export interface BlockCodeContext {
  /** The block instance configuration and metadata */
  block: BlockInstance;

  /**
   * Mapping from this block's input port ID to the upstream Python variable name.
   * E.g. { "dataset_in": "var_blk_csv_dataset_out" }
   */
  inputs: Record<string, string>;

  /**
   * Mapping from this block's output port ID to the assigned Python variable name.
   * E.g. { "train_data_out": "var_blk_split_train_data_out", "y_test_out": "var_blk_split_y_test_out" }
   */
  outputs: Record<string, string>;

  /** Code generation options */
  options: Required<CodegenOptions>;
}

/**
 * Result of generating code for an individual block.
 */
export interface BlockCodeResult {
  /** Top-level Python imports required by this block */
  imports: string[];

  /** Python code statements executing this block */
  code: string;
}

/**
 * Interface that all block-specific code generators must implement.
 */
export interface BlockCodeGenerator {
  /** The block definition ID this generator handles (e.g. "data.csv_loader") */
  readonly definitionId: string;

  /** Generate Python code for a specific block instance */
  generate(context: BlockCodeContext): BlockCodeResult;
}

/**
 * Generated script output containing the full Python code and metadata.
 */
export interface GeneratedScript {
  /** Complete standalone Python script */
  code: string;

  /** Workflow ID this script was generated from */
  workflowId: string;

  /** Topologically ordered block IDs included in the script */
  executionOrder: string[];

  /** Timestamp of generation */
  generatedAt: string;
}

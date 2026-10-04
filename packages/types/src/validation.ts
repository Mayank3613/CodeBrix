/**
 * Severity level of validation messages.
 */
export type ValidationSeverity = "error" | "warning" | "info";

/**
 * Individual validation issue identifying block, port, or connection problem.
 */
export interface ValidationError {
  /** Error code for programmatic handling */
  code:
    | "CYCLE_DETECTED"
    | "MISSING_REQUIRED_INPUT"
    | "INCOMPATIBLE_PORT_TYPES"
    | "UNKNOWN_BLOCK_DEFINITION"
    | "INVALID_BLOCK_CONFIG"
    | "DANGLING_CONNECTION"
    | "DUPLICATE_PORT_CONNECTION"
    | "INVALID_TOPOLOGY"
    | "CUSTOM_VALIDATION_ERROR";
  /** Human-readable explanation */
  message: string;
  /** Severity level */
  severity: ValidationSeverity;
  /** Associated block ID if error pertains to a specific block (used for UI highlighting) */
  blockId?: string;
  /** Associated port ID if error is localized to a port */
  portId?: string;
  /** Associated connection ID if error is edge-specific */
  connectionId?: string;
}

/**
 * ValidationResult: Output of the graph validator engine.
 */
export interface ValidationResult {
  /** True only if there are zero errors (warnings allowed) */
  valid: boolean;
  /** List of blocking errors */
  errors: ValidationError[];
  /** List of non-blocking warnings */
  warnings: ValidationError[];
}

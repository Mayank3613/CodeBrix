import type { WorkflowGraph } from "@codebrix/types";

/**
 * Sanitizes an arbitrary string into a valid Python identifier segment.
 */
export function sanitizePythonIdentifier(name: string): string {
  // Replace non-alphanumeric chars with underscore
  let sanitized = name.replace(/[^a-zA-Z0-9_]/g, "_");
  // If starts with digit, prepend an underscore
  if (/^[0-9]/.test(sanitized)) {
    sanitized = `_${sanitized}`;
  }
  // Deduplicate consecutive underscores
  sanitized = sanitized.replace(/_+/g, "_");
  return sanitized;
}

/**
 * Generates an unambiguous, PEP-8 compliant Python variable name
 * for an output port of a given block instance.
 */
export function getOutputVariableName(blockId: string, portId: string): string {
  const cleanBlock = sanitizePythonIdentifier(blockId);
  const cleanPort = sanitizePythonIdentifier(portId);
  return `var_${cleanBlock}_${cleanPort}`;
}

/**
 * Resolves the inputs and outputs variable mapping for all blocks in a workflow.
 */
export class VariableResolver {
  /**
   * For a given block, resolves:
   * - `inputs`: Record<portId, pythonVariableName>
   * - `outputs`: Record<portId, pythonVariableName>
   */
  resolveForBlock(
    blockId: string,
    graph: WorkflowGraph
  ): { inputs: Record<string, string>; outputs: Record<string, string> } {
    const inputs: Record<string, string> = {};
    const outputs: Record<string, string> = {};

    // 1. Resolve inputs from incoming connections
    for (const conn of graph.connections) {
      if (conn.targetBlockId === blockId) {
        const sourceVar = getOutputVariableName(
          conn.sourceBlockId,
          conn.sourcePortId
        );
        inputs[conn.targetPortId] = sourceVar;
      }
    }

    // 2. Resolve outputs from outgoing connections or default for block definition
    for (const conn of graph.connections) {
      if (conn.sourceBlockId === blockId) {
        outputs[conn.sourcePortId] = getOutputVariableName(
          blockId,
          conn.sourcePortId
        );
      }
    }

    return { inputs, outputs };
  }
}

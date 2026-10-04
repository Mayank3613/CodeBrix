import type {
  WorkflowGraph,
  ValidationResult,
  ValidationError,
  Connection,
} from "@codebrix/types";
import { isCompatiblePortType } from "@codebrix/shared";
import { BlockDefinitionRegistry } from "./registry.js";
import { detectCycles } from "./cycle-detector.js";

/**
 * GraphValidator: Validates a WorkflowGraph against block definitions,
 * port contracts, connection rules, and DAG topology.
 *
 * Produces a ValidationResult with errors and warnings that map directly
 * to UI highlighting (each error carries blockId, portId, or connectionId).
 */
export class GraphValidator {
  constructor(private readonly registry: BlockDefinitionRegistry) {}

  /**
   * Run full validation on a WorkflowGraph.
   *
   * Checks performed (in order):
   *   1. Empty graph check
   *   2. Unknown block definitions
   *   3. Dangling connections (references to non-existent blocks or ports)
   *   4. Duplicate connections to single-input ports
   *   5. Required input ports not connected
   *   6. Port type compatibility on each connection
   *   7. Cycle detection (DAG enforcement)
   */
  validate(graph: WorkflowGraph): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    const blockIds = Object.keys(graph.blocks);

    // 1. Empty graph
    if (blockIds.length === 0) {
      errors.push({
        code: "INVALID_TOPOLOGY",
        message: "Workflow graph contains no blocks.",
        severity: "error",
      });
      return { valid: false, errors, warnings };
    }

    // 2. Unknown block definitions
    for (const blockId of blockIds) {
      const block = graph.blocks[blockId]!;
      if (!this.registry.has(block.definitionId)) {
        errors.push({
          code: "UNKNOWN_BLOCK_DEFINITION",
          message: `Block "${block.label ?? blockId}" references unknown definition "${block.definitionId}".`,
          severity: "error",
          blockId,
        });
      }
    }

    // 3. Dangling connections
    for (const conn of graph.connections) {
      const danglingErrors = this.validateConnectionEndpoints(conn, graph);
      errors.push(...danglingErrors);
    }

    // 4. Duplicate connections to single-input ports
    const duplicateErrors = this.checkDuplicateInputConnections(graph);
    errors.push(...duplicateErrors);

    // 5. Required input ports not connected
    const missingInputErrors = this.checkRequiredInputs(graph);
    errors.push(...missingInputErrors);

    // 6. Port type compatibility
    const typeErrors = this.checkPortTypeCompatibility(graph);
    errors.push(...typeErrors);

    // 7. Cycle detection
    const cycleResult = detectCycles(graph);
    if (cycleResult.hasCycle) {
      for (const cyclePath of cycleResult.cyclePaths) {
        errors.push({
          code: "CYCLE_DETECTED",
          message: `Cycle detected: ${cyclePath.join(" → ")}. Workflow must be a DAG.`,
          severity: "error",
          blockId: cyclePath[0],
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate that a connection's source and target blocks/ports exist.
   */
  private validateConnectionEndpoints(
    conn: Connection,
    graph: WorkflowGraph
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check source block exists
    if (!graph.blocks[conn.sourceBlockId]) {
      errors.push({
        code: "DANGLING_CONNECTION",
        message: `Connection "${conn.id}" references non-existent source block "${conn.sourceBlockId}".`,
        severity: "error",
        connectionId: conn.id,
      });
      return errors; // Can't check ports if block doesn't exist
    }

    // Check target block exists
    if (!graph.blocks[conn.targetBlockId]) {
      errors.push({
        code: "DANGLING_CONNECTION",
        message: `Connection "${conn.id}" references non-existent target block "${conn.targetBlockId}".`,
        severity: "error",
        connectionId: conn.id,
      });
      return errors;
    }

    // Check source port exists on source block definition
    const sourceBlock = graph.blocks[conn.sourceBlockId]!;
    const sourceDef = this.registry.get(sourceBlock.definitionId);
    if (sourceDef) {
      const sourcePort = sourceDef.outputs.find(
        (p) => p.id === conn.sourcePortId
      );
      if (!sourcePort) {
        errors.push({
          code: "DANGLING_CONNECTION",
          message: `Connection "${conn.id}": source port "${conn.sourcePortId}" does not exist on block "${sourceBlock.label ?? sourceBlock.id}" (${sourceDef.name}).`,
          severity: "error",
          connectionId: conn.id,
          blockId: conn.sourceBlockId,
          portId: conn.sourcePortId,
        });
      }
    }

    // Check target port exists on target block definition
    const targetBlock = graph.blocks[conn.targetBlockId]!;
    const targetDef = this.registry.get(targetBlock.definitionId);
    if (targetDef) {
      const targetPort = targetDef.inputs.find(
        (p) => p.id === conn.targetPortId
      );
      if (!targetPort) {
        errors.push({
          code: "DANGLING_CONNECTION",
          message: `Connection "${conn.id}": target port "${conn.targetPortId}" does not exist on block "${targetBlock.label ?? targetBlock.id}" (${targetDef.name}).`,
          severity: "error",
          connectionId: conn.id,
          blockId: conn.targetBlockId,
          portId: conn.targetPortId,
        });
      }
    }

    return errors;
  }

  /**
   * Check that non-multiple input ports don't have more than one incoming connection.
   */
  private checkDuplicateInputConnections(
    graph: WorkflowGraph
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Map: "targetBlockId:targetPortId" -> connection IDs
    const inputConnections = new Map<string, string[]>();

    for (const conn of graph.connections) {
      const key = `${conn.targetBlockId}:${conn.targetPortId}`;
      const existing = inputConnections.get(key) ?? [];
      existing.push(conn.id);
      inputConnections.set(key, existing);
    }

    for (const [key, connIds] of inputConnections.entries()) {
      if (connIds.length <= 1) continue;

      const [blockId, portId] = key.split(":");
      if (!blockId || !portId) continue;

      const block = graph.blocks[blockId];
      if (!block) continue;

      const def = this.registry.get(block.definitionId);
      if (!def) continue;

      const portDef = def.inputs.find((p) => p.id === portId);
      // If the port supports multiple connections, skip
      if (portDef?.multiple) continue;

      errors.push({
        code: "DUPLICATE_PORT_CONNECTION",
        message: `Port "${portDef?.name ?? portId}" on block "${block.label ?? blockId}" has ${connIds.length} incoming connections but only accepts one.`,
        severity: "error",
        blockId,
        portId,
      });
    }

    return errors;
  }

  /**
   * Check that all required input ports on every block are connected.
   */
  private checkRequiredInputs(graph: WorkflowGraph): ValidationError[] {
    const errors: ValidationError[] = [];

    // Build set of connected input ports: "blockId:portId"
    const connectedInputs = new Set<string>();
    for (const conn of graph.connections) {
      connectedInputs.add(`${conn.targetBlockId}:${conn.targetPortId}`);
    }

    for (const blockId of Object.keys(graph.blocks)) {
      const block = graph.blocks[blockId]!;
      const def = this.registry.get(block.definitionId);
      if (!def) continue; // Unknown definitions already flagged

      for (const input of def.inputs) {
        if (input.required && !connectedInputs.has(`${blockId}:${input.id}`)) {
          errors.push({
            code: "MISSING_REQUIRED_INPUT",
            message: `Required input "${input.name}" on block "${block.label ?? blockId}" (${def.name}) is not connected.`,
            severity: "error",
            blockId,
            portId: input.id,
          });
        }
      }
    }

    return errors;
  }

  /**
   * Check port type compatibility on each connection.
   */
  private checkPortTypeCompatibility(
    graph: WorkflowGraph
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const conn of graph.connections) {
      const sourceBlock = graph.blocks[conn.sourceBlockId];
      const targetBlock = graph.blocks[conn.targetBlockId];
      if (!sourceBlock || !targetBlock) continue;

      const sourceDef = this.registry.get(sourceBlock.definitionId);
      const targetDef = this.registry.get(targetBlock.definitionId);
      if (!sourceDef || !targetDef) continue;

      const sourcePort = sourceDef.outputs.find(
        (p) => p.id === conn.sourcePortId
      );
      const targetPort = targetDef.inputs.find(
        (p) => p.id === conn.targetPortId
      );
      if (!sourcePort || !targetPort) continue; // Already caught by dangling check

      if (!isCompatiblePortType(sourcePort.type, targetPort.type)) {
        errors.push({
          code: "INCOMPATIBLE_PORT_TYPES",
          message: `Type mismatch: "${sourcePort.name}" (${sourcePort.type}) on "${sourceBlock.label ?? sourceBlock.id}" → "${targetPort.name}" (${targetPort.type}) on "${targetBlock.label ?? targetBlock.id}".`,
          severity: "error",
          connectionId: conn.id,
          blockId: conn.targetBlockId,
          portId: conn.targetPortId,
        });
      }
    }

    return errors;
  }
}

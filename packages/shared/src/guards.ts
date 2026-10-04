import type {
  PortType,
  BlockDefinition,
  BlockInstance,
  Connection,
  WorkflowGraph,
  ExecutionResult,
  LibraryManifest,
} from "@codebrix/types";
import { PORT_COMPATIBILITY_MAP } from "./constants.js";

/**
 * Validates if a source port type can connect cleanly to a target port type.
 */
export function isCompatiblePortType(source: PortType, target: PortType): boolean {
  if (source === "any" || target === "any") {
    return true;
  }
  const allowed = PORT_COMPATIBILITY_MAP[source];
  if (!allowed) {
    return source === target;
  }
  return allowed.includes(target);
}

/**
 * Type guard for BlockDefinition objects.
 */
export function isValidBlockDefinition(obj: unknown): obj is BlockDefinition {
  if (typeof obj !== "object" || obj === null) return false;
  const def = obj as Record<string, unknown>;
  return (
    typeof def["id"] === "string" &&
    typeof def["name"] === "string" &&
    typeof def["category"] === "string" &&
    typeof def["version"] === "string" &&
    Array.isArray(def["inputs"]) &&
    Array.isArray(def["outputs"])
  );
}

/**
 * Type guard for BlockInstance objects.
 */
export function isValidBlockInstance(obj: unknown): obj is BlockInstance {
  if (typeof obj !== "object" || obj === null) return false;
  const inst = obj as Record<string, unknown>;
  const pos = inst["position"] as Record<string, unknown> | undefined;
  return (
    typeof inst["id"] === "string" &&
    typeof inst["definitionId"] === "string" &&
    typeof pos === "object" &&
    pos !== null &&
    typeof pos["x"] === "number" &&
    typeof pos["y"] === "number" &&
    typeof inst["config"] === "object" &&
    inst["config"] !== null
  );
}

/**
 * Type guard for Connection objects.
 */
export function isValidConnection(obj: unknown): obj is Connection {
  if (typeof obj !== "object" || obj === null) return false;
  const conn = obj as Record<string, unknown>;
  return (
    typeof conn["id"] === "string" &&
    typeof conn["sourceBlockId"] === "string" &&
    typeof conn["sourcePortId"] === "string" &&
    typeof conn["targetBlockId"] === "string" &&
    typeof conn["targetPortId"] === "string"
  );
}

/**
 * Type guard for WorkflowGraph objects.
 */
export function isValidWorkflowGraph(obj: unknown): obj is WorkflowGraph {
  if (typeof obj !== "object" || obj === null) return false;
  const wf = obj as Record<string, unknown>;
  return (
    typeof wf["id"] === "string" &&
    typeof wf["name"] === "string" &&
    typeof wf["version"] === "string" &&
    typeof wf["blocks"] === "object" &&
    wf["blocks"] !== null &&
    Array.isArray(wf["connections"])
  );
}

/**
 * Type guard for ExecutionResult objects.
 */
export function isValidExecutionResult(obj: unknown): obj is ExecutionResult {
  if (typeof obj !== "object" || obj === null) return false;
  const res = obj as Record<string, unknown>;
  return (
    typeof res["executionId"] === "string" &&
    typeof res["workflowId"] === "string" &&
    typeof res["status"] === "string" &&
    typeof res["startedAt"] === "string" &&
    typeof res["blockResults"] === "object" &&
    res["blockResults"] !== null &&
    Array.isArray(res["outputs"])
  );
}

/**
 * Type guard for LibraryManifest objects (library.json).
 */
export function isValidLibraryManifest(obj: unknown): obj is LibraryManifest {
  if (typeof obj !== "object" || obj === null) return false;
  const manifest = obj as Record<string, unknown>;
  return (
    typeof manifest["name"] === "string" &&
    manifest["name"].trim().length > 0 &&
    typeof manifest["version"] === "string" &&
    manifest["version"].trim().length > 0 &&
    typeof manifest["description"] === "string" &&
    Array.isArray(manifest["blocks"]) &&
    manifest["blocks"].every((b) => typeof b === "string")
  );
}

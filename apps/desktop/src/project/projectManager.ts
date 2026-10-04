import type { CbxProjectFile, WorkflowGraph } from "@codebrix/types";
import { isValidWorkflowGraph } from "@codebrix/shared";

export const SUPPORTED_SCHEMA_VERSION = "0.1.0";

export interface ParseProjectResult {
  success: boolean;
  project?: CbxProjectFile;
  error?: string;
}

/**
 * Serializes a WorkflowGraph and canvas viewport into a standard .cbx JSON string.
 */
export function serializeCbxProject(
  graph: WorkflowGraph,
  viewport?: { x: number; y: number; zoom: number }
): string {
  const project: CbxProjectFile = {
    format: "codebrix-project",
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    graph: {
      ...graph,
      metadata: {
        ...graph.metadata,
        name: graph.name || "Untitled Project",
        createdAt: graph.metadata?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        codebrixVersion: "0.1.0",
        contractVersion: "0.1.0",
      },
    },
    canvasViewport: viewport ?? { x: 0, y: 0, zoom: 1 },
    environment: {
      pythonVersion: ">=3.11",
      requirements: ["pandas>=2.0.0", "scikit-learn>=1.3.0"],
    },
  };

  return JSON.stringify(project, null, 2);
}

/**
 * Parses and validates a raw .cbx file content string.
 * Fails safely with clear error messages on malformed, corrupt, or newer format versions.
 */
export function parseCbxProject(rawJson: string): ParseProjectResult {
  if (!rawJson || typeof rawJson !== "string") {
    return { success: false, error: "Project file is empty or invalid" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { success: false, error: "Invalid project file: Malformed JSON syntax" };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { success: false, error: "Invalid project file structure" };
  }

  const record = parsed as Record<string, unknown>;

  if (record["format"] !== "codebrix-project") {
    return {
      success: false,
      error: `Invalid file format: Expected 'codebrix-project', received '${String(record["format"])}'`,
    };
  }

  if (record["schemaVersion"] !== SUPPORTED_SCHEMA_VERSION) {
    return {
      success: false,
      error: `Incompatible project version: This version of CodeBrix only supports schema version '${SUPPORTED_SCHEMA_VERSION}', but file specifies '${String(record["schemaVersion"])}'`,
    };
  }

  if (!isValidWorkflowGraph(record["graph"])) {
    return {
      success: false,
      error: "Corrupt project file: Workflow graph is missing or has an invalid structure",
    };
  }

  return {
    success: true,
    project: parsed as CbxProjectFile,
  };
}

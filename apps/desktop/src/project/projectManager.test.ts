import { describe, it, expect } from "vitest";
import { serializeCbxProject, parseCbxProject, SUPPORTED_SCHEMA_VERSION } from "./projectManager";
import { createIrisWorkflowMock } from "@codebrix/shared";

describe("projectManager (.cbx serialization and parsing)", () => {
  const mockGraph = createIrisWorkflowMock();

  it("serializes and parses a valid project cleanly (round-trip)", () => {
    const serialized = serializeCbxProject(mockGraph, { x: 10, y: 20, zoom: 1.5 });
    expect(serialized).toContain('"format": "codebrix-project"');
    expect(serialized).toContain(`"schemaVersion": "${SUPPORTED_SCHEMA_VERSION}"`);

    const parsed = parseCbxProject(serialized);
    expect(parsed.success).toBe(true);
    expect(parsed.project).toBeDefined();
    expect(parsed.project?.format).toBe("codebrix-project");
    expect(parsed.project?.schemaVersion).toBe("0.1.0");
    expect(parsed.project?.graph.blocks["blk-csv"]).toBeDefined();
    expect(parsed.project?.canvasViewport).toEqual({ x: 10, y: 20, zoom: 1.5 });
  });

  it("fails safely on malformed JSON", () => {
    const parsed = parseCbxProject("{ invalid-json ");
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain("Malformed JSON syntax");
  });

  it("fails safely on invalid format identifier", () => {
    const badFormat = JSON.stringify({
      format: "unknown-tool",
      schemaVersion: "0.1.0",
      graph: mockGraph,
    });
    const parsed = parseCbxProject(badFormat);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain("Invalid file format");
  });

  it("fails safely on incompatible/newer schema versions without crashing", () => {
    const newerVersion = JSON.stringify({
      format: "codebrix-project",
      schemaVersion: "99.0.0",
      graph: mockGraph,
    });
    const parsed = parseCbxProject(newerVersion);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain("Incompatible project version");
    expect(parsed.error).toContain("99.0.0");
  });

  it("fails safely on corrupt workflow graph", () => {
    const corruptGraph = JSON.stringify({
      format: "codebrix-project",
      schemaVersion: "0.1.0",
      graph: { invalid: true },
    });
    const parsed = parseCbxProject(corruptGraph);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain("Corrupt project file");
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import {
  BlockRegistry,
  DuplicateBlockError,
  InvalidBlockDefinitionError,
} from "./BlockRegistry";
import type { BlockDefinition } from "@codebrix/types";

describe("BlockRegistry (D1-1.3)", () => {
  let registry: BlockRegistry;

  const sampleDefinition: BlockDefinition = {
    id: "data.csv_reader",
    name: "CSV Reader",
    category: "data",
    version: "0.1.0",
    description: "Reads tabular data from CSV files",
    inputs: [],
    outputs: [
      {
        id: "df_out",
        name: "DataFrame",
        type: "dataframe",
        direction: "output",
      },
    ],
    configSchema: {
      filePath: {
        name: "filePath",
        label: "File Path",
        type: "string",
        required: true,
      },
      hasHeader: {
        name: "hasHeader",
        label: "Has Header",
        type: "boolean",
        defaultValue: true,
      },
      chunkSize: {
        name: "chunkSize",
        label: "Chunk Size",
        type: "number",
        min: 1,
        max: 10000,
      },
    },
    tags: ["csv", "pandas", "data"],
  };

  beforeEach(() => {
    registry = new BlockRegistry();
  });

  it("registers a valid BlockDefinition cleanly", () => {
    registry.register(sampleDefinition);
    expect(registry.has("data.csv_reader")).toBe(true);
    expect(registry.get("data.csv_reader")?.name).toBe("CSV Reader");
    expect(registry.list()).toHaveLength(1);
  });

  it("throws DuplicateBlockError when registering duplicate IDs", () => {
    registry.register(sampleDefinition);
    expect(() => registry.register(sampleDefinition)).toThrow(DuplicateBlockError);
  });

  it("throws InvalidBlockDefinitionError for malformed definitions", () => {
    const invalid = { id: "bad.block" } as unknown as BlockDefinition;
    expect(() => registry.register(invalid)).toThrow(InvalidBlockDefinitionError);
  });

  it("filters definitions by category", () => {
    registry.register(sampleDefinition);
    registry.register({
      ...sampleDefinition,
      id: "ml.random_forest",
      name: "Random Forest",
      category: "ml",
    });

    const dataBlocks = registry.listByCategory("data");
    expect(dataBlocks).toHaveLength(1);
    expect(dataBlocks[0]?.id).toBe("data.csv_reader");

    const mlBlocks = registry.listByCategory("ml");
    expect(mlBlocks).toHaveLength(1);
    expect(mlBlocks[0]?.id).toBe("ml.random_forest");
  });

  it("searches blocks by query across name, description, and tags", () => {
    registry.register(sampleDefinition);
    registry.register({
      ...sampleDefinition,
      id: "data.json_reader",
      name: "JSON Loader",
      description: "Load JSON objects",
      tags: ["json", "dict"],
    });

    expect(registry.search("csv")).toHaveLength(1);
    expect(registry.search("json")).toHaveLength(1);
    expect(registry.search("loader")).toHaveLength(1);
    expect(registry.search("pandas")).toHaveLength(1);
    expect(registry.search("nonexistent")).toHaveLength(0);
  });

  it("validates configuration against configSchema", () => {
    registry.register(sampleDefinition);

    // Missing required field
    const res1 = registry.validateConfig("data.csv_reader", {});
    expect(res1.valid).toBe(false);
    expect(res1.errors[0]).toContain("File Path");

    // Invalid type
    const res2 = registry.validateConfig("data.csv_reader", {
      filePath: "data.csv",
      hasHeader: "not-a-boolean",
    });
    expect(res2.valid).toBe(false);

    // Number min out of range
    const res3 = registry.validateConfig("data.csv_reader", {
      filePath: "data.csv",
      chunkSize: 0, // min is 1
    });
    expect(res3.valid).toBe(false);
    expect(res3.errors[0]).toContain(">= 1");

    // Valid configuration
    const res4 = registry.validateConfig("data.csv_reader", {
      filePath: "data.csv",
      hasHeader: true,
      chunkSize: 500,
    });
    expect(res4.valid).toBe(true);
    expect(res4.errors).toHaveLength(0);
  });

  it("checks port compatibility with the shared compatibility map", () => {
    // dataframe -> dataframe is compatible
    expect(registry.checkPortCompatibility("dataframe", "dataframe")).toBe(true);
    // dataframe -> dataset is compatible
    expect(registry.checkPortCompatibility("dataframe", "dataset")).toBe(true);
    // any is compatible with everything
    expect(registry.checkPortCompatibility("any", "dataframe")).toBe(true);
    expect(registry.checkPortCompatibility("dataframe", "any")).toBe(true);
    // model -> dataframe is incompatible
    expect(registry.checkPortCompatibility("model", "dataframe")).toBe(false);
  });
});

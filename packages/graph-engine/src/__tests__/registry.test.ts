import { describe, it, expect, beforeEach } from "vitest";
import { BlockDefinitionRegistry } from "../registry.js";
import {
  IRIS_BLOCK_DEFINITIONS,
  CSV_LOADER_DEFINITION,
  RANDOM_FOREST_CLASSIFIER_DEFINITION,
} from "../block-definitions.js";

describe("BlockDefinitionRegistry", () => {
  let registry: BlockDefinitionRegistry;

  beforeEach(() => {
    registry = new BlockDefinitionRegistry();
  });

  it("should register and retrieve a single definition", () => {
    registry.register(CSV_LOADER_DEFINITION);
    expect(registry.has("data.csv_loader")).toBe(true);
    expect(registry.get("data.csv_loader")).toEqual(CSV_LOADER_DEFINITION);
    expect(registry.size).toBe(1);
  });

  it("should register multiple definitions at once", () => {
    registry.registerMany(IRIS_BLOCK_DEFINITIONS);
    expect(registry.size).toBe(6);
    expect(registry.has("data.csv_loader")).toBe(true);
    expect(registry.has("ml.train_test_split")).toBe(true);
    expect(registry.has("ml.random_forest_classifier")).toBe(true);
    expect(registry.has("ml.predict")).toBe(true);
    expect(registry.has("eval.accuracy")).toBe(true);
    expect(registry.has("eval.confusion_matrix")).toBe(true);
  });

  it("should throw when registering a duplicate definition ID", () => {
    registry.register(CSV_LOADER_DEFINITION);
    expect(() => registry.register(CSV_LOADER_DEFINITION)).toThrow(
      'already registered'
    );
  });

  it("should allow replacing an existing definition", () => {
    registry.register(CSV_LOADER_DEFINITION);
    const updated = {
      ...CSV_LOADER_DEFINITION,
      description: "Updated CSV Loader",
    };
    registry.replace(updated);
    expect(registry.get("data.csv_loader")?.description).toBe("Updated CSV Loader");
    expect(registry.size).toBe(1);
  });

  it("should return undefined for unknown definition IDs", () => {
    expect(registry.get("nonexistent.block")).toBeUndefined();
    expect(registry.has("nonexistent.block")).toBe(false);
  });

  it("should return all registered IDs and definitions", () => {
    registry.registerMany(IRIS_BLOCK_DEFINITIONS);
    const ids = registry.getAllIds();
    expect(ids).toHaveLength(6);
    expect(ids).toContain("data.csv_loader");

    const defs = registry.getAll();
    expect(defs).toHaveLength(6);
  });

  it("should unregister and clear definitions", () => {
    registry.registerMany(IRIS_BLOCK_DEFINITIONS);
    expect(registry.unregister("data.csv_loader")).toBe(true);
    expect(registry.size).toBe(5);
    expect(registry.has("data.csv_loader")).toBe(false);

    registry.clear();
    expect(registry.size).toBe(0);
  });

  it("should have correct port definitions for Random Forest", () => {
    registry.register(RANDOM_FOREST_CLASSIFIER_DEFINITION);
    const def = registry.get("ml.random_forest_classifier")!;
    expect(def.inputs).toHaveLength(1);
    expect(def.inputs[0]?.type).toBe("dataframe");
    expect(def.inputs[0]?.required).toBe(true);
    expect(def.outputs).toHaveLength(1);
    expect(def.outputs[0]?.type).toBe("model");
  });
});

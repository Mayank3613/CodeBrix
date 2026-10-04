import { describe, it, expect } from "vitest";
import { blockRegistry } from "../registry";
import { bootstrapDefaultBlocks } from "../registry/bootstrap";

describe("Connection Type Compatibility", () => {
  bootstrapDefaultBlocks();

  it("permits compatible ports (dataframe -> dataframe)", () => {
    expect(blockRegistry.checkPortCompatibility("dataframe", "dataframe")).toBe(true);
  });

  it("permits series -> series and scalar -> scalar", () => {
    expect(blockRegistry.checkPortCompatibility("series", "series")).toBe(true);
    expect(blockRegistry.checkPortCompatibility("scalar", "scalar")).toBe(true);
  });

  it("refuses incompatible ports (dataframe -> model, model -> dataframe)", () => {
    expect(blockRegistry.checkPortCompatibility("dataframe", "model")).toBe(false);
    expect(blockRegistry.checkPortCompatibility("model", "dataframe")).toBe(false);
  });

  it("refuses incompatible ports (dataframe -> string, file -> series)", () => {
    expect(blockRegistry.checkPortCompatibility("dataframe", "string")).toBe(false);
    expect(blockRegistry.checkPortCompatibility("file", "series")).toBe(false);
  });
});

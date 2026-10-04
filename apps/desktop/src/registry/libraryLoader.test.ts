import { describe, it, expect, beforeEach } from "vitest";
import {
  discoverAndLoadLibraries,
  importLibraryManifest,
} from "./libraryLoader";
import { blockRegistry } from "./BlockRegistry";
import { useLibraryStore } from "../stores/libraryStore";

describe("Library Loader & Discovery (D1-3.1)", () => {
  beforeEach(() => {
    useLibraryStore.setState({
      libraries: [],
      warnings: [],
      isLoading: false,
    });
    blockRegistry.clear();
  });

  it("discovers and loads all 4 built-in libraries with registered blocks", async () => {
    const libs = await discoverAndLoadLibraries();

    expect(libs.length).toBeGreaterThanOrEqual(4);
    const names = libs.map((l) => l.manifest.name);
    expect(names).toContain("core");
    expect(names).toContain("data");
    expect(names).toContain("scikit-learn");
    expect(names).toContain("visualization");

    // Check blocks registered into blockRegistry
    expect(blockRegistry.has("core.variables")).toBe(true);
    expect(blockRegistry.has("core.conditions")).toBe(true);
    expect(blockRegistry.has("data.csv_loader")).toBe(true);
    expect(blockRegistry.has("ml.train_test_split")).toBe(true);
    expect(blockRegistry.has("eval.confusion_matrix")).toBe(true);
  });

  it("successfully imports a valid custom library manifest", () => {
    const customManifest = JSON.stringify({
      name: "nlp-toolkit",
      version: "0.2.0",
      description: "Natural Language Processing transformers and tokenizers",
      author: "Community",
      blocks: ["blocks/tokenizer/block.js", "blocks/embedding/block.js"],
    });

    const result = importLibraryManifest(customManifest, "libraries/nlp-toolkit");
    expect(result.success).toBe(true);
    expect(result.library?.manifest.name).toBe("nlp-toolkit");

    const storeLibs = useLibraryStore.getState().libraries;
    expect(storeLibs.some((l) => l.manifest.name === "nlp-toolkit")).toBe(true);
  });

  it("rejects an invalid library manifest and logs a warning", () => {
    const invalidManifest = JSON.stringify({
      name: "", // Invalid empty name
      version: "1.0.0",
      // missing description and blocks
    });

    const result = importLibraryManifest(invalidManifest);
    expect(result.success).toBe(false);
    expect(result.error).toContain("LibraryManifest schema");

    const warnings = useLibraryStore.getState().warnings;
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("rejects malformed non-JSON string gracefully", () => {
    const result = importLibraryManifest("{ broken: json");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid JSON syntax");
  });
});

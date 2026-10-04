import { describe, it, expect, beforeEach } from "vitest";
import {
  useWorkflowStore,
  useUiStore,
  useLibraryStore,
  useValidationStore,
  useExecutionStore,
  useProjectStore,
} from "./index";
import type { BlockDefinition, ValidationResult } from "@codebrix/types";

describe("Zustand Stores (D1-1.5)", () => {
  beforeEach(() => {
    useUiStore.getState().resetUi();
    useValidationStore.getState().clearValidation();
    useExecutionStore.getState().resetExecution();
    useProjectStore.getState().resetProject();
    useLibraryStore.getState().setLibraries([]);
    useLibraryStore.getState().setSearchQuery("");
  });

  describe("workflowStore", () => {
    it("manages blocks and connections correctly", () => {
      const dummyDef: BlockDefinition = {
        id: "test.dummy",
        name: "Dummy Block",
        category: "data",
        version: "0.1.0",
        description: "Test dummy",
        inputs: [],
        outputs: [],
      };

      const blockId = useWorkflowStore.getState().addBlock(dummyDef, { x: 100, y: 200 });
      expect(useWorkflowStore.getState().graph.blocks[blockId]).toBeDefined();
      expect(useWorkflowStore.getState().graph.blocks[blockId]?.position).toEqual({ x: 100, y: 200 });

      useWorkflowStore.getState().updateBlockPosition(blockId, { x: 300, y: 400 });
      expect(useWorkflowStore.getState().graph.blocks[blockId]?.position).toEqual({ x: 300, y: 400 });

      useWorkflowStore.getState().updateBlockConfig(blockId, "testKey", "testVal");
      expect(useWorkflowStore.getState().graph.blocks[blockId]?.config["testKey"]).toBe("testVal");

      useWorkflowStore.getState().removeBlock(blockId);
      expect(useWorkflowStore.getState().graph.blocks[blockId]).toBeUndefined();
    });
  });

  describe("uiStore", () => {
    it("handles block selection and tab toggles", () => {
      useUiStore.getState().selectBlock("blk-123");
      expect(useUiStore.getState().selectedBlockId).toBe("blk-123");

      useUiStore.getState().setActiveOutputTab("table");
      expect(useUiStore.getState().activeOutputTab).toBe("table");

      useUiStore.getState().togglePalette();
      expect(useUiStore.getState().isPaletteOpen).toBe(false);
    });
  });

  describe("libraryStore", () => {
    it("manages installed libraries and search query", () => {
      // Initially no libraries loaded (runtime population happens via libraryLoader)
      expect(useLibraryStore.getState().libraries).toBeInstanceOf(Array);

      // Search query round-trips correctly
      useLibraryStore.getState().setSearchQuery("random");
      expect(useLibraryStore.getState().searchQuery).toBe("random");

      // Reset
      useLibraryStore.getState().setSearchQuery("");
      expect(useLibraryStore.getState().searchQuery).toBe("");

      // addLibrary appends and deduplicates by manifest.name
      const fakeLib = {
        manifest: { name: "test-lib", version: "0.1.0", description: "", blocks: [] },
        path: "/fake",
        manifestPath: "/fake/manifest.json",
        isBuiltIn: false,
        enabled: true,
        isValid: true,
        blockIds: ["test.dummy"],
      };
      useLibraryStore.getState().addLibrary(fakeLib);
      expect(useLibraryStore.getState().libraries).toHaveLength(1);
      // Adding again with same name should replace, not duplicate
      useLibraryStore.getState().addLibrary({ ...fakeLib, blockIds: ["test.dummy", "test.other"] });
      expect(useLibraryStore.getState().libraries).toHaveLength(1);
      expect(useLibraryStore.getState().libraries[0]?.blockIds).toHaveLength(2);

      // setLibraryEnabled toggles enabled flag
      useLibraryStore.getState().setLibraryEnabled("test-lib", false);
      expect(useLibraryStore.getState().libraries[0]?.enabled).toBe(false);
    });
  });

  describe("validationStore", () => {
    it("indexes errors by blockId for canvas highlighting", () => {
      const mockResult: ValidationResult = {
        valid: false,
        errors: [
          {
            code: "MISSING_REQUIRED_INPUT",
            message: "Missing input port",
            severity: "error",
            blockId: "blk-split",
          },
        ],
        warnings: [],
      };

      useValidationStore.getState().setValidationResult(mockResult);
      expect(useValidationStore.getState().validationResult?.valid).toBe(false);
      expect(useValidationStore.getState().errorMapByBlockId["blk-split"]).toHaveLength(1);
    });
  });

  describe("executionStore", () => {
    it("tracks run state and per-block execution status", () => {
      useExecutionStore.getState().setRunState("running");
      useExecutionStore.getState().setBlockStatus("blk-csv", "running");

      expect(useExecutionStore.getState().runState).toBe("running");
      expect(useExecutionStore.getState().blockStatuses["blk-csv"]).toBe("running");

      useExecutionStore.getState().setBlockStatus("blk-csv", "success");
      expect(useExecutionStore.getState().blockStatuses["blk-csv"]).toBe("success");
    });
  });

  describe("projectStore", () => {
    it("tracks file paths, recent files and dirty flag", () => {
      useProjectStore.getState().setProjectName("My Project");
      expect(useProjectStore.getState().projectName).toBe("My Project");
      expect(useProjectStore.getState().isDirty).toBe(true);

      useProjectStore.getState().setCurrentFilePath("/path/to/project.cbx");
      expect(useProjectStore.getState().currentFilePath).toBe("/path/to/project.cbx");
      expect(useProjectStore.getState().recentProjects).toContain("/path/to/project.cbx");
      expect(useProjectStore.getState().isDirty).toBe(false);
    });
  });
});

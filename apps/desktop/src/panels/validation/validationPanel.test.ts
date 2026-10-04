import { describe, it, expect, beforeEach } from "vitest";
import { useValidationStore, useUiStore, useWorkflowStore } from "../../stores";
import { createIrisWorkflowMock } from "@codebrix/shared";
import type { ValidationResult } from "@codebrix/types";

describe("Validation Error Panel & Canvas Highlighting (D1-4.3)", () => {
  beforeEach(() => {
    useValidationStore.getState().clearValidation();
    useUiStore.getState().resetUi();
    useWorkflowStore.getState().setGraph(createIrisWorkflowMock());
  });

  it("maps validation errors to specific block IDs and friendly labels", () => {
    const invalidResult: ValidationResult = {
      valid: false,
      errors: [
        {
          code: "MISSING_REQUIRED_INPUT",
          message: "Input 'dataset_in' is not connected.",
          severity: "error",
          blockId: "blk-split",
        },
        {
          code: "INVALID_BLOCK_CONFIG",
          message: "CSV file path is empty.",
          severity: "error",
          blockId: "blk-csv",
        },
      ],
      warnings: [
        {
          code: "CUSTOM_VALIDATION_ERROR",
          message: "Output 'y_test_out' is not consumed.",
          severity: "warning",
          blockId: "blk-split",
        },
      ],
    };

    useValidationStore.getState().setValidationResult(invalidResult);

    const state = useValidationStore.getState();
    expect(state.validationResult?.valid).toBe(false);
    expect(state.errorMapByBlockId["blk-split"]?.length).toBe(2);
    expect(state.errorMapByBlockId["blk-csv"]?.length).toBe(1);
    expect(state.errorMapByBlockId["blk-rf"]).toBeUndefined();

    // Verify block name lookup from workflow store
    const graph = useWorkflowStore.getState().graph;
    expect(graph.blocks["blk-split"]?.label).toBe("Train/Test Split");
    expect(graph.blocks["blk-csv"]?.label).toBe("Iris CSV Loader");
  });

  it("triggers focusBlock action which sets selectedBlockId and focusTarget", () => {
    useUiStore.getState().focusBlock("blk-split");

    const uiState = useUiStore.getState();
    expect(uiState.selectedBlockId).toBe("blk-split");
    expect(uiState.focusedBlockId).toBe("blk-split");
    expect(uiState.focusTarget?.blockId).toBe("blk-split");
    expect(uiState.focusTarget?.timestamp).toBeGreaterThan(0);
  });

  it("clears error highlighting when validation result is valid or cleared", () => {
    // 1. First set errors
    useValidationStore.getState().setValidationResult({
      valid: false,
      errors: [
        {
          code: "CYCLE_DETECTED",
          message: "Workflow graph contains a dependency cycle.",
          severity: "error",
          blockId: "blk-rf",
        },
      ],
      warnings: [],
    });

    expect(useValidationStore.getState().errorMapByBlockId["blk-rf"]?.length).toBe(1);

    // 2. Set valid result -> errorMapByBlockId must become empty
    useValidationStore.getState().setValidationResult({
      valid: true,
      errors: [],
      warnings: [],
    });

    expect(useValidationStore.getState().errorMapByBlockId["blk-rf"]).toBeUndefined();
    expect(Object.keys(useValidationStore.getState().errorMapByBlockId).length).toBe(0);

    // 3. Clear validation completely
    useValidationStore.getState().clearValidation();
    expect(useValidationStore.getState().validationResult).toBeNull();
  });
});

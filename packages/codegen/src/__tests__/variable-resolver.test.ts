import { describe, it, expect } from "vitest";
import {
  sanitizePythonIdentifier,
  getOutputVariableName,
  VariableResolver,
} from "../variable-resolver.js";
import { createIrisWorkflowMock } from "@codebrix/shared";

describe("VariableResolver", () => {
  describe("sanitizePythonIdentifier", () => {
    it("should replace dashes, dots, and spaces with underscores", () => {
      expect(sanitizePythonIdentifier("blk-csv")).toBe("blk_csv");
      expect(sanitizePythonIdentifier("data.csv_loader")).toBe("data_csv_loader");
      expect(sanitizePythonIdentifier("my block name")).toBe("my_block_name");
    });

    it("should prepend an underscore if starting with a digit", () => {
      expect(sanitizePythonIdentifier("123block")).toBe("_123block");
    });

    it("should deduplicate consecutive underscores", () => {
      expect(sanitizePythonIdentifier("block--name..test")).toBe("block_name_test");
    });
  });

  describe("getOutputVariableName", () => {
    it("should build a predictable, PEP-8 variable identifier", () => {
      const varName = getOutputVariableName("blk-csv", "dataset_out");
      expect(varName).toBe("var_blk_csv_dataset_out");
    });
  });

  describe("resolveForBlock", () => {
    it("should correctly resolve incoming and outgoing variables for the Iris pipeline", () => {
      const workflow = createIrisWorkflowMock();
      const resolver = new VariableResolver();

      // 1. Root block (blk-csv) has no input connections
      const csvVars = resolver.resolveForBlock("blk-csv", workflow);
      expect(Object.keys(csvVars.inputs)).toHaveLength(0);
      expect(csvVars.outputs["dataset_out"]).toBe("var_blk_csv_dataset_out");

      // 2. Train/Test Split (blk-split) receives dataset_out from blk-csv
      const splitVars = resolver.resolveForBlock("blk-split", workflow);
      expect(splitVars.inputs["dataset_in"]).toBe("var_blk_csv_dataset_out");
      expect(splitVars.outputs["train_data_out"]).toBe("var_blk_split_train_data_out");
      expect(splitVars.outputs["test_data_out"]).toBe("var_blk_split_test_data_out");
      expect(splitVars.outputs["y_test_out"]).toBe("var_blk_split_y_test_out");

      // 3. Predict block receives model from blk-rf and test_data from blk-split
      const predictVars = resolver.resolveForBlock("blk-predict", workflow);
      expect(predictVars.inputs["model_in"]).toBe("var_blk_rf_model_out");
      expect(predictVars.inputs["test_data_in"]).toBe("var_blk_split_test_data_out");
      expect(predictVars.outputs["predictions_out"]).toBe("var_blk_predict_predictions_out");

      // 4. Accuracy block receives predictions and ground truth
      const accVars = resolver.resolveForBlock("blk-acc", workflow);
      expect(accVars.inputs["predictions_in"]).toBe("var_blk_predict_predictions_out");
      expect(accVars.inputs["ground_truth_in"]).toBe("var_blk_split_y_test_out");
    });
  });
});

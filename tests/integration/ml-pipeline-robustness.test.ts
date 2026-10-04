import { describe, it, expect } from "vitest";
import { PythonCodeGenerator } from "@codebrix/codegen";
import { BlockGeneratorRegistry } from "@codebrix/codegen";
import { getExecutionPlan } from "@codebrix/graph-engine";
import type { WorkflowGraph } from "@codebrix/types";

describe("ML Pipeline Robustness & Arbitrary Dataset Support", () => {
  const registry = new BlockGeneratorRegistry();

  it("registers generators for all catalogue data and ML blocks", () => {
    expect(registry.has("data.csv_loader")).toBe(true);
    expect(registry.has("data.json_loader")).toBe(true);
    expect(registry.has("data.excel_loader")).toBe(true);
    expect(registry.has("data.scaler")).toBe(true);
    expect(registry.has("data.encoder")).toBe(true);
    expect(registry.has("ml.train_test_split")).toBe(true);
    expect(registry.has("ml.random_forest_classifier")).toBe(true);
    expect(registry.has("ml.predict")).toBe(true);
    expect(registry.has("eval.accuracy")).toBe(true);
    expect(registry.has("eval.confusion_matrix")).toBe(true);
  });

  it("handles string and categorical features like 'Pooja' without float conversion error", () => {
    const generator = new PythonCodeGenerator();
    const workflow: WorkflowGraph = {
      id: "workflow-employee",
      name: "Employee Classification",
      version: "0.1.0",
      blocks: {
        "b1": {
          id: "b1",
          definitionId: "data.csv_loader",
          position: { x: 0, y: 0 },
          config: { filePath: "C:/Users/Arshit/Desktop/employee_data.csv" },
        },
        "b2": {
          id: "b2",
          definitionId: "ml.train_test_split",
          position: { x: 200, y: 0 },
          config: { test_size: 0.2, random_state: 42, target_column: "department" },
        },
        "b3": {
          id: "b3",
          definitionId: "ml.random_forest_classifier",
          position: { x: 400, y: 0 },
          config: { n_estimators: 50, random_state: 42, target_column: "department" },
        },
        "b4": {
          id: "b4",
          definitionId: "ml.predict",
          position: { x: 600, y: 0 },
          config: {},
        },
        "b5": {
          id: "b5",
          definitionId: "eval.accuracy",
          position: { x: 800, y: 0 },
          config: {},
        },
        "b6": {
          id: "b6",
          definitionId: "eval.confusion_matrix",
          position: { x: 800, y: 150 },
          config: {},
        },
      },
      connections: [
        { id: "c1", sourceBlockId: "b1", sourcePortId: "dataset_out", targetBlockId: "b2", targetPortId: "dataset_in" },
        { id: "c2", sourceBlockId: "b2", sourcePortId: "train_data_out", targetBlockId: "b3", targetPortId: "train_data_in" },
        { id: "c3", sourceBlockId: "b3", sourcePortId: "model_out", targetBlockId: "b4", targetPortId: "model_in" },
        { id: "c4", sourceBlockId: "b2", sourcePortId: "test_data_out", targetBlockId: "b4", targetPortId: "test_data_in" },
        { id: "c5", sourceBlockId: "b4", sourcePortId: "predictions_out", targetBlockId: "b5", targetPortId: "predictions_in" },
        { id: "c6", sourceBlockId: "b2", sourcePortId: "y_test_out", targetBlockId: "b5", targetPortId: "ground_truth_in" },
        { id: "c7", sourceBlockId: "b4", sourcePortId: "predictions_out", targetBlockId: "b6", targetPortId: "predictions_in" },
        { id: "c8", sourceBlockId: "b2", sourcePortId: "y_test_out", targetBlockId: "b6", targetPortId: "ground_truth_in" },
      ],
    };

    const plan = getExecutionPlan(workflow);
    const result = generator.generate(workflow, plan);

    // Verify auto-encoding of non-numeric object/string columns
    expect(result.code).toContain("select_dtypes(include=['object', 'category', 'string'])");
    expect(result.code).toContain("pd.get_dummies(");
    expect(result.code).toContain(".fillna(0)");

    // Verify target column detection and regressor vs classifier detection
    expect(result.code).toContain("type_of_target");
    expect(result.code).toContain("RandomForestRegressor");
    expect(result.code).toContain("RandomForestClassifier");

    // Verify test alignment
    expect(result.code).toContain("feature_names_in_");
    expect(result.code).toContain("reindex");

    // Verify accuracy and confusion matrix safety
    expect(result.code).toContain("r2_score");
    expect(result.code).toContain("pd.qcut");
  });

  it("handles categorical encoder and scaler in data preprocessing chain", () => {
    const generator = new PythonCodeGenerator();
    const workflow: WorkflowGraph = {
      id: "workflow-preproc",
      name: "Preprocessing Chain",
      version: "0.1.0",
      blocks: {
        "load": {
          id: "load",
          definitionId: "data.csv_loader",
          position: { x: 0, y: 0 },
          config: { filePath: "data.csv" },
        },
        "encode": {
          id: "encode",
          definitionId: "data.encoder",
          position: { x: 200, y: 0 },
          config: { method: "onehot" },
        },
        "scale": {
          id: "scale",
          definitionId: "data.scaler",
          position: { x: 400, y: 0 },
          config: { method: "standard" },
        },
      },
      connections: [
        { id: "c1", sourceBlockId: "load", sourcePortId: "dataset_out", targetBlockId: "encode", targetPortId: "dataset_in" },
        { id: "c2", sourceBlockId: "encode", sourcePortId: "dataset_out", targetBlockId: "scale", targetPortId: "dataset_in" },
      ],
    };

    const plan = getExecutionPlan(workflow);
    const result = generator.generate(workflow, plan);

    expect(result.code).toContain("pd.get_dummies(");
    expect(result.code).toContain("StandardScaler");
  });
});

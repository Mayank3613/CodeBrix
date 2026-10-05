import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import {
  GraphValidator,
  BlockDefinitionRegistry,
  getExecutionPlan,
  IRIS_BLOCK_DEFINITIONS,
} from "@codebrix/graph-engine";
import { PythonCodeGenerator } from "@codebrix/codegen";
import { EngineWorkflowService } from "../../apps/desktop/src/services/engineWorkflowService.js";
import { useExecutionStore } from "../../apps/desktop/src/stores/executionStore.js";
import { useUiStore } from "../../apps/desktop/src/stores/uiStore.js";
import { serializeCbxProject, parseCbxProject } from "../../apps/desktop/src/project/index.js";
import { scalingBlockDefinition, encodingBlockDefinition } from "../../libraries/data/src/index.js";
import type { WorkflowGraph } from "@codebrix/types";

describe("Phase 5 Acceptance Gate: Merged Branch Robustness & End-to-End Execution", () => {
  let service: EngineWorkflowService;
  const originalFetch = globalThis.fetch;

  beforeAll(() => {
    // Prevent accidental connection to ambient localhost dev server during unit tests
    globalThis.fetch = async () => {
      throw new Error("Dev server unavailable in unit test environment");
    };
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(() => {
    service = new EngineWorkflowService();
    useExecutionStore.getState().resetExecution();
  });

  const phase5Workflow: WorkflowGraph = {
    id: "phase5-e2e-pipeline",
    name: "Phase 5 End-to-End Merged Pipeline",
    version: "1.0.0",
    blocks: {
      "loader": {
        id: "loader",
        definitionId: "data.csv_loader",
        position: { x: 0, y: 100 },
        config: { filePath: '"C:/datasets/customer_churn.csv"' },
      },
      "scaler": {
        id: "scaler",
        definitionId: "data.scaler",
        position: { x: 220, y: 100 },
        config: { method: "standard", features: "all" },
      },
      "encoder": {
        id: "encoder",
        definitionId: "data.encoder",
        position: { x: 440, y: 100 },
        config: { method: "onehot", columns: "auto" },
      },
      "split": {
        id: "split",
        definitionId: "ml.train_test_split",
        position: { x: 660, y: 100 },
        config: { test_size: 0.25, random_state: 42, target_column: "churn" },
      },
      "trainer": {
        id: "trainer",
        definitionId: "ml.random_forest_classifier",
        position: { x: 880, y: 40 },
        config: { n_estimators: 50, random_state: 42 },
      },
      "predictor": {
        id: "predictor",
        definitionId: "ml.predict",
        position: { x: 1100, y: 100 },
        config: {},
      },
      "eval_acc": {
        id: "eval_acc",
        definitionId: "eval.accuracy",
        position: { x: 1320, y: 40 },
        config: {},
      },
      "eval_cm": {
        id: "eval_cm",
        definitionId: "eval.confusion_matrix",
        position: { x: 1320, y: 160 },
        config: {},
      },
    },
    connections: [
      { id: "e1", sourceBlockId: "loader", sourcePortId: "dataset_out", targetBlockId: "scaler", targetPortId: "dataset_in" },
      { id: "e2", sourceBlockId: "scaler", sourcePortId: "dataset_out", targetBlockId: "encoder", targetPortId: "dataset_in" },
      { id: "e3", sourceBlockId: "encoder", sourcePortId: "dataset_out", targetBlockId: "split", targetPortId: "dataset_in" },
      { id: "e4", sourceBlockId: "split", sourcePortId: "train_data_out", targetBlockId: "trainer", targetPortId: "train_data_in" },
      { id: "e5", sourceBlockId: "trainer", sourcePortId: "model_out", targetBlockId: "predictor", targetPortId: "model_in" },
      { id: "e6", sourceBlockId: "split", sourcePortId: "test_data_out", targetBlockId: "predictor", targetPortId: "test_data_in" },
      { id: "e7", sourceBlockId: "predictor", sourcePortId: "predictions_out", targetBlockId: "eval_acc", targetPortId: "predictions_in" },
      { id: "e8", sourceBlockId: "split", sourcePortId: "y_test_out", targetBlockId: "eval_acc", targetPortId: "ground_truth_in" },
      { id: "e9", sourceBlockId: "predictor", sourcePortId: "predictions_out", targetBlockId: "eval_cm", targetPortId: "predictions_in" },
      { id: "e10", sourceBlockId: "split", sourcePortId: "y_test_out", targetBlockId: "eval_cm", targetPortId: "ground_truth_in" },
    ],
  };

  it("validates the complete 8-block merged pipeline without contract or cycle errors", async () => {
    const registry = new BlockDefinitionRegistry();
    registry.registerMany(IRIS_BLOCK_DEFINITIONS);
    registry.register(scalingBlockDefinition);
    registry.register(encodingBlockDefinition);

    const validator = new GraphValidator(registry);
    const valResult = validator.validate(phase5Workflow);

    expect(valResult.valid).toBe(true);
    expect(valResult.errors).toHaveLength(0);
  });

  it("computes strict topological execution order (Kahn's algorithm)", () => {
    const plan = getExecutionPlan(phase5Workflow);

    expect(plan.workflowId).toBe(phase5Workflow.id);
    expect(plan.executionOrder.indexOf("loader")).toBeLessThan(plan.executionOrder.indexOf("scaler"));
    expect(plan.executionOrder.indexOf("scaler")).toBeLessThan(plan.executionOrder.indexOf("encoder"));
    expect(plan.executionOrder.indexOf("encoder")).toBeLessThan(plan.executionOrder.indexOf("split"));
    expect(plan.executionOrder.indexOf("split")).toBeLessThan(plan.executionOrder.indexOf("trainer"));
    expect(plan.executionOrder.indexOf("trainer")).toBeLessThan(plan.executionOrder.indexOf("predictor"));
    expect(plan.executionOrder.indexOf("predictor")).toBeLessThan(plan.executionOrder.indexOf("eval_acc"));
    expect(plan.executionOrder.indexOf("predictor")).toBeLessThan(plan.executionOrder.indexOf("eval_cm"));
  });

  it("generates production Python script with robust data fallbacks and protocol hooks", () => {
    const plan = getExecutionPlan(phase5Workflow);
    const generator = new PythonCodeGenerator();
    const script = generator.generate(phase5Workflow, plan);

    // 1. File path quote stripping
    expect(script.code).toContain('csv_path_loader');
    expect(script.code).toContain('"C:/datasets/customer_churn.csv"');

    // 2. Preprocessing stages
    expect(script.code).toContain("StandardScaler");
    expect(script.code).toContain("pd.get_dummies");

    // 3. String column handling in split and training
    expect(script.code).toContain("select_dtypes(include=['object', 'category', 'string'])");
    expect(script.code).toContain("type_of_target");
    expect(script.code).toContain("RandomForestRegressor");
    expect(script.code).toContain("RandomForestClassifier");

    // 4. Feature alignment in prediction
    expect(script.code).toContain("feature_names_in_");
    expect(script.code).toContain("reindex");

    // 5. Accuracy & confusion matrix continuous fallback
    expect(script.code).toContain("accuracy_score");
    expect(script.code).toContain("r2_score");
    expect(script.code).toContain("pd.qcut");

    // 6. Protocol events
    expect(script.code).toContain("emit_json");
    expect(script.code).toContain("block_start");
    expect(script.code).toContain("block_done");
  });

  it("serializes and deserializes the full merged workflow (.cbx project format)", () => {
    const serialized = serializeCbxProject(phase5Workflow);
    expect(typeof serialized).toBe("string");

    const parsed = parseCbxProject(serialized);
    expect(parsed.success).toBe(true);
    expect(parsed.project).toBeDefined();
    expect(parsed.project?.graph.id).toBe(phase5Workflow.id);
    expect(Object.keys(parsed.project!.graph.blocks)).toHaveLength(8);
    expect(parsed.project!.graph.connections).toHaveLength(10);
  });

  it("executes the merged workflow in the engine and populates execution stores", async () => {
    const result = await service.executeWorkflow(phase5Workflow);

    expect(result.status).toBe("success");
    expect(result.exitCode).toBe(0);
    expect(result.durationMs).toBeGreaterThan(0);

    const storeState = useExecutionStore.getState();
    expect(storeState.runState).toBe("success");
    expect(storeState.latestResult).toBeDefined();
    expect(storeState.outputs.length).toBeGreaterThan(0);
  });

  it("handles UI Store output panel height adjustments and tab switching", () => {
    const uiStore = useUiStore.getState();

    // Default panel height
    expect(uiStore.outputPanelHeight).toBe(320);

    // Test resize adjustment
    uiStore.setOutputPanelHeight(420);
    expect(useUiStore.getState().outputPanelHeight).toBe(420);

    // Test tab navigation
    uiStore.setActiveOutputTab("table");
    expect(useUiStore.getState().activeOutputTab).toBe("table");

    uiStore.setActiveOutputTab("console");
    expect(useUiStore.getState().activeOutputTab).toBe("console");
  });
});

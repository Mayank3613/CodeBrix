import type {
  BlockDefinition,
  BlockInstance,
  WorkflowGraph,
  ExecutionPlan,
  ExecutionResult,
} from "@codebrix/types";

/**
 * Creates a mock BlockDefinition with sensible defaults.
 */
export function createMockBlockDefinition(
  overrides?: Partial<BlockDefinition>
): BlockDefinition {
  return {
    id: "mock.block",
    name: "Mock Block",
    category: "data",
    version: "0.1.0",
    description: "A mock block definition for unit testing",
    inputs: [],
    outputs: [
      {
        id: "output",
        name: "Output",
        type: "dataframe",
        direction: "output",
      },
    ],
    configSchema: {},
    ...overrides,
  };
}

/**
 * Creates a mock BlockInstance with sensible defaults.
 */
export function createMockBlockInstance(
  overrides?: Partial<BlockInstance>
): BlockInstance {
  return {
    id: "mock-instance-1",
    definitionId: "mock.block",
    label: "Mock Block 1",
    position: { x: 100, y: 100 },
    config: {},
    state: "idle",
    ...overrides,
  };
}

/**
 * Creates a mock WorkflowGraph with sensible defaults.
 */
export function createMockWorkflowGraph(
  overrides?: Partial<WorkflowGraph>
): WorkflowGraph {
  return {
    id: "mock-workflow-1",
    name: "Mock Workflow",
    version: "0.1.0",
    blocks: {
      "block-1": createMockBlockInstance({ id: "block-1" }),
    },
    connections: [],
    ...overrides,
  };
}

/**
 * Creates a mock ExecutionPlan.
 */
export function createMockExecutionPlan(
  overrides?: Partial<ExecutionPlan>
): ExecutionPlan {
  return {
    planId: "mock-plan-1",
    workflowId: "mock-workflow-1",
    steps: [
      {
        stepId: "step-1",
        blockId: "block-1",
        order: 0,
        dependencies: [],
      },
    ],
    executionOrder: ["block-1"],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock ExecutionResult.
 */
export function createMockExecutionResult(
  overrides?: Partial<ExecutionResult>
): ExecutionResult {
  return {
    executionId: "exec-mock-1",
    workflowId: "mock-workflow-1",
    status: "success",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: 120,
    exitCode: 0,
    blockResults: {
      "block-1": {
        blockId: "block-1",
        status: "success",
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 120,
      },
    },
    outputs: [
      {
        type: "console",
        stream: "stdout",
        text: "Mock execution succeeded.",
        timestamp: new Date().toISOString(),
      },
    ],
    ...overrides,
  };
}

/**
 * Creates the complete mock Iris Classification pipeline graph (MVP Acceptance Test).
 * Pipeline: CSV -> Train/Test Split -> Random Forest -> Predict -> Accuracy & Confusion Matrix.
 */
export function createIrisWorkflowMock(): WorkflowGraph {
  return {
    id: "wf-iris-mvp",
    name: "Iris Classification Acceptance Pipeline",
    version: "0.1.0",
    description: "End-to-end MVP reference pipeline for Iris dataset classification",
    blocks: {
      "blk-csv": {
        id: "blk-csv",
        definitionId: "data.csv_loader",
        label: "Iris CSV Loader",
        position: { x: 50, y: 150 },
        config: {
          filePath: "tests/fixtures/iris.csv",
        },
        state: "idle",
      },
      "blk-split": {
        id: "blk-split",
        definitionId: "ml.train_test_split",
        label: "Train/Test Split",
        position: { x: 280, y: 150 },
        config: {
          test_size: 0.2,
          random_state: 42,
          target_column: "species",
        },
        state: "idle",
      },
      "blk-rf": {
        id: "blk-rf",
        definitionId: "ml.random_forest_classifier",
        label: "Random Forest",
        position: { x: 520, y: 100 },
        config: {
          n_estimators: 100,
          random_state: 42,
        },
        state: "idle",
      },
      "blk-predict": {
        id: "blk-predict",
        definitionId: "ml.predict",
        label: "Predict",
        position: { x: 760, y: 150 },
        config: {},
        state: "idle",
      },
      "blk-acc": {
        id: "blk-acc",
        definitionId: "eval.accuracy",
        label: "Accuracy Score",
        position: { x: 1000, y: 100 },
        config: {},
        state: "idle",
      },
      "blk-cm": {
        id: "blk-cm",
        definitionId: "eval.confusion_matrix",
        label: "Confusion Matrix",
        position: { x: 1000, y: 240 },
        config: {},
        state: "idle",
      },
    },
    connections: [
      // CSV to Split
      {
        id: "c1",
        sourceBlockId: "blk-csv",
        sourcePortId: "dataset_out",
        targetBlockId: "blk-split",
        targetPortId: "dataset_in",
      },
      // Split X_train, y_train to Random Forest
      {
        id: "c2",
        sourceBlockId: "blk-split",
        sourcePortId: "train_data_out",
        targetBlockId: "blk-rf",
        targetPortId: "train_data_in",
      },
      // Model to Predict
      {
        id: "c3",
        sourceBlockId: "blk-rf",
        sourcePortId: "model_out",
        targetBlockId: "blk-predict",
        targetPortId: "model_in",
      },
      // Split X_test to Predict
      {
        id: "c4",
        sourceBlockId: "blk-split",
        sourcePortId: "test_data_out",
        targetBlockId: "blk-predict",
        targetPortId: "test_data_in",
      },
      // Predictions to Accuracy
      {
        id: "c5",
        sourceBlockId: "blk-predict",
        sourcePortId: "predictions_out",
        targetBlockId: "blk-acc",
        targetPortId: "predictions_in",
      },
      // Split y_test to Accuracy
      {
        id: "c6",
        sourceBlockId: "blk-split",
        sourcePortId: "y_test_out",
        targetBlockId: "blk-acc",
        targetPortId: "ground_truth_in",
      },
      // Predictions to Confusion Matrix
      {
        id: "c7",
        sourceBlockId: "blk-predict",
        sourcePortId: "predictions_out",
        targetBlockId: "blk-cm",
        targetPortId: "predictions_in",
      },
      // Split y_test to Confusion Matrix
      {
        id: "c8",
        sourceBlockId: "blk-split",
        sourcePortId: "y_test_out",
        targetBlockId: "blk-cm",
        targetPortId: "ground_truth_in",
      },
    ],
    metadata: {
      name: "Iris Classification",
      createdAt: "2026-10-04T00:00:00.000Z",
      updatedAt: "2026-10-04T00:00:00.000Z",
      codebrixVersion: "0.1.0",
      contractVersion: "0.1.0",
    },
  };
}

/**
 * MockWorkflowService interface and implementation for Developer 1 (UI)
 * to develop against before Developer 2's real graph engine lands in Phase 1.
 */
export interface IWorkflowService {
  validateGraph(graph: WorkflowGraph): Promise<import("@codebrix/types").ValidationResult>;
  getExecutionPlan(graph: WorkflowGraph): Promise<ExecutionPlan>;
  executeWorkflow(graph: WorkflowGraph): Promise<ExecutionResult>;
}

export class MockWorkflowService implements IWorkflowService {
  async validateGraph(graph: WorkflowGraph): Promise<import("@codebrix/types").ValidationResult> {
    const blockCount = Object.keys(graph.blocks).length;
    if (blockCount === 0) {
      return {
        valid: false,
        errors: [
          {
            code: "INVALID_TOPOLOGY",
            message: "Workflow graph contains no blocks.",
            severity: "error",
          },
        ],
        warnings: [],
      };
    }
    return {
      valid: true,
      errors: [],
      warnings: [],
    };
  }

  async getExecutionPlan(graph: WorkflowGraph): Promise<ExecutionPlan> {
    const blockIds = Object.keys(graph.blocks);
    return createMockExecutionPlan({
      workflowId: graph.id,
      executionOrder: blockIds,
      steps: blockIds.map((id, index) => ({
        stepId: `step-${index + 1}`,
        blockId: id,
        order: index,
        dependencies: [],
      })),
    });
  }

  async executeWorkflow(graph: WorkflowGraph): Promise<ExecutionResult> {
    return createMockExecutionResult({
      workflowId: graph.id,
      outputs: [
        {
          type: "console",
          stream: "stdout",
          text: `Executed mock workflow ${graph.name} with ${Object.keys(graph.blocks).length} blocks.`,
          timestamp: new Date().toISOString(),
        },
        {
          type: "metrics",
          title: "Mock Metrics",
          metrics: {
            accuracy: 0.967,
          },
          timestamp: new Date().toISOString(),
        },
      ],
    });
  }
}


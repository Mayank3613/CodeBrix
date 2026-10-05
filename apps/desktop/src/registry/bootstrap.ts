import { blockRegistry } from "./BlockRegistry.js";
import {
  variablesBlockDefinition,
  conditionsBlockDefinition,
  loopsBlockDefinition,
  functionsBlockDefinition,
} from "@codebrix/library-core";
import {
  csvBlockDefinition,
  jsonBlockDefinition,
  excelBlockDefinition,
  scalingBlockDefinition,
  encodingBlockDefinition,
} from "@codebrix/library-data";
import { BUILTIN_ML_BLOCKS } from "./builtinBlocks.js";
import { useCustomBlockStore } from "../stores/customBlockStore.js";
import type { BlockDefinition } from "@codebrix/types";

export { BUILTIN_ML_BLOCKS } from "./builtinBlocks.js";

/**
 * Canonical reference ML blocks for CodeBrix pipeline.
 */
export const CANONICAL_ML_BLOCKS: BlockDefinition[] = [
  {
    id: "ml.train_test_split",
    name: "Train/Test Split",
    category: "preprocessing",
    version: "0.1.0",
    description: "Splits dataset arrays or matrices into random train and test subsets.",
    inputs: [
      { id: "dataset_in", name: "Dataset", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "train_data_out", name: "Train Data", type: "dataframe", direction: "output" },
      { id: "test_data_out", name: "Test Data", type: "dataframe", direction: "output" },
      { id: "y_test_out", name: "Ground Truth", type: "series", direction: "output" },
    ],
    configSchema: {
      test_size: { name: "test_size", label: "Test Size", type: "number", defaultValue: 0.2, min: 0.05, max: 0.95 },
      random_state: { name: "random_state", label: "Random Seed", type: "number", defaultValue: 42 },
      target_column: { name: "target_column", label: "Target Column", type: "string", defaultValue: "species" },
    },
    tags: ["prep", "split", "train", "test", "dataset"],
  },
  {
    id: "ml.random_forest_classifier",
    name: "Random Forest Classifier",
    category: "ml",
    version: "0.1.0",
    description: "Fits random forest ensemble classification or regression trees.",
    inputs: [
      { id: "train_data_in", name: "Train Data", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "model_out", name: "Model", type: "model", direction: "output" },
    ],
    configSchema: {
      n_estimators: { name: "n_estimators", label: "Estimators", type: "number", defaultValue: 100, min: 1, max: 1000 },
      random_state: { name: "random_state", label: "Random Seed", type: "number", defaultValue: 42 },
      target_column: { name: "target_column", label: "Target Column", type: "string", defaultValue: "species" },
    },
    tags: ["ml", "classifier", "forest", "ensemble", "trees"],
  },
  {
    id: "ml.predict",
    name: "Model Predictor",
    category: "ml",
    version: "0.1.0",
    description: "Generates predictions from a trained estimator on test inputs.",
    inputs: [
      { id: "model_in", name: "Trained Model", type: "model", direction: "input", required: true },
      { id: "test_data_in", name: "Test Features", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "predictions_out", name: "Predictions", type: "series", direction: "output" },
    ],
    configSchema: {},
    tags: ["ml", "predict", "inference", "scoring"],
  },
  {
    id: "eval.accuracy",
    name: "Accuracy Score",
    category: "evaluation",
    version: "0.1.0",
    description: "Calculates subset accuracy classification score.",
    inputs: [
      { id: "predictions_in", name: "Predictions", type: "series", direction: "input", required: true },
      { id: "ground_truth_in", name: "Ground Truth", type: "series", direction: "input", required: true },
    ],
    outputs: [
      { id: "score_out", name: "Score", type: "scalar", direction: "output" },
    ],
    configSchema: {},
    tags: ["eval", "accuracy", "metrics", "score"],
  },
  {
    id: "eval.confusion_matrix",
    name: "Confusion Matrix",
    category: "visualization",
    version: "0.1.0",
    description: "Computes and plots multiclass confusion matrix heatmap.",
    inputs: [
      { id: "predictions_in", name: "Predictions", type: "series", direction: "input", required: true },
      { id: "ground_truth_in", name: "Ground Truth", type: "series", direction: "input", required: true },
    ],
    outputs: [
      { id: "matrix_out", name: "Matrix Plot", type: "figure", direction: "output" },
    ],
    configSchema: {},
    tags: ["eval", "visualization", "confusion", "matrix", "heatmap"],
  },
];

/**
 * Bootstrap all default block definitions into the global BlockRegistry.
 */
export function bootstrapDefaultBlocks(): void {
  // 1. Register core library blocks
  const coreBlocks = [
    variablesBlockDefinition,
    conditionsBlockDefinition,
    loopsBlockDefinition,
    functionsBlockDefinition,
  ];
  for (const block of coreBlocks) {
    blockRegistry.registerOrUpdate(block);
  }

  // 2. Register data library blocks
  const dataBlocks = [
    csvBlockDefinition,
    jsonBlockDefinition,
    excelBlockDefinition,
    scalingBlockDefinition,
    encodingBlockDefinition,
  ];
  for (const block of dataBlocks) {
    blockRegistry.registerOrUpdate(block);
  }

  // 3. Register canonical ML blocks
  for (const block of CANONICAL_ML_BLOCKS) {
    blockRegistry.registerOrUpdate(block);
  }

  // 4. Register rich extended ML, preprocessing, and visualizer blocks
  for (const block of BUILTIN_ML_BLOCKS) {
    blockRegistry.registerOrUpdate(block);
  }

  // 5. Register custom blocks saved in localStorage
  try {
    const customBlocks = useCustomBlockStore.getState().customBlocks;
    for (const customBlock of customBlocks) {
      blockRegistry.registerOrUpdate(customBlock);
    }
  } catch {
    // LocalStorage or SSR environment fallback
  }
}

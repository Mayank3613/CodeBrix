import { blockRegistry } from "./BlockRegistry.js";
import {
  variablesBlockDefinition,
  conditionsBlockDefinition,
} from "@codebrix/library-core";
import {
  csvBlockDefinition,
  jsonBlockDefinition,
  excelBlockDefinition,
  scalingBlockDefinition,
  encodingBlockDefinition,
} from "@codebrix/library-data";
import type { BlockDefinition } from "@codebrix/types";

/**
 * Bootstrap default block definitions for Phase 1, Phase 2, and Phase 3.
 * This populates the BlockRegistry with core blocks, data blocks, and ML blocks.
 */
export function bootstrapDefaultBlocks(): void {
  if (blockRegistry.list().length > 0) return;

  // Register real blocks from Developer 1's core library
  blockRegistry.register(variablesBlockDefinition);
  blockRegistry.register(conditionsBlockDefinition);

  // Register real blocks from Developer 1's data library
  blockRegistry.register(csvBlockDefinition);
  blockRegistry.register(jsonBlockDefinition);
  blockRegistry.register(excelBlockDefinition);
  blockRegistry.register(scalingBlockDefinition);
  blockRegistry.register(encodingBlockDefinition);

  // Register placeholder definitions for Developer 2's blocks until Phase 2/3 landing
  const mlBlocks: BlockDefinition[] = [
    {
      id: "ml.train_test_split",
      name: "Train/Test Split",
      category: "preprocessing",
      version: "0.1.0",
      description: "Splits dataset arrays or matrices into random train and test subsets.",
      inputs: [
        { id: "dataset_in", name: "Dataset", type: "dataframe", direction: "input" },
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
    },
    {
      id: "ml.random_forest_classifier",
      name: "Random Forest Classifier",
      category: "ml",
      version: "0.1.0",
      description: "Fits random forest ensemble classification trees.",
      inputs: [
        { id: "train_data_in", name: "Train Data", type: "dataframe", direction: "input" },
      ],
      outputs: [
        { id: "model_out", name: "Model", type: "model", direction: "output" },
      ],
      configSchema: {
        n_estimators: { name: "n_estimators", label: "Estimators", type: "number", defaultValue: 100, min: 1, max: 1000 },
        random_state: { name: "random_state", label: "Random Seed", type: "number", defaultValue: 42 },
      },
    },
    {
      id: "ml.predict",
      name: "Model Predictor",
      category: "ml",
      version: "0.1.0",
      description: "Generates predictions from a trained estimator on test inputs.",
      inputs: [
        { id: "model_in", name: "Trained Model", type: "model", direction: "input" },
        { id: "test_data_in", name: "Test Features", type: "dataframe", direction: "input" },
      ],
      outputs: [
        { id: "predictions_out", name: "Predictions", type: "series", direction: "output" },
      ],
      configSchema: {},
    },
    {
      id: "eval.accuracy",
      name: "Accuracy Score",
      category: "evaluation",
      version: "0.1.0",
      description: "Calculates subset accuracy classification score.",
      inputs: [
        { id: "predictions_in", name: "Predictions", type: "series", direction: "input" },
        { id: "ground_truth_in", name: "Ground Truth", type: "series", direction: "input" },
      ],
      outputs: [
        { id: "score_out", name: "Score", type: "scalar", direction: "output" },
      ],
      configSchema: {},
    },
    {
      id: "eval.confusion_matrix",
      name: "Confusion Matrix",
      category: "visualization",
      version: "0.1.0",
      description: "Computes and plots multiclass confusion matrix.",
      inputs: [
        { id: "predictions_in", name: "Predictions", type: "series", direction: "input" },
        { id: "ground_truth_in", name: "Ground Truth", type: "series", direction: "input" },
      ],
      outputs: [
        { id: "matrix_out", name: "Matrix Plot", type: "figure", direction: "output" },
      ],
      configSchema: {},
    },
  ];

  for (const block of mlBlocks) {
    if (!blockRegistry.has(block.id)) {
      blockRegistry.register(block);
    }
  }
}

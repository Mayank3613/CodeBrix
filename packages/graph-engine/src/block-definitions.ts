import type { BlockDefinition } from "@codebrix/types";

/**
 * Reference BlockDefinitions for the Iris MVP pipeline.
 * These define the port contracts that the validator checks against.
 *
 * In production, these will live in libraries/data/ and libraries/scikit-learn/.
 * For Phase 1, they serve as the canonical test fixtures.
 */

export const CSV_LOADER_DEFINITION: BlockDefinition = {
  id: "data.csv_loader",
  name: "CSV Loader",
  category: "data",
  version: "0.1.0",
  description: "Loads a CSV file into a DataFrame",
  inputs: [
    {
      id: "file_path_in",
      name: "File Path",
      type: "file",
      direction: "input",
      required: false,
      description: "Optional file path override (can also be set in config)",
    },
  ],
  outputs: [
    {
      id: "dataset_out",
      name: "Dataset",
      type: "dataframe",
      direction: "output",
    },
  ],
  configSchema: {
    filePath: {
      name: "filePath",
      label: "File Path",
      type: "file",
      required: true,
    },
  },
  pythonDependencies: ["pandas"],
};

export const TRAIN_TEST_SPLIT_DEFINITION: BlockDefinition = {
  id: "ml.train_test_split",
  name: "Train/Test Split",
  category: "preprocessing",
  version: "0.1.0",
  description: "Splits a dataset into training and test sets",
  inputs: [
    {
      id: "dataset_in",
      name: "Dataset",
      type: "dataframe",
      direction: "input",
      required: true,
    },
  ],
  outputs: [
    {
      id: "train_data_out",
      name: "Training Data",
      type: "dataframe",
      direction: "output",
    },
    {
      id: "test_data_out",
      name: "Test Data",
      type: "dataframe",
      direction: "output",
    },
    {
      id: "y_test_out",
      name: "Test Labels",
      type: "series",
      direction: "output",
    },
  ],
  configSchema: {
    test_size: {
      name: "test_size",
      label: "Test Size",
      type: "slider",
      defaultValue: 0.2,
      min: 0.05,
      max: 0.5,
      step: 0.05,
    },
    random_state: {
      name: "random_state",
      label: "Random State",
      type: "number",
      defaultValue: 42,
    },
    target_column: {
      name: "target_column",
      label: "Target Column",
      type: "string",
      required: true,
      placeholder: "e.g. species",
    },
  },
  pythonDependencies: ["scikit-learn", "pandas"],
};

export const RANDOM_FOREST_CLASSIFIER_DEFINITION: BlockDefinition = {
  id: "ml.random_forest_classifier",
  name: "Random Forest Classifier",
  category: "ml",
  version: "0.1.0",
  description: "Trains a Random Forest classification model",
  inputs: [
    {
      id: "train_data_in",
      name: "Training Data",
      type: "dataframe",
      direction: "input",
      required: true,
    },
  ],
  outputs: [
    {
      id: "model_out",
      name: "Trained Model",
      type: "model",
      direction: "output",
    },
  ],
  configSchema: {
    n_estimators: {
      name: "n_estimators",
      label: "Number of Trees",
      type: "number",
      defaultValue: 100,
      min: 1,
      max: 1000,
    },
    random_state: {
      name: "random_state",
      label: "Random State",
      type: "number",
      defaultValue: 42,
    },
  },
  pythonDependencies: ["scikit-learn"],
};

export const PREDICT_DEFINITION: BlockDefinition = {
  id: "ml.predict",
  name: "Predict",
  category: "evaluation",
  version: "0.1.0",
  description: "Generates predictions using a trained model on test data",
  inputs: [
    {
      id: "model_in",
      name: "Model",
      type: "model",
      direction: "input",
      required: true,
    },
    {
      id: "test_data_in",
      name: "Test Data",
      type: "dataframe",
      direction: "input",
      required: true,
    },
  ],
  outputs: [
    {
      id: "predictions_out",
      name: "Predictions",
      type: "array",
      direction: "output",
    },
  ],
  pythonDependencies: ["scikit-learn"],
};

export const ACCURACY_DEFINITION: BlockDefinition = {
  id: "eval.accuracy",
  name: "Accuracy Score",
  category: "evaluation",
  version: "0.1.0",
  description: "Computes accuracy score comparing predictions to ground truth",
  inputs: [
    {
      id: "predictions_in",
      name: "Predictions",
      type: "array",
      direction: "input",
      required: true,
    },
    {
      id: "ground_truth_in",
      name: "Ground Truth",
      type: "series",
      direction: "input",
      required: true,
    },
  ],
  outputs: [
    {
      id: "score_out",
      name: "Accuracy",
      type: "scalar",
      direction: "output",
    },
  ],
  pythonDependencies: ["scikit-learn"],
};

export const CONFUSION_MATRIX_DEFINITION: BlockDefinition = {
  id: "eval.confusion_matrix",
  name: "Confusion Matrix",
  category: "evaluation",
  version: "0.1.0",
  description: "Generates a confusion matrix visualization",
  inputs: [
    {
      id: "predictions_in",
      name: "Predictions",
      type: "array",
      direction: "input",
      required: true,
    },
    {
      id: "ground_truth_in",
      name: "Ground Truth",
      type: "series",
      direction: "input",
      required: true,
    },
  ],
  outputs: [
    {
      id: "figure_out",
      name: "Confusion Matrix Figure",
      type: "figure",
      direction: "output",
    },
  ],
  pythonDependencies: ["scikit-learn", "matplotlib"],
};

/**
 * All MVP Iris pipeline block definitions as an array.
 */
export const IRIS_BLOCK_DEFINITIONS: BlockDefinition[] = [
  CSV_LOADER_DEFINITION,
  TRAIN_TEST_SPLIT_DEFINITION,
  RANDOM_FOREST_CLASSIFIER_DEFINITION,
  PREDICT_DEFINITION,
  ACCURACY_DEFINITION,
  CONFUSION_MATRIX_DEFINITION,
];

import type { BlockDefinition } from "@codebrix/types";

/**
 * Comprehensive catalogue of production Machine Learning, Preprocessing,
 * Data I/O, Evaluation, and Diagnostic Visualizer blocks for CodeBrix.
 */
export const BUILTIN_ML_BLOCKS: BlockDefinition[] = [
  // ─── DATA I/O & GENERATORS ─────────────────────────────────────────
  {
    id: "data.parquet_loader",
    name: "Parquet Loader",
    category: "data",
    version: "0.1.0",
    description: "Reads fast columnar Apache Parquet files (.parquet) into a pandas DataFrame.",
    inputs: [],
    outputs: [
      { id: "dataset_out", name: "DataFrame", type: "dataframe", direction: "output" },
    ],
    configSchema: {
      filePath: { name: "filePath", label: "Parquet File Path", type: "file", defaultValue: "", required: true },
      columns: { name: "columns", label: "Filter Columns (comma-separated)", type: "string", defaultValue: "" },
    },
    tags: ["data", "parquet", "loader", "columnar", "fast"],
  },
  {
    id: "data.synthetic_classification",
    name: "Synthetic Classification Generator",
    category: "data",
    version: "0.1.0",
    description: "Generates a synthetic multiclass classification dataset via make_classification.",
    inputs: [],
    outputs: [
      { id: "dataset_out", name: "Generated Data", type: "dataframe", direction: "output" },
    ],
    configSchema: {
      n_samples: { name: "n_samples", label: "Sample Count", type: "number", defaultValue: 200, min: 20, max: 10000 },
      n_features: { name: "n_features", label: "Feature Count", type: "number", defaultValue: 4, min: 2, max: 100 },
      n_classes: { name: "n_classes", label: "Class Count", type: "number", defaultValue: 2, min: 2, max: 10 },
      random_state: { name: "random_state", label: "Random Seed", type: "number", defaultValue: 42 },
    },
    tags: ["data", "generator", "synthetic", "classification"],
  },
  {
    id: "data.synthetic_regression",
    name: "Synthetic Regression Generator",
    category: "data",
    version: "0.1.0",
    description: "Generates a synthetic continuous target dataset via make_regression.",
    inputs: [],
    outputs: [
      { id: "dataset_out", name: "Generated Data", type: "dataframe", direction: "output" },
    ],
    configSchema: {
      n_samples: { name: "n_samples", label: "Sample Count", type: "number", defaultValue: 200, min: 20, max: 10000 },
      n_features: { name: "n_features", label: "Feature Count", type: "number", defaultValue: 4, min: 1, max: 100 },
      noise: { name: "noise", label: "Gaussian Noise", type: "number", defaultValue: 0.1, min: 0, max: 50 },
      random_state: { name: "random_state", label: "Random Seed", type: "number", defaultValue: 42 },
    },
    tags: ["data", "generator", "synthetic", "regression"],
  },
  {
    id: "data.export_csv",
    name: "Export to CSV",
    category: "data",
    version: "0.1.0",
    description: "Saves the transformed DataFrame to a local CSV file on disk.",
    inputs: [
      { id: "dataset_in", name: "DataFrame", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "file_out", name: "Saved File Path", type: "file", direction: "output" },
    ],
    configSchema: {
      output_path: { name: "output_path", label: "Target CSV Path", type: "string", defaultValue: "output.csv", required: true },
      include_index: { name: "include_index", label: "Write Index Column", type: "boolean", defaultValue: false },
    },
    tags: ["data", "export", "sink", "csv", "write"],
  },

  // ─── DATA PREPROCESSING & CLEANING ────────────────────────────────
  {
    id: "prep.imputer",
    name: "Missing Value Imputer",
    category: "preprocessing",
    version: "0.1.0",
    description: "Fills missing values (NaN/None) using statistical mean, median, mode, or constant value.",
    inputs: [
      { id: "dataset_in", name: "Input DataFrame", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "dataset_out", name: "Imputed DataFrame", type: "dataframe", direction: "output" },
    ],
    configSchema: {
      strategy: {
        name: "strategy",
        label: "Imputation Strategy",
        type: "select",
        defaultValue: "mean",
        options: [
          { label: "Mean (Numeric)", value: "mean" },
          { label: "Median (Robust)", value: "median" },
          { label: "Most Frequent (Mode)", value: "most_frequent" },
          { label: "Constant 0", value: "constant" },
        ],
      },
      columns: { name: "columns", label: "Target Columns (default: all)", type: "string", defaultValue: "all" },
    },
    tags: ["prep", "imputer", "missing", "nan", "cleaning"],
  },
  {
    id: "prep.drop_columns",
    name: "Drop Columns",
    category: "preprocessing",
    version: "0.1.0",
    description: "Removes specified columns or unwanted identifiers from the DataFrame.",
    inputs: [
      { id: "dataset_in", name: "Input DataFrame", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "dataset_out", name: "Filtered DataFrame", type: "dataframe", direction: "output" },
    ],
    configSchema: {
      columns_to_drop: { name: "columns_to_drop", label: "Columns to Remove (comma-separated)", type: "string", defaultValue: "id,unnamed" },
      drop_na_rows: { name: "drop_na_rows", label: "Drop Any Remaining NA Rows", type: "boolean", defaultValue: false },
    },
    tags: ["prep", "columns", "filter", "drop", "cleaning"],
  },
  {
    id: "prep.outlier_filter",
    name: "Outlier Filter (IQR)",
    category: "preprocessing",
    version: "0.1.0",
    description: "Filters statistical anomalies using Interquartile Range (IQR) bounds.",
    inputs: [
      { id: "dataset_in", name: "Input DataFrame", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "dataset_out", name: "Cleaned DataFrame", type: "dataframe", direction: "output" },
    ],
    configSchema: {
      iqr_multiplier: { name: "iqr_multiplier", label: "IQR Threshold Multiplier", type: "number", defaultValue: 1.5, min: 1.0, max: 3.5 },
    },
    tags: ["prep", "outlier", "iqr", "filter", "anomalies"],
  },
  {
    id: "prep.standard_scaler",
    name: "Standard Scaler (Z-Score)",
    category: "preprocessing",
    version: "0.1.0",
    description: "Standardizes numeric features by removing the mean and scaling to unit variance.",
    inputs: [
      { id: "dataset_in", name: "Input DataFrame", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "dataset_out", name: "Scaled DataFrame", type: "dataframe", direction: "output" },
    ],
    configSchema: {
      with_mean: { name: "with_mean", label: "Center Data with Mean", type: "boolean", defaultValue: true },
      with_std: { name: "with_std", label: "Scale to Unit Variance", type: "boolean", defaultValue: true },
    },
    tags: ["prep", "scaler", "standard", "zscore", "normalize"],
  },
  {
    id: "prep.minmax_scaler",
    name: "MinMax Scaler [0, 1]",
    category: "preprocessing",
    version: "0.1.0",
    description: "Scales features to a given range [min, max], typically between zero and one.",
    inputs: [
      { id: "dataset_in", name: "Input DataFrame", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "dataset_out", name: "Normalized DataFrame", type: "dataframe", direction: "output" },
    ],
    configSchema: {
      feature_range_min: { name: "feature_range_min", label: "Range Min", type: "number", defaultValue: 0 },
      feature_range_max: { name: "feature_range_max", label: "Range Max", type: "number", defaultValue: 1 },
    },
    tags: ["prep", "scaler", "minmax", "normalize", "range"],
  },
  {
    id: "prep.robust_scaler",
    name: "Robust Scaler (Median / IQR)",
    category: "preprocessing",
    version: "0.1.0",
    description: "Scales features using statistics that are robust to statistical outliers by removing the median and scaling via IQR.",
    inputs: [
      { id: "dataset_in", name: "Input DataFrame", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "dataset_out", name: "Robust Scaled DataFrame", type: "dataframe", direction: "output" },
    ],
    configSchema: {},
    tags: ["prep", "scaler", "robust", "outliers", "iqr"],
  },
  {
    id: "prep.encoder",
    name: "Categorical Encoder (One-Hot)",
    category: "preprocessing",
    version: "0.1.0",
    description: "Converts categorical text variables into dummy/indicator numeric columns using One-Hot Encoding.",
    inputs: [
      { id: "dataset_in", name: "Input DataFrame", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "dataset_out", name: "Encoded DataFrame", type: "dataframe", direction: "output" },
    ],
    configSchema: {
      method: {
        name: "method",
        label: "Encoding Method",
        type: "select",
        defaultValue: "onehot",
        options: [
          { label: "One-Hot Encoding", value: "onehot" },
          { label: "Label Encoding", value: "label" },
        ],
      },
    },
    tags: ["prep", "encoder", "onehot", "categorical", "dummy"],
  },

  // ─── SUPERVISED LEARNING: CLASSIFICATION ──────────────────────────
  {
    id: "ml.logistic_regression",
    name: "Logistic Regression",
    category: "ml",
    version: "0.1.0",
    description: "Linear classification model using log-odds probability estimation with L2 regularization.",
    inputs: [
      { id: "train_data_in", name: "Train Data", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "model_out", name: "Model", type: "model", direction: "output" },
    ],
    configSchema: {
      c_param: { name: "c_param", label: "Inverse Regularization (C)", type: "number", defaultValue: 1.0, min: 0.01, max: 100 },
      max_iter: { name: "max_iter", label: "Max Iterations", type: "number", defaultValue: 200, min: 50, max: 2000 },
      solver: {
        name: "solver",
        label: "Optimization Solver",
        type: "select",
        defaultValue: "lbfgs",
        options: [
          { label: "lbfgs (General multiclass)", value: "lbfgs" },
          { label: "liblinear (Small datasets)", value: "liblinear" },
          { label: "saga (Large datasets)", value: "saga" },
        ],
      },
    },
    tags: ["ml", "classifier", "linear", "logistic", "classification"],
  },
  {
    id: "ml.decision_tree_classifier",
    name: "Decision Tree Classifier",
    category: "ml",
    version: "0.1.0",
    description: "Non-parametric tree-based classification using recursive feature splits.",
    inputs: [
      { id: "train_data_in", name: "Train Data", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "model_out", name: "Model", type: "model", direction: "output" },
    ],
    configSchema: {
      criterion: {
        name: "criterion",
        label: "Split Quality Criterion",
        type: "select",
        defaultValue: "gini",
        options: [
          { label: "Gini Impurity", value: "gini" },
          { label: "Information Gain (Entropy)", value: "entropy" },
        ],
      },
      max_depth: { name: "max_depth", label: "Max Depth (0 for none)", type: "number", defaultValue: 5, min: 0, max: 50 },
      random_state: { name: "random_state", label: "Random Seed", type: "number", defaultValue: 42 },
    },
    tags: ["ml", "classifier", "tree", "decision", "cart"],
  },
  {
    id: "ml.gradient_boosting_classifier",
    name: "Gradient Boosting Classifier",
    category: "ml",
    version: "0.1.0",
    description: "Sequential boosting ensemble that optimizes loss gradients via weak learner trees.",
    inputs: [
      { id: "train_data_in", name: "Train Data", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "model_out", name: "Model", type: "model", direction: "output" },
    ],
    configSchema: {
      n_estimators: { name: "n_estimators", label: "Estimators", type: "number", defaultValue: 100, min: 10, max: 1000 },
      learning_rate: { name: "learning_rate", label: "Learning Rate (shrinkage)", type: "number", defaultValue: 0.1, min: 0.001, max: 1.0 },
      max_depth: { name: "max_depth", label: "Max Depth", type: "number", defaultValue: 3, min: 1, max: 20 },
    },
    tags: ["ml", "classifier", "ensemble", "boosting", "gbm"],
  },
  {
    id: "ml.svc",
    name: "Support Vector Classifier (SVC)",
    category: "ml",
    version: "0.1.0",
    description: "Support Vector Machine classifier finding the maximum-margin hyperplane.",
    inputs: [
      { id: "train_data_in", name: "Train Data", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "model_out", name: "Model", type: "model", direction: "output" },
    ],
    configSchema: {
      kernel: {
        name: "kernel",
        label: "Kernel Type",
        type: "select",
        defaultValue: "rbf",
        options: [
          { label: "Radial Basis Function (RBF)", value: "rbf" },
          { label: "Linear", value: "linear" },
          { label: "Polynomial", value: "poly" },
          { label: "Sigmoid", value: "sigmoid" },
        ],
      },
      c_param: { name: "c_param", label: "Penalty Parameter (C)", type: "number", defaultValue: 1.0, min: 0.01, max: 100 },
    },
    tags: ["ml", "classifier", "svm", "svc", "kernel"],
  },
  {
    id: "ml.knn_classifier",
    name: "K-Nearest Neighbors (KNN)",
    category: "ml",
    version: "0.1.0",
    description: "Instance-based classification voting over nearest feature-space neighbors.",
    inputs: [
      { id: "train_data_in", name: "Train Data", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "model_out", name: "Model", type: "model", direction: "output" },
    ],
    configSchema: {
      n_neighbors: { name: "n_neighbors", label: "Neighbors (K)", type: "number", defaultValue: 5, min: 1, max: 50 },
      weights: {
        name: "weights",
        label: "Neighbor Weighting",
        type: "select",
        defaultValue: "uniform",
        options: [
          { label: "Uniform (Equal weights)", value: "uniform" },
          { label: "Distance (Inverse distance)", value: "distance" },
        ],
      },
    },
    tags: ["ml", "classifier", "knn", "neighbors", "instance"],
  },
  {
    id: "ml.gaussian_nb",
    name: "Gaussian Naive Bayes",
    category: "ml",
    version: "0.1.0",
    description: "Probabilistic classifier applying Bayes theorem under feature independence assumptions.",
    inputs: [
      { id: "train_data_in", name: "Train Data", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "model_out", name: "Model", type: "model", direction: "output" },
    ],
    configSchema: {},
    tags: ["ml", "classifier", "bayes", "probabilistic", "naive"],
  },

  // ─── SUPERVISED LEARNING: REGRESSION ──────────────────────────────
  {
    id: "ml.linear_regression",
    name: "Linear Regression (OLS)",
    category: "ml",
    version: "0.1.0",
    description: "Ordinary least squares linear regression estimating continuous target coefficients.",
    inputs: [
      { id: "train_data_in", name: "Train Data", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "model_out", name: "Model", type: "model", direction: "output" },
    ],
    configSchema: {
      fit_intercept: { name: "fit_intercept", label: "Fit Intercept Term", type: "boolean", defaultValue: true },
    },
    tags: ["ml", "regression", "linear", "ols", "continuous"],
  },
  {
    id: "ml.ridge_regression",
    name: "Ridge Regression (L2)",
    category: "ml",
    version: "0.1.0",
    description: "Linear regression model with Tikhonov (L2 norm) shrinkage penalty against multicollinearity.",
    inputs: [
      { id: "train_data_in", name: "Train Data", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "model_out", name: "Model", type: "model", direction: "output" },
    ],
    configSchema: {
      alpha: { name: "alpha", label: "Regularization Strength (Alpha)", type: "number", defaultValue: 1.0, min: 0.001, max: 1000 },
    },
    tags: ["ml", "regression", "ridge", "l2", "regularization"],
  },
  {
    id: "ml.lasso_regression",
    name: "Lasso Regression (L1)",
    category: "ml",
    version: "0.1.0",
    description: "Linear model with L1 penalty that naturally performs sparse feature selection.",
    inputs: [
      { id: "train_data_in", name: "Train Data", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "model_out", name: "Model", type: "model", direction: "output" },
    ],
    configSchema: {
      alpha: { name: "alpha", label: "Sparsity Strength (Alpha)", type: "number", defaultValue: 0.1, min: 0.0001, max: 100 },
    },
    tags: ["ml", "regression", "lasso", "l1", "sparse"],
  },
  {
    id: "ml.random_forest_regressor",
    name: "Random Forest Regressor",
    category: "ml",
    version: "0.1.0",
    description: "Ensemble of randomized decision regression trees that averages predictions.",
    inputs: [
      { id: "train_data_in", name: "Train Data", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "model_out", name: "Model", type: "model", direction: "output" },
    ],
    configSchema: {
      n_estimators: { name: "n_estimators", label: "Number of Trees", type: "number", defaultValue: 100, min: 10, max: 1000 },
      max_depth: { name: "max_depth", label: "Max Depth (0 for unconstrained)", type: "number", defaultValue: 10, min: 0, max: 100 },
      random_state: { name: "random_state", label: "Random Seed", type: "number", defaultValue: 42 },
    },
    tags: ["ml", "regression", "forest", "ensemble", "trees"],
  },
  {
    id: "ml.gradient_boosting_regressor",
    name: "Gradient Boosting Regressor",
    category: "ml",
    version: "0.1.0",
    description: "Gradient boosted trees optimizing squared or absolute regression loss.",
    inputs: [
      { id: "train_data_in", name: "Train Data", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "model_out", name: "Model", type: "model", direction: "output" },
    ],
    configSchema: {
      n_estimators: { name: "n_estimators", label: "Estimators", type: "number", defaultValue: 100, min: 10, max: 1000 },
      learning_rate: { name: "learning_rate", label: "Learning Rate", type: "number", defaultValue: 0.1, min: 0.001, max: 1.0 },
    },
    tags: ["ml", "regression", "boosting", "gbm"],
  },
  {
    id: "ml.svr",
    name: "Support Vector Regressor (SVR)",
    category: "ml",
    version: "0.1.0",
    description: "Epsilon-SVR model fitting continuous functions within a margin tolerance tube.",
    inputs: [
      { id: "train_data_in", name: "Train Data", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "model_out", name: "Model", type: "model", direction: "output" },
    ],
    configSchema: {
      c_param: { name: "c_param", label: "Penalty Parameter (C)", type: "number", defaultValue: 1.0, min: 0.01, max: 100 },
      epsilon: { name: "epsilon", label: "Epsilon Margin", type: "number", defaultValue: 0.1, min: 0.001, max: 10 },
    },
    tags: ["ml", "regression", "svr", "svm"],
  },

  // ─── UNSUPERVISED & CLUSTERING ────────────────────────────────────
  {
    id: "ml.kmeans",
    name: "K-Means Clustering",
    category: "ml",
    version: "0.1.0",
    description: "Partitions feature space into K Voronoi clusters by minimizing inertia/variance.",
    inputs: [
      { id: "train_data_in", name: "Input Features", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "model_out", name: "Trained Clusterer", type: "model", direction: "output" },
      { id: "predictions_out", name: "Cluster Labels", type: "series", direction: "output" },
    ],
    configSchema: {
      n_clusters: { name: "n_clusters", label: "Clusters (K)", type: "number", defaultValue: 3, min: 2, max: 50 },
      max_iter: { name: "max_iter", label: "Max Iterations", type: "number", defaultValue: 300, min: 10, max: 2000 },
      random_state: { name: "random_state", label: "Random Seed", type: "number", defaultValue: 42 },
    },
    tags: ["ml", "clustering", "unsupervised", "kmeans", "partition"],
  },
  {
    id: "ml.pca",
    name: "PCA (Dimensionality Reduction)",
    category: "preprocessing",
    version: "0.1.0",
    description: "Projects high-dimensional features onto principal components explaining maximal variance.",
    inputs: [
      { id: "dataset_in", name: "Input Features", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "dataset_out", name: "Reduced Features", type: "dataframe", direction: "output" },
    ],
    configSchema: {
      n_components: { name: "n_components", label: "Target Dimensions", type: "number", defaultValue: 2, min: 1, max: 50 },
    },
    tags: ["prep", "pca", "dimensionality", "decomposition", "unsupervised"],
  },
  {
    id: "prep.pca",
    name: "Principal Component Analysis (PCA)",
    category: "preprocessing",
    version: "0.1.0",
    description: "Linear dimensionality reduction technique decomposing features into orthogonal principal axes.",
    inputs: [
      { id: "dataset_in", name: "Input Features", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "dataset_out", name: "Decomposed Features", type: "dataframe", direction: "output" },
    ],
    configSchema: {
      n_components: { name: "n_components", label: "Target Dimensions", type: "number", defaultValue: 2, min: 1, max: 50 },
    },
    tags: ["prep", "pca", "dimensionality", "decomposition", "unsupervised"],
  },
  {
    id: "ml.dbscan",
    name: "DBSCAN Density Clustering",
    category: "ml",
    version: "0.1.0",
    description: "Density-based spatial clustering identifying clusters and noise outliers.",
    inputs: [
      { id: "train_data_in", name: "Input Features", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "model_out", name: "Clusterer", type: "model", direction: "output" },
      { id: "predictions_out", name: "Cluster Labels", type: "series", direction: "output" },
    ],
    configSchema: {
      eps: { name: "eps", label: "Epsilon Distance", type: "number", defaultValue: 0.5, min: 0.01, max: 20 },
      min_samples: { name: "min_samples", label: "Min Samples per Cluster", type: "number", defaultValue: 5, min: 2, max: 100 },
    },
    tags: ["ml", "clustering", "dbscan", "density", "unsupervised"],
  },

  // ─── INFERENCE & SCORING ──────────────────────────────────────────
  {
    id: "ml.predict_proba",
    name: "Probability Estimator",
    category: "ml",
    version: "0.1.0",
    description: "Computes calibrated class probability distributions for test samples.",
    inputs: [
      { id: "model_in", name: "Trained Model", type: "model", direction: "input", required: true },
      { id: "test_data_in", name: "Test Features", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "predictions_out", name: "Class Probabilities", type: "dataframe", direction: "output" },
    ],
    configSchema: {},
    tags: ["ml", "predict", "probabilities", "scoring", "softmax"],
  },

  // ─── EVALUATION & DIAGNOSTICS ─────────────────────────────────────
  {
    id: "eval.classification_report",
    name: "Classification Report",
    category: "evaluation",
    version: "0.1.0",
    description: "Evaluates per-class precision, recall, f1-score, and support metrics.",
    inputs: [
      { id: "predictions_in", name: "Predictions", type: "series", direction: "input", required: true },
      { id: "ground_truth_in", name: "Ground Truth", type: "series", direction: "input", required: true },
    ],
    outputs: [
      { id: "score_out", name: "F1 Macro Score", type: "scalar", direction: "output" },
    ],
    configSchema: {},
    tags: ["eval", "precision", "recall", "f1", "report", "metrics"],
  },
  {
    id: "eval.regression_metrics",
    name: "Regression Metrics (MSE / R²)",
    category: "evaluation",
    version: "0.1.0",
    description: "Calculates Mean Squared Error (MSE), RMSE, MAE, and R² Score for continuous models.",
    inputs: [
      { id: "predictions_in", name: "Predicted Values", type: "series", direction: "input", required: true },
      { id: "ground_truth_in", name: "True Values", type: "series", direction: "input", required: true },
    ],
    outputs: [
      { id: "score_out", name: "R² Score", type: "scalar", direction: "output" },
    ],
    configSchema: {},
    tags: ["eval", "mse", "rmse", "mae", "r2", "regression"],
  },
  {
    id: "eval.kfold",
    name: "K-Fold Cross Validation",
    category: "evaluation",
    version: "0.1.0",
    description: "Splits dataset into K folds and returns stratified cross-validation scores.",
    inputs: [
      { id: "train_data_in", name: "Dataset", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "score_out", name: "Mean CV Score", type: "scalar", direction: "output" },
    ],
    configSchema: {
      n_splits: { name: "n_splits", label: "Folds (K)", type: "number", defaultValue: 5, min: 2, max: 20 },
      scoring: {
        name: "scoring",
        label: "Evaluation Metric",
        type: "select",
        defaultValue: "accuracy",
        options: [
          { label: "Accuracy", value: "accuracy" },
          { label: "F1 Weighted", value: "f1_weighted" },
          { label: "R2 Score", value: "r2" },
          { label: "Negative MSE", value: "neg_mean_squared_error" },
        ],
      },
    },
    tags: ["eval", "cross-validation", "kfold", "scoring"],
  },

  // ─── VISUALIZATION & DIAGNOSTIC PLOTS ─────────────────────────────
  {
    id: "viz.scatter_plot",
    name: "Scatter Plot",
    category: "visualization",
    version: "0.1.0",
    description: "Generates an interactive 2D scatter plot comparing two numeric columns.",
    inputs: [
      { id: "dataset_in", name: "DataFrame", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "matrix_out", name: "Figure Output", type: "figure", direction: "output" },
    ],
    configSchema: {
      x_column: { name: "x_column", label: "X Axis Column", type: "string", defaultValue: "sepal_length" },
      y_column: { name: "y_column", label: "Y Axis Column", type: "string", defaultValue: "sepal_width" },
      color_column: { name: "color_column", label: "Color / Hue Column (optional)", type: "string", defaultValue: "species" },
    },
    tags: ["viz", "scatter", "plot", "chart", "distribution"],
  },
  {
    id: "viz.histogram",
    name: "Feature Distribution / Histogram",
    category: "visualization",
    version: "0.1.0",
    description: "Plots frequency distribution histograms with density curve approximations.",
    inputs: [
      { id: "dataset_in", name: "DataFrame", type: "dataframe", direction: "input", required: true },
    ],
    outputs: [
      { id: "matrix_out", name: "Figure Output", type: "figure", direction: "output" },
    ],
    configSchema: {
      column: { name: "column", label: "Feature Column", type: "string", defaultValue: "petal_length" },
      bins: { name: "bins", label: "Bin Count", type: "number", defaultValue: 20, min: 5, max: 100 },
    },
    tags: ["viz", "histogram", "distribution", "density"],
  },
  {
    id: "viz.feature_importance",
    name: "Feature Importance Plot",
    category: "visualization",
    version: "0.1.0",
    description: "Visualizes relative feature importance coefficients from trained tree or linear models.",
    inputs: [
      { id: "train_data_in", name: "Model / Feature Source", type: "any", direction: "input", required: true },
    ],
    outputs: [
      { id: "matrix_out", name: "Figure Output", type: "figure", direction: "output" },
    ],
    configSchema: {
      top_n: { name: "top_n", label: "Top Features Count", type: "number", defaultValue: 10, min: 2, max: 50 },
    },
    tags: ["viz", "importance", "features", "explanation", "xai"],
  },

  // ─── CONTROL FLOW & CUSTOM SCRIPT ─────────────────────────────────
  {
    id: "core.python_script",
    name: "Custom Python Script",
    category: "core",
    version: "0.1.0",
    description: "Executes an inline user-defined Python script with input/output variable binding.",
    inputs: [
      { id: "data_in", name: "Input Data", type: "any", direction: "input" },
    ],
    outputs: [
      { id: "data_out", name: "Output Data", type: "any", direction: "output" },
    ],
    configSchema: {
      code: {
        name: "code",
        label: "Python Code",
        type: "string",
        defaultValue: `# data_in is available as the incoming variable\n# Assign your result to data_out\ndata_out = data_in`,
      },
    },
    tags: ["core", "python", "script", "code", "custom", "inline"],
  },
];

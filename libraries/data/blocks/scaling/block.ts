import type { BlockDefinition } from "@codebrix/types";

export const scalingBlockDefinition: BlockDefinition = {
  id: "data.scaler",
  name: "Feature Scaler",
  category: "preprocessing",
  version: "0.1.0",
  description: "Standardizes or scales numerical features using StandardScaler, MinMaxScaler, or RobustScaler.",
  inputs: [
    {
      id: "dataset_in",
      name: "Input DataFrame",
      type: "dataframe",
      direction: "input",
      description: "Tabular dataset containing numerical columns to scale",
    },
  ],
  outputs: [
    {
      id: "dataset_out",
      name: "Scaled DataFrame",
      type: "dataframe",
      direction: "output",
      description: "DataFrame with scaled numerical features",
    },
  ],
  configSchema: {
    method: {
      name: "method",
      label: "Scaling Method",
      type: "select",
      defaultValue: "standard",
      options: [
        { label: "Standard Scaler (Z-Score)", value: "standard" },
        { label: "MinMax Scaler (Range 0-1)", value: "minmax" },
        { label: "Robust Scaler (Median & IQR)", value: "robust" },
      ],
      description: "Transformation algorithm to normalize numeric distributions",
    },
    features: {
      name: "features",
      label: "Features to Scale",
      type: "string",
      defaultValue: "all",
      description: "Comma-separated column names, or 'all' to select all numeric columns",
    },
  },
  pythonDependencies: ["scikit-learn>=1.3.0", "pandas>=2.0.0"],
  tags: ["scaling", "standardize", "minmax", "robust", "normalization", "preprocessing"],
};

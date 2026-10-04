import type { BlockDefinition } from "@codebrix/types";

export const encodingBlockDefinition: BlockDefinition = {
  id: "data.encoder",
  name: "Categorical Encoder",
  category: "preprocessing",
  version: "0.1.0",
  description: "Encodes categorical features using One-Hot Encoding, Label Encoding, or Ordinal Encoding.",
  inputs: [
    {
      id: "dataset_in",
      name: "Input DataFrame",
      type: "dataframe",
      direction: "input",
      description: "Tabular dataset containing categorical or string columns",
    },
  ],
  outputs: [
    {
      id: "dataset_out",
      name: "Encoded DataFrame",
      type: "dataframe",
      direction: "output",
      description: "DataFrame with encoded numerical representation",
    },
  ],
  configSchema: {
    method: {
      name: "method",
      label: "Encoding Method",
      type: "select",
      defaultValue: "onehot",
      options: [
        { label: "One-Hot Encoding (pd.get_dummies)", value: "onehot" },
        { label: "Label Encoding (Integer mapping)", value: "label" },
        { label: "Ordinal Encoding (Categorical codes)", value: "ordinal" },
      ],
      description: "Strategy for converting categorical variables to numeric values",
    },
    columns: {
      name: "columns",
      label: "Target Columns",
      type: "string",
      defaultValue: "auto",
      description: "Comma-separated column names, or 'auto' for object/categorical columns",
    },
    dropFirst: {
      name: "dropFirst",
      label: "Drop First Category",
      type: "boolean",
      defaultValue: false,
      description: "Drop first category to prevent collinearity in dummy variables",
    },
  },
  pythonDependencies: ["pandas>=2.0.0", "scikit-learn>=1.3.0"],
  tags: ["encoding", "onehot", "dummies", "label", "ordinal", "categorical", "preprocessing"],
};

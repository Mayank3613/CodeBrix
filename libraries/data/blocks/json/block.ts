import type { BlockDefinition } from "@codebrix/types";

export const jsonBlockDefinition: BlockDefinition = {
  id: "data.json_loader",
  name: "JSON Loader",
  category: "data",
  version: "0.1.0",
  description: "Reads structured JSON dataset into a pandas DataFrame.",
  inputs: [],
  outputs: [
    {
      id: "dataset_out",
      name: "DataFrame",
      type: "dataframe",
      direction: "output",
      description: "Loaded tabular pandas DataFrame from JSON",
    },
  ],
  configSchema: {
    filePath: {
      name: "filePath",
      label: "JSON File Path",
      type: "file",
      required: true,
      defaultValue: "data.json",
      description: "Path to local JSON file",
    },
    orient: {
      name: "orient",
      label: "Orient",
      type: "select",
      defaultValue: "records",
      options: [
        { label: "Records", value: "records" },
        { label: "Split", value: "split" },
        { label: "Index", value: "index" },
        { label: "Columns", value: "columns" },
        { label: "Values", value: "values" },
      ],
      description: "Expected JSON string format",
    },
  },
  pythonDependencies: ["pandas>=2.0.0"],
  tags: ["json", "load", "pandas", "data"],
};

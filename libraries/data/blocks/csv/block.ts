import type { BlockDefinition } from "@codebrix/types";

export const csvBlockDefinition: BlockDefinition = {
  id: "data.csv_loader",
  name: "CSV Loader",
  category: "data",
  version: "0.1.0",
  description: "Reads tabular dataset from comma-separated values (CSV) file using pandas.",
  inputs: [],
  outputs: [
    {
      id: "dataset_out",
      name: "DataFrame",
      type: "dataframe",
      direction: "output",
      description: "Loaded tabular pandas DataFrame",
    },
  ],
  configSchema: {
    filePath: {
      name: "filePath",
      label: "File Path",
      type: "file",
      required: true,
      defaultValue: "tests/fixtures/iris.csv",
      description: "Path to the local CSV file",
    },
    delimiter: {
      name: "delimiter",
      label: "Delimiter",
      type: "string",
      defaultValue: ",",
      description: "Field separator character",
    },
    hasHeader: {
      name: "hasHeader",
      label: "Has Header",
      type: "boolean",
      defaultValue: true,
      description: "Whether the first row contains column headers",
    },
  },
  pythonDependencies: ["pandas>=2.0.0"],
  tags: ["csv", "load", "pandas", "data"],
};

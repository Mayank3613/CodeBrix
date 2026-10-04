import type { BlockDefinition } from "@codebrix/types";

export const excelBlockDefinition: BlockDefinition = {
  id: "data.excel_loader",
  name: "Excel Loader",
  category: "data",
  version: "0.1.0",
  description: "Reads tabular dataset from Excel (.xlsx, .xls) spreadsheet file using pandas and openpyxl.",
  inputs: [],
  outputs: [
    {
      id: "dataset_out",
      name: "DataFrame",
      type: "dataframe",
      direction: "output",
      description: "Loaded tabular pandas DataFrame from worksheet",
    },
  ],
  configSchema: {
    filePath: {
      name: "filePath",
      label: "Excel File Path",
      type: "file",
      required: true,
      defaultValue: "data.xlsx",
      description: "Path to the local Excel spreadsheet",
    },
    sheetName: {
      name: "sheetName",
      label: "Sheet Name",
      type: "string",
      defaultValue: "Sheet1",
      description: "Worksheet name or sheet index",
    },
    headerRow: {
      name: "headerRow",
      label: "Header Row Index",
      type: "number",
      min: 0,
      defaultValue: 0,
      description: "Row number containing column names (0-indexed)",
    },
  },
  pythonDependencies: ["pandas>=2.0.0", "openpyxl>=3.1.0"],
  tags: ["excel", "xlsx", "xls", "spreadsheet", "pandas", "data"],
};

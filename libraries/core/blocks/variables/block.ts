import type { BlockDefinition } from "@codebrix/types";

export const variablesBlockDefinition: BlockDefinition = {
  id: "core.variables",
  name: "Variable",
  category: "core",
  version: "0.1.0",
  description: "Defines a typed variable (number, string, boolean, or JSON) for workflow parameterization.",
  inputs: [
    {
      id: "input_val",
      name: "Input Override",
      type: "any",
      direction: "input",
      description: "Optional dynamic value overriding the static configuration",
    },
  ],
  outputs: [
    {
      id: "val_out",
      name: "Value",
      type: "any",
      direction: "output",
      description: "Variable value output for downstream blocks",
    },
  ],
  configSchema: {
    varName: {
      name: "varName",
      label: "Variable Name",
      type: "string",
      required: true,
      defaultValue: "var_1",
      description: "Identifier for the variable in generated code",
    },
    varType: {
      name: "varType",
      label: "Variable Type",
      type: "select",
      required: true,
      defaultValue: "number",
      options: [
        { label: "Number", value: "number" },
        { label: "String", value: "string" },
        { label: "Boolean", value: "boolean" },
        { label: "JSON / Dict", value: "json" },
      ],
      description: "Data type of the variable value",
    },
    varValue: {
      name: "varValue",
      label: "Value",
      type: "string",
      required: true,
      defaultValue: "42",
      description: "Scalar value or JSON representation",
    },
  },
  pythonDependencies: [],
  tags: ["core", "variable", "constant", "parameter", "value"],
};

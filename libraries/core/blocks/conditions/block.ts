import type { BlockDefinition } from "@codebrix/types";

export const conditionsBlockDefinition: BlockDefinition = {
  id: "core.conditions",
  name: "Condition",
  category: "core",
  version: "0.1.0",
  description: "Evaluates a condition predicate (equals, greater than, less than, etc.) and routes or filters data.",
  inputs: [
    {
      id: "input_val",
      name: "Input",
      type: "any",
      direction: "input",
      description: "Primary value or operand to test",
    },
    {
      id: "compare_val",
      name: "Compare With",
      type: "any",
      direction: "input",
      description: "Optional secondary value to compare against",
    },
  ],
  outputs: [
    {
      id: "result",
      name: "Condition Result",
      type: "boolean",
      direction: "output",
      description: "Boolean boolean evaluation result (True / False)",
    },
    {
      id: "true_branch",
      name: "If True",
      type: "any",
      direction: "output",
      description: "Passes through input value if condition is True",
    },
    {
      id: "false_branch",
      name: "If False",
      type: "any",
      direction: "output",
      description: "Passes through input value if condition is False",
    },
  ],
  configSchema: {
    operator: {
      name: "operator",
      label: "Operator",
      type: "select",
      required: true,
      defaultValue: "==",
      options: [
        { label: "Equals (==)", value: "==" },
        { label: "Not Equals (!=)", value: "!=" },
        { label: "Greater Than (>)", value: ">" },
        { label: "Greater Than or Equal (>=)", value: ">=" },
        { label: "Less Than (<)", value: "<" },
        { label: "Less Than or Equal (<=)", value: "<=" },
        { label: "Is Not None", value: "is not None" },
        { label: "Is None", value: "is None" },
      ],
      description: "Comparison operator to evaluate",
    },
    threshold: {
      name: "threshold",
      label: "Threshold / Value",
      type: "string",
      required: false,
      defaultValue: "0",
      description: "Constant threshold if 'Compare With' input is unconnected",
    },
  },
  pythonDependencies: [],
  tags: ["core", "condition", "branch", "if", "filter", "logic", "flow"],
};

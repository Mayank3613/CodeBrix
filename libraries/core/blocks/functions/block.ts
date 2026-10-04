import type { BlockDefinition } from "@codebrix/types";

export const functionsBlockDefinition: BlockDefinition = {
  id: "core.functions",
  name: "Function",
  category: "core",
  version: "0.1.0",
  description: "Declares a reusable custom Python function with defined parameters and return expression.",
  inputs: [
    {
      id: "input_arg",
      name: "Input Argument",
      type: "any",
      direction: "input",
      description: "Primary argument passed to the function call",
    },
    {
      id: "secondary_arg",
      name: "Second Argument",
      type: "any",
      direction: "input",
      description: "Optional secondary argument",
    },
  ],
  outputs: [
    {
      id: "return_val",
      name: "Result",
      type: "any",
      direction: "output",
      description: "Return value from invoking the custom function",
    },
  ],
  configSchema: {
    functionName: {
      name: "functionName",
      label: "Function Name",
      type: "string",
      required: true,
      defaultValue: "custom_transform",
      description: "Identifier for the function in generated Python code",
    },
    parameters: {
      name: "parameters",
      label: "Parameters",
      type: "string",
      required: false,
      defaultValue: "x",
      description: "Comma-separated list of parameter names (e.g. x, y=10)",
    },
    returnExpr: {
      name: "returnExpr",
      label: "Return Expression / Body",
      type: "string",
      required: true,
      defaultValue: "x * 2",
      description: "Expression returned by the function",
    },
    docstring: {
      name: "docstring",
      label: "Docstring",
      type: "string",
      required: false,
      defaultValue: "Applies custom transformation.",
      description: "Documentation string embedded into the Python function",
    },
  },
  pythonDependencies: [],
  tags: ["core", "function", "def", "lambda", "transform", "custom", "procedure"],
};

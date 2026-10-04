import type { BlockDefinition } from "@codebrix/types";

export const loopsBlockDefinition: BlockDefinition = {
  id: "core.loops",
  name: "Loop",
  category: "core",
  version: "0.1.0",
  description: "Iterates over an array/collection or executes a fixed count range loop in Python.",
  inputs: [
    {
      id: "collection_in",
      name: "Collection",
      type: "array",
      direction: "input",
      description: "Optional iterable collection or list to loop over",
    },
    {
      id: "count_in",
      name: "Count / Limit",
      type: "number",
      direction: "input",
      description: "Optional dynamic iteration count or range limit",
    },
  ],
  outputs: [
    {
      id: "item_out",
      name: "Current Item",
      type: "any",
      direction: "output",
      description: "Value of the current iteration element",
    },
    {
      id: "index_out",
      name: "Iteration Index",
      type: "number",
      direction: "output",
      description: "Zero-based iteration step counter (i)",
    },
    {
      id: "accumulated_out",
      name: "Accumulated List",
      type: "array",
      direction: "output",
      description: "Aggregated results collected across loop iterations",
    },
  ],
  configSchema: {
    loopType: {
      name: "loopType",
      label: "Loop Type",
      type: "select",
      required: true,
      defaultValue: "range",
      options: [
        { label: "Range (Fixed Count)", value: "range" },
        { label: "For Each (Collection)", value: "for_each" },
        { label: "While (Conditional)", value: "while" },
      ],
      description: "Iteration pattern to generate",
    },
    iterations: {
      name: "iterations",
      label: "Iterations (Range)",
      type: "number",
      required: false,
      defaultValue: 5,
      min: 1,
      max: 10000,
      description: "Number of times to loop when using Range mode",
    },
    itemName: {
      name: "itemName",
      label: "Loop Variable Name",
      type: "string",
      required: false,
      defaultValue: "item",
      description: "Name of the loop iteration item variable in Python",
    },
  },
  pythonDependencies: [],
  tags: ["core", "loop", "for", "while", "iterate", "repeat", "range"],
};

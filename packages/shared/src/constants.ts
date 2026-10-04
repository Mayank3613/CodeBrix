import type { PortType } from "@codebrix/types";

export const CONTRACT_VERSION = "0.1.0" as const;

/**
 * Compatible target port types for a given source port type.
 * e.g., 'dataframe' can feed into 'dataframe', 'dataset', or 'any'.
 */
export const PORT_COMPATIBILITY_MAP: Record<PortType, PortType[]> = {
  dataset: ["dataset", "dataframe", "any"],
  dataframe: ["dataframe", "dataset", "any"],
  series: ["series", "array", "any"],
  model: ["model", "any"],
  scalar: ["scalar", "number", "string", "any"],
  number: ["number", "scalar", "any"],
  string: ["string", "scalar", "any"],
  boolean: ["boolean", "scalar", "any"],
  array: ["array", "series", "any"],
  file: ["file", "string", "any"],
  figure: ["figure", "any"],
  dict: ["dict", "any"],
  any: [
    "dataset",
    "dataframe",
    "series",
    "model",
    "scalar",
    "number",
    "string",
    "boolean",
    "array",
    "file",
    "figure",
    "dict",
    "any",
  ],
};

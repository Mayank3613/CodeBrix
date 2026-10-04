/**
 * Port data types supported by CodeBrix dataflow and ML execution.
 */
export type PortType =
  | "dataset"       // Raw or loaded tabular dataset
  | "dataframe"     // Pandas DataFrame
  | "series"        // Pandas Series
  | "model"         // Trained or untrained ML estimator/model
  | "scalar"        // Single numeric or string value
  | "number"        // Numeric value
  | "string"        // Text value
  | "boolean"       // Boolean flag
  | "array"         // Array/List of items
  | "file"          // File path or file descriptor
  | "figure"        // Matplotlib/Plotly figure
  | "dict"          // Key-value dictionary / mapping
  | "any";          // Generic/wildcard type

/**
 * Direction of the port relative to the block.
 */
export type PortDirection = "input" | "output";

/**
 * Port contract definition on a block definition.
 */
export interface PortDefinition {
  /** Unique identifier for the port within the block */
  id: string;
  /** Display label for the port in the UI */
  name: string;
  /** Supported data type */
  type: PortType;
  /** Input or output */
  direction: PortDirection;
  /** Whether an input port must be connected for the block to execute */
  required?: boolean;
  /** Description shown in tooltips and documentation */
  description?: string;
  /** Default fallback value if port is unconnected */
  defaultValue?: unknown;
  /** Whether the port accepts multiple incoming connections */
  multiple?: boolean;
}

/**
 * A port reference representing a concrete block instance's port.
 */
export interface PortReference {
  blockId: string;
  portId: string;
}

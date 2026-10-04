import type { PortDefinition } from "./ports.js";

/**
 * Category grouping for blocks in the palette and documentation.
 */
export type BlockCategory =
  | "data"           // CSV, JSON, Excel, Data loader
  | "preprocessing"  // Scaling, Encoding, Imputation, Train/Test Split
  | "ml"             // Random Forest, Linear Regression, KNN, Decision Tree
  | "evaluation"     // Predict, Accuracy, Confusion Matrix, Metrics
  | "visualization"  // Plots, Charts, Feature Importance
  | "core"           // Variables, Conditions, Flow controls
  | "custom";        // User-defined / community blocks

/**
 * Field configuration schema for block properties panel.
 */
export interface BlockConfigField {
  name: string;
  label: string;
  type: "string" | "number" | "boolean" | "select" | "slider" | "file";
  defaultValue?: unknown;
  options?: Array<{ label: string; value: unknown }>;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  description?: string;
  required?: boolean;
}

/**
 * Block Definition: The static metadata template for a type of block.
 */
export interface BlockDefinition {
  /** Unique identifier matching library convention (e.g. 'sklearn.ensemble.RandomForestClassifier') */
  id: string;
  /** Human-readable display name (e.g. 'Random Forest Classifier') */
  name: string;
  /** Primary category */
  category: BlockCategory;
  /** Semantic version of this block definition */
  version: string;
  /** Short summary of what the block performs */
  description: string;
  /** Declared input ports */
  inputs: PortDefinition[];
  /** Declared output ports */
  outputs: PortDefinition[];
  /** Schema for configurable parameters in the properties panel */
  configSchema?: Record<string, BlockConfigField>;
  /** Python package requirements needed by this block (e.g. ['scikit-learn>=1.3.0']) */
  pythonDependencies?: string[];
  /** URL or markdown docs */
  documentationUrl?: string;
  /** Block author or maintainer */
  author?: string;
  /** Tags for search filtering */
  tags?: string[];
}

/**
 * Execution state of an individual block instance.
 */
export type BlockState =
  | "idle"
  | "queued"
  | "running"
  | "success"
  | "failed"
  | "skipped"
  | "disabled";

/**
 * 2D Canvas coordinate position.
 */
export interface Position2D {
  x: number;
  y: number;
}

/**
 * Block Instance: A placed node on the workflow canvas.
 */
export interface BlockInstance {
  /** Unique UUID for this specific instance in the canvas */
  id: string;
  /** Reference to the BlockDefinition ID */
  definitionId: string;
  /** User-customized label or default block name */
  label?: string;
  /** 2D position on the canvas */
  position: Position2D;
  /** Current user configuration values matching configSchema */
  config: Record<string, unknown>;
  /** Runtime execution state */
  state?: BlockState;
  /** Error messages or warnings attached to this block */
  validationErrors?: string[];
}

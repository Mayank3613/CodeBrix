/**
 * CodeBrix Graph Engine - Version 0.1.0
 *
 * Developer 2 (ML & Execution) - Phase 1 deliverable.
 *
 * Provides: Block registry, graph builder, validator,
 * cycle detector, topological sort, and execution planning.
 */

export { BlockDefinitionRegistry } from "./registry.js";
export { GraphBuilder, type CanvasNode, type CanvasEdge } from "./graph-builder.js";
export { GraphValidator } from "./validator.js";
export { detectCycles, type CycleDetectionResult } from "./cycle-detector.js";
export {
  topologicalSort,
  computeDependencies,
  getExecutionPlan,
} from "./topological-sort.js";

// Reference block definitions for the Iris MVP pipeline
export {
  IRIS_BLOCK_DEFINITIONS,
  CSV_LOADER_DEFINITION,
  TRAIN_TEST_SPLIT_DEFINITION,
  RANDOM_FOREST_CLASSIFIER_DEFINITION,
  PREDICT_DEFINITION,
  ACCURACY_DEFINITION,
  CONFUSION_MATRIX_DEFINITION,
} from "./block-definitions.js";

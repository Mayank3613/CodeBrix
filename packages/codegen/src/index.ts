/**
 * CodeBrix Codegen Package - Version 0.1.0
 *
 * Developer 2 (ML & Execution) - Phase 2 deliverable.
 * Translates validated WorkflowGraph and ExecutionPlan into standalone, PEP-8 Python scripts.
 */

export { PythonCodeGenerator } from "./code-generator.js";
export {
  VariableResolver,
  getOutputVariableName,
  sanitizePythonIdentifier,
} from "./variable-resolver.js";
export {
  BlockGeneratorRegistry,
  CsvLoaderGenerator,
  JsonLoaderGenerator,
  ExcelLoaderGenerator,
  ScalerGenerator,
  EncoderGenerator,
  TrainTestSplitGenerator,
  RandomForestGenerator,
  PredictGenerator,
  AccuracyGenerator,
  ConfusionMatrixGenerator,
  FallbackBlockGenerator,
} from "./generators/index.js";
export type {
  CodegenOptions,
  BlockCodeContext,
  BlockCodeResult,
  BlockCodeGenerator,
  GeneratedScript,
} from "./types.js";

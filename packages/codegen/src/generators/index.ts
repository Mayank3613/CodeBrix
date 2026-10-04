import type { BlockCodeGenerator } from "../types.js";
import { CsvLoaderGenerator } from "./csv-loader.js";
import { TrainTestSplitGenerator } from "./train-test-split.js";
import { RandomForestGenerator } from "./random-forest.js";
import { PredictGenerator } from "./predict.js";
import { AccuracyGenerator } from "./accuracy.js";
import { ConfusionMatrixGenerator } from "./confusion-matrix.js";
import { FallbackBlockGenerator } from "./fallback.js";

export {
  CsvLoaderGenerator,
  TrainTestSplitGenerator,
  RandomForestGenerator,
  PredictGenerator,
  AccuracyGenerator,
  ConfusionMatrixGenerator,
  FallbackBlockGenerator,
};

/**
 * Registry of block-specific Python code generators.
 */
export class BlockGeneratorRegistry {
  private generators = new Map<string, BlockCodeGenerator>();
  private fallback: BlockCodeGenerator = new FallbackBlockGenerator();

  constructor() {
    this.registerDefaults();
  }

  /**
   * Registers all default MVP generators.
   */
  registerDefaults(): void {
    this.register(new CsvLoaderGenerator());
    this.register(new TrainTestSplitGenerator());
    this.register(new RandomForestGenerator());
    this.register(new PredictGenerator());
    this.register(new AccuracyGenerator());
    this.register(new ConfusionMatrixGenerator());
  }

  /**
   * Register a custom block generator.
   */
  register(generator: BlockCodeGenerator): void {
    this.generators.set(generator.definitionId, generator);
  }

  /**
   * Lookup generator for a definition ID, returning fallback if not found.
   */
  get(definitionId: string): BlockCodeGenerator {
    return this.generators.get(definitionId) ?? this.fallback;
  }

  /**
   * Check if a generator is registered for a definition ID.
   */
  has(definitionId: string): boolean {
    return this.generators.has(definitionId);
  }
}

import { describe, it, expect } from "vitest";
import {
  BlockGeneratorRegistry,
  CsvLoaderGenerator,
  TrainTestSplitGenerator,
  RandomForestGenerator,
  PredictGenerator,
  AccuracyGenerator,
  ConfusionMatrixGenerator,
  FallbackBlockGenerator,
} from "../generators/index.js";
import type { BlockCodeContext } from "../types.js";

const DEFAULT_OPTIONS = {
  includeProtocolHooks: true,
  includeComments: true,
  targetPythonVersion: "3.11",
  indentSpaces: 4,
};

describe("Block Code Generators", () => {
  describe("BlockGeneratorRegistry", () => {
    it("should have all 6 Iris MVP generators registered by default", () => {
      const registry = new BlockGeneratorRegistry();
      expect(registry.has("data.csv_loader")).toBe(true);
      expect(registry.has("ml.train_test_split")).toBe(true);
      expect(registry.has("ml.random_forest_classifier")).toBe(true);
      expect(registry.has("ml.predict")).toBe(true);
      expect(registry.has("eval.accuracy")).toBe(true);
      expect(registry.has("eval.confusion_matrix")).toBe(true);
    });

    it("should return the FallbackBlockGenerator for unknown block definitions", () => {
      const registry = new BlockGeneratorRegistry();
      const gen = registry.get("unknown.custom_block");
      expect(gen).toBeInstanceOf(FallbackBlockGenerator);
    });
  });

  describe("CsvLoaderGenerator", () => {
    it("should generate pd.read_csv code with config filePath", () => {
      const gen = new CsvLoaderGenerator();
      const context: BlockCodeContext = {
        block: {
          id: "b1",
          definitionId: "data.csv_loader",
          position: { x: 0, y: 0 },
          config: { filePath: "iris.csv" },
        },
        inputs: {},
        outputs: { dataset_out: "var_b1_out" },
        options: DEFAULT_OPTIONS,
      };

      const result = gen.generate(context);
      expect(result.imports).toContain("import pandas as pd");
      expect(result.code).toContain('var_b1_out = pd.read_csv(csv_path_b1)');
      expect(result.code).toContain('"iris.csv"');
    });
  });

  describe("TrainTestSplitGenerator", () => {
    it("should generate train_test_split with configurable test_size and random_state", () => {
      const gen = new TrainTestSplitGenerator();
      const context: BlockCodeContext = {
        block: {
          id: "b2",
          definitionId: "ml.train_test_split",
          position: { x: 0, y: 0 },
          config: { test_size: 0.25, random_state: 99, target_column: "label" },
        },
        inputs: { dataset_in: "var_b1_out" },
        outputs: {
          train_data_out: "var_b2_train",
          test_data_out: "var_b2_test",
          y_test_out: "var_b2_y_test",
        },
        options: DEFAULT_OPTIONS,
      };

      const result = gen.generate(context);
      expect(result.imports).toContain("from sklearn.model_selection import train_test_split");
      expect(result.code).toContain("test_size=0.25");
      expect(result.code).toContain("random_state=99");
      expect(result.code).toContain('"label"');
      expect(result.code).toContain("var_b2_train = pd.concat");
    });
  });

  describe("RandomForestGenerator", () => {
    it("should instantiate and fit RandomForestClassifier", () => {
      const gen = new RandomForestGenerator();
      const context: BlockCodeContext = {
        block: {
          id: "b3",
          definitionId: "ml.random_forest_classifier",
          position: { x: 0, y: 0 },
          config: { n_estimators: 150, random_state: 7 },
        },
        inputs: { train_data_in: "var_b2_train" },
        outputs: { model_out: "var_b3_model" },
        options: DEFAULT_OPTIONS,
      };

      const result = gen.generate(context);
      expect(result.imports).toContain("from sklearn.ensemble import RandomForestClassifier");
      expect(result.code).toContain("n_estimators=150");
      expect(result.code).toContain("random_state=7");
      expect(result.code).toContain("var_b3_model.fit(");
    });
  });

  describe("PredictGenerator", () => {
    it("should call model.predict on test data", () => {
      const gen = new PredictGenerator();
      const context: BlockCodeContext = {
        block: {
          id: "b4",
          definitionId: "ml.predict",
          position: { x: 0, y: 0 },
          config: {},
        },
        inputs: { model_in: "var_b3_model", test_data_in: "var_b2_test" },
        outputs: { predictions_out: "var_b4_preds" },
        options: DEFAULT_OPTIONS,
      };

      const result = gen.generate(context);
      expect(result.code).toContain("var_b4_preds = var_b3_model.predict(var_b2_test)");
    });
  });

  describe("AccuracyGenerator", () => {
    it("should compute accuracy_score and emit metrics event", () => {
      const gen = new AccuracyGenerator();
      const context: BlockCodeContext = {
        block: {
          id: "b5",
          definitionId: "eval.accuracy",
          position: { x: 0, y: 0 },
          config: {},
        },
        inputs: { predictions_in: "var_b4_preds", ground_truth_in: "var_b2_y_test" },
        outputs: { score_out: "var_b5_acc" },
        options: DEFAULT_OPTIONS,
      };

      const result = gen.generate(context);
      expect(result.imports).toContain("from sklearn.metrics import accuracy_score");
      expect(result.code).toContain("var_b5_acc = float(accuracy_score(var_b2_y_test, var_b4_preds))");
      expect(result.code).toContain('"title": "Model Accuracy"');
    });
  });

  describe("ConfusionMatrixGenerator", () => {
    it("should generate confusion_matrix and emit matrix metrics", () => {
      const gen = new ConfusionMatrixGenerator();
      const context: BlockCodeContext = {
        block: {
          id: "b6",
          definitionId: "eval.confusion_matrix",
          position: { x: 0, y: 0 },
          config: {},
        },
        inputs: { predictions_in: "var_b4_preds", ground_truth_in: "var_b2_y_test" },
        outputs: { figure_out: "var_b6_cm" },
        options: DEFAULT_OPTIONS,
      };

      const result = gen.generate(context);
      expect(result.imports).toContain("from sklearn.metrics import confusion_matrix");
      expect(result.code).toContain("confusion_matrix(var_b2_y_test, var_b4_preds)");
      expect(result.code).toContain('"title": "Confusion Matrix"');
    });
  });
});

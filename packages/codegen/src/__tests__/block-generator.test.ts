import { describe, it, expect } from "vitest";
import {
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
    it("should have all 10 default generators registered by default", () => {
      const registry = new BlockGeneratorRegistry();
      expect(registry.has("data.csv_loader")).toBe(true);
      expect(registry.has("data.json_loader")).toBe(true);
      expect(registry.has("data.excel_loader")).toBe(true);
      expect(registry.has("data.scaler")).toBe(true);
      expect(registry.has("data.encoder")).toBe(true);
      expect(registry.has("ml.train_test_split")).toBe(true);
      expect(registry.has("ml.random_forest_classifier")).toBe(true);
      expect(registry.has("ml.predict")).toBe(true);
      expect(registry.has("eval.accuracy")).toBe(true);
      expect(registry.has("eval.confusion_matrix")).toBe(true);
      expect(registry.list()).toHaveLength(10);
    });

    it("should return the FallbackBlockGenerator for unknown block definitions", () => {
      const registry = new BlockGeneratorRegistry();
      const gen = registry.get("unknown.custom_block");
      expect(gen).toBeInstanceOf(FallbackBlockGenerator);
    });
  });

  describe("CsvLoaderGenerator", () => {
    it("should generate pd.read_csv code with config filePath and path normalization", () => {
      const gen = new CsvLoaderGenerator();
      const context: BlockCodeContext = {
        block: {
          id: "b1",
          definitionId: "data.csv_loader",
          position: { x: 0, y: 0 },
          config: { filePath: '"C:\\data\\iris.csv"' },
        },
        inputs: {},
        outputs: { dataset_out: "var_b1_out" },
        options: DEFAULT_OPTIONS,
      };

      const result = gen.generate(context);
      expect(result.imports).toContain("import pandas as pd");
      expect(result.imports).toContain("import os");
      expect(result.code).toContain("var_b1_out = pd.read_csv(csv_path_b1");
      expect(result.code).toContain('"C:/data/iris.csv"');
    });
  });

  describe("JsonLoaderGenerator", () => {
    it("should generate pd.read_json code with configurable orient", () => {
      const gen = new JsonLoaderGenerator();
      const context: BlockCodeContext = {
        block: {
          id: "b_json",
          definitionId: "data.json_loader",
          position: { x: 0, y: 0 },
          config: { filePath: "dataset.json", orient: "records" },
        },
        inputs: {},
        outputs: { dataset_out: "df_json" },
        options: DEFAULT_OPTIONS,
      };

      const result = gen.generate(context);
      expect(result.imports).toContain("import pandas as pd");
      expect(result.code).toContain("df_json = pd.read_json(");
      expect(result.code).toContain('orient="records"');
    });
  });

  describe("ExcelLoaderGenerator", () => {
    it("should generate pd.read_excel code with sheet and header row", () => {
      const gen = new ExcelLoaderGenerator();
      const context: BlockCodeContext = {
        block: {
          id: "b_excel",
          definitionId: "data.excel_loader",
          position: { x: 0, y: 0 },
          config: { filePath: "dataset.xlsx", sheetName: "Sheet1", headerRow: 0 },
        },
        inputs: {},
        outputs: { dataset_out: "df_excel" },
        options: DEFAULT_OPTIONS,
      };

      const result = gen.generate(context);
      expect(result.imports).toContain("import pandas as pd");
      expect(result.code).toContain("df_excel = pd.read_excel(");
      expect(result.code).toContain('sheet_name="Sheet1"');
    });
  });

  describe("ScalerGenerator", () => {
    it("should generate standard scaling code", () => {
      const gen = new ScalerGenerator();
      const context: BlockCodeContext = {
        block: {
          id: "b_scale",
          definitionId: "data.scaler",
          position: { x: 0, y: 0 },
          config: { method: "standard", features: "all" },
        },
        inputs: { dataset_in: "df_in" },
        outputs: { dataset_out: "df_scaled" },
        options: DEFAULT_OPTIONS,
      };

      const result = gen.generate(context);
      expect(result.imports).toContain("from sklearn.preprocessing import StandardScaler");
      expect(result.code).toContain("df_scaled = df_in.copy()");
      expect(result.code).toContain("StandardScaler()");
    });

    it("should generate minmax scaling code for specific features", () => {
      const gen = new ScalerGenerator();
      const context: BlockCodeContext = {
        block: {
          id: "b_scale_minmax",
          definitionId: "data.scaler",
          position: { x: 0, y: 0 },
          config: { method: "minmax", features: "col1, col2" },
        },
        inputs: { dataset_in: "df_in" },
        outputs: { dataset_out: "df_scaled" },
        options: DEFAULT_OPTIONS,
      };

      const result = gen.generate(context);
      expect(result.imports).toContain("from sklearn.preprocessing import MinMaxScaler");
      expect(result.code).toContain('["col1","col2"]');
    });
  });

  describe("EncoderGenerator", () => {
    it("should generate pd.get_dummies for one-hot encoding", () => {
      const gen = new EncoderGenerator();
      const context: BlockCodeContext = {
        block: {
          id: "b_enc",
          definitionId: "data.encoder",
          position: { x: 0, y: 0 },
          config: { method: "onehot", columns: "auto" },
        },
        inputs: { dataset_in: "df_raw" },
        outputs: { dataset_out: "df_encoded" },
        options: DEFAULT_OPTIONS,
      };

      const result = gen.generate(context);
      expect(result.imports).toContain("import pandas as pd");
      expect(result.code).toContain("df_encoded = pd.get_dummies(");
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
      expect(result.code).toContain("random_state=99");
      expect(result.code).toContain('"label"');
      expect(result.code).toContain("var_b2_train = pd.concat");
      expect(result.code).toContain("var_b2_test = X_te_b2");
    });
  });

  describe("RandomForestGenerator", () => {
    it("should dynamically detect target type and train model", () => {
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
      expect(result.imports).toContain(
        "from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor"
      );
      expect(result.imports).toContain("from sklearn.utils.multiclass import type_of_target");
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
      expect(result.code).toContain("var_b4_preds = var_b3_model.predict(");
    });
  });

  describe("AccuracyGenerator", () => {
    it("should compute accuracy_score with fallback and emit metrics event", () => {
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
      expect(result.imports).toContain("import numpy as np");
      expect(result.code).toContain("accuracy_score(");
      expect(result.code).toContain("r2_score");
      expect(result.code).toContain('"title": _metric_title_b5');
    });
  });

  describe("ConfusionMatrixGenerator", () => {
    it("should generate confusion_matrix with binning fallback and emit matrix metrics", () => {
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
      expect(result.code).toContain("confusion_matrix(");
      expect(result.code).toContain('"title": "Confusion Matrix"');
    });
  });
});

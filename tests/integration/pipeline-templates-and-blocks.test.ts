import { describe, it, expect, beforeEach } from "vitest";
import {
  GraphValidator,
  BlockDefinitionRegistry,
  getExecutionPlan,
} from "@codebrix/graph-engine";
import { PythonCodeGenerator } from "@codebrix/codegen";
import { PIPELINE_TEMPLATES } from "../../apps/desktop/src/templates/pipelineTemplates.js";
import { CANONICAL_ML_BLOCKS, BUILTIN_ML_BLOCKS } from "../../apps/desktop/src/registry/bootstrap.js";
import { csvBlockDefinition, jsonBlockDefinition, excelBlockDefinition, scalingBlockDefinition, encodingBlockDefinition } from "../../libraries/data/src/index.js";
import { variablesBlockDefinition, conditionsBlockDefinition, loopsBlockDefinition, functionsBlockDefinition } from "../../libraries/core/src/index.js";

describe("Pipeline Templates & Built-in Blocks Verification", () => {
  let registry: BlockDefinitionRegistry;
  let validator: GraphValidator;
  let codeGen: PythonCodeGenerator;

  beforeEach(() => {
    registry = new BlockDefinitionRegistry();

    // Register all core blocks
    [
      variablesBlockDefinition,
      conditionsBlockDefinition,
      loopsBlockDefinition,
      functionsBlockDefinition,
    ].forEach((b) => registry.register(b));

    // Register all data blocks
    [
      csvBlockDefinition,
      jsonBlockDefinition,
      excelBlockDefinition,
      scalingBlockDefinition,
      encodingBlockDefinition,
    ].forEach((b) => registry.register(b));

    // Register canonical ML blocks
    CANONICAL_ML_BLOCKS.forEach((b) => registry.register(b));

    // Register builtin ML, prep, and visualizer blocks
    BUILTIN_ML_BLOCKS.forEach((b) => registry.register(b));

    validator = new GraphValidator(registry);
    codeGen = new PythonCodeGenerator(registry);
  });

  describe("Built-in Block Definitions Integrity", () => {
    it("should have all registered blocks with unique IDs and valid port metadata", () => {
      const allBlocks = [
        ...CANONICAL_ML_BLOCKS,
        ...BUILTIN_ML_BLOCKS,
      ];
      expect(allBlocks.length).toBeGreaterThan(20);

      const seenIds = new Set<string>();
      for (const block of allBlocks) {
        expect(block.id).toBeDefined();
        expect(block.id.length).toBeGreaterThan(0);
        expect(seenIds.has(block.id)).toBe(false);
        seenIds.add(block.id);

        expect(block.name).toBeDefined();
        expect(block.category).toBeDefined();

        // Check input ports
        for (const input of block.inputs) {
          expect(input.id).toBeDefined();
          expect(input.type).toBeDefined();
          expect(input.direction).toBe("input");
        }

        // Check output ports
        for (const output of block.outputs) {
          expect(output.id).toBeDefined();
          expect(output.type).toBeDefined();
          expect(output.direction).toBe("output");
        }
      }
    });
  });

  describe("All 5 Kaggle Benchmark Templates Validation", () => {
    it("Template 1: Kaggle Titanic Survival must be fully valid and generate code", () => {
      const tpl = PIPELINE_TEMPLATES.find((t) => t.id === "template-kaggle-titanic");
      expect(tpl).toBeDefined();
      const result = validator.validate(tpl!.graph);
      if (!result.valid) {
        console.error("Template 1 Validation Errors:", result.errors);
      }
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);

      const plan = getExecutionPlan(tpl!.graph, registry);
      expect(plan.phases.length).toBeGreaterThan(0);

      const code = codeGen.generate(tpl!.graph);
      expect(code).toBeDefined();
      expect(code.length).toBeGreaterThan(100);
      expect(code).toContain("RandomForestClassifier");
      expect(code).toContain("accuracy_score");
    });

    it("Template 2: Kaggle House Prices Regression must be fully valid and generate code", () => {
      const tpl = PIPELINE_TEMPLATES.find((t) => t.id === "template-kaggle-house-prices");
      expect(tpl).toBeDefined();
      const result = validator.validate(tpl!.graph);
      if (!result.valid) {
        console.error("Template 2 Validation Errors:", result.errors);
      }
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);

      const plan = getExecutionPlan(tpl!.graph, registry);
      expect(plan.phases.length).toBeGreaterThan(0);

      const code = codeGen.generate(tpl!.graph);
      expect(code).toBeDefined();
      expect(code).toContain("GradientBoostingRegressor");
      expect(code).toContain("mean_squared_error");
    });

    it("Template 3: Kaggle Telco Customer Churn must be fully valid and generate code", () => {
      const tpl = PIPELINE_TEMPLATES.find((t) => t.id === "template-kaggle-customer-churn");
      expect(tpl).toBeDefined();
      const result = validator.validate(tpl!.graph);
      if (!result.valid) {
        console.error("Template 3 Validation Errors:", result.errors);
      }
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);

      const plan = getExecutionPlan(tpl!.graph, registry);
      expect(plan.phases.length).toBeGreaterThan(0);

      const code = codeGen.generate(tpl!.graph);
      expect(code).toBeDefined();
      expect(code).toContain("LogisticRegression");
      expect(code).toContain("classification_report");
    });

    it("Template 4: Kaggle Fraud Anomaly Detection must be fully valid and generate code", () => {
      const tpl = PIPELINE_TEMPLATES.find((t) => t.id === "template-kaggle-fraud-detection");
      expect(tpl).toBeDefined();
      const result = validator.validate(tpl!.graph);
      if (!result.valid) {
        console.error("Template 4 Validation Errors:", result.errors);
      }
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);

      const plan = getExecutionPlan(tpl!.graph, registry);
      expect(plan.phases.length).toBeGreaterThan(0);

      const code = codeGen.generate(tpl!.graph);
      expect(code).toBeDefined();
      expect(code).toContain("RandomForestClassifier");
      expect(code).toContain("RobustScaler");
    });

    it("Template 5: Kaggle Mall Customer Segmentation must be fully valid and generate code", () => {
      const tpl = PIPELINE_TEMPLATES.find((t) => t.id === "template-kaggle-customer-segmentation");
      expect(tpl).toBeDefined();
      const result = validator.validate(tpl!.graph);
      if (!result.valid) {
        console.error("Template 5 Validation Errors:", result.errors);
      }
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);

      const plan = getExecutionPlan(tpl!.graph, registry);
      expect(plan.phases.length).toBeGreaterThan(0);

      const code = codeGen.generate(tpl!.graph);
      expect(code).toBeDefined();
      expect(code).toContain("PCA");
      expect(code).toContain("KMeans");
    });
  });
});

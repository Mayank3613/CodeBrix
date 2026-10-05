import { describe, it, expect, beforeEach } from "vitest";
import { blockRegistry, bootstrapDefaultBlocks, BUILTIN_ML_BLOCKS } from "./index";
import { useCustomBlockStore } from "../stores/customBlockStore";
import { isValidBlockDefinition } from "@codebrix/shared";
import type { BlockDefinition } from "@codebrix/types";

describe("Built-in Blocks & Custom Blocks System", () => {
  beforeEach(() => {
    blockRegistry.clear();
    useCustomBlockStore.setState({ customBlocks: [], customCodeTemplates: {} });
  });

  describe("Builtin ML Blocks Catalogue", () => {
    it("ensures all BUILTIN_ML_BLOCKS have valid contract definitions", () => {
      expect(BUILTIN_ML_BLOCKS.length).toBeGreaterThanOrEqual(20);

      for (const block of BUILTIN_ML_BLOCKS) {
        expect(isValidBlockDefinition(block)).toBe(true);
        expect(block.id).toBeTruthy();
        expect(block.name).toBeTruthy();
        expect(block.category).toBeTruthy();
        expect(Array.isArray(block.inputs)).toBe(true);
        expect(Array.isArray(block.outputs)).toBe(true);
      }
    });

    it("bootstrapDefaultBlocks registers comprehensive catalogue across all categories", () => {
      bootstrapDefaultBlocks();
      const all = blockRegistry.list();

      expect(all.length).toBeGreaterThan(25);

      // Verify representations in core domains
      const dataBlocks = blockRegistry.listByCategory("data");
      const prepBlocks = blockRegistry.listByCategory("preprocessing");
      const mlBlocks = blockRegistry.listByCategory("ml");
      const evalBlocks = blockRegistry.listByCategory("evaluation");
      const vizBlocks = blockRegistry.listByCategory("visualization");
      const coreBlocks = blockRegistry.listByCategory("core");

      expect(dataBlocks.length).toBeGreaterThanOrEqual(4);
      expect(prepBlocks.length).toBeGreaterThanOrEqual(3);
      expect(mlBlocks.length).toBeGreaterThanOrEqual(8);
      expect(evalBlocks.length).toBeGreaterThanOrEqual(3);
      expect(vizBlocks.length).toBeGreaterThanOrEqual(3);
      expect(coreBlocks.length).toBeGreaterThanOrEqual(4);
    });

    it("verifies key classifiers and regressors are registered", () => {
      bootstrapDefaultBlocks();

      expect(blockRegistry.has("ml.random_forest_classifier")).toBe(true);
      expect(blockRegistry.has("ml.logistic_regression")).toBe(true);
      expect(blockRegistry.has("ml.decision_tree_classifier")).toBe(true);
      expect(blockRegistry.has("ml.linear_regression")).toBe(true);
      expect(blockRegistry.has("ml.kmeans")).toBe(true);
      expect(blockRegistry.has("prep.imputer")).toBe(true);
      expect(blockRegistry.has("data.parquet_loader")).toBe(true);
    });
  });

  describe("Custom Block Store & Lifecycle Usability", () => {
    const customDef: BlockDefinition = {
      id: "custom.my_text_scaler",
      name: "My Text Scaler",
      category: "custom",
      version: "0.1.0",
      description: "Custom user-defined transformation",
      inputs: [
        { id: "df_in", name: "Input DF", type: "dataframe", direction: "input", required: true },
      ],
      outputs: [
        { id: "df_out", name: "Output DF", type: "dataframe", direction: "output" },
      ],
      configSchema: {
        multiplier: { name: "multiplier", label: "Scale Factor", type: "number", defaultValue: 2 },
      },
      tags: ["custom", "test"],
    };

    it("adds a custom block and registers it immediately in BlockRegistry", () => {
      const store = useCustomBlockStore.getState();
      store.addCustomBlock(customDef, "outputs['df_out'] = inputs['df_in'] * 2");

      expect(store.customBlocks).toHaveLength(1);
      expect(blockRegistry.has("custom.my_text_scaler")).toBe(true);
      expect(blockRegistry.get("custom.my_text_scaler")?.name).toBe("My Text Scaler");
      expect(store.getPythonCode("custom.my_text_scaler")).toContain("outputs['df_out']");
    });

    it("updates an existing custom block in store and registry", () => {
      const store = useCustomBlockStore.getState();
      store.addCustomBlock(customDef, "code v1");

      const updatedDef = { ...customDef, name: "Renamed Text Scaler" };
      store.updateCustomBlock("custom.my_text_scaler", updatedDef, "code v2");

      expect(store.customBlocks[0]?.name).toBe("Renamed Text Scaler");
      expect(blockRegistry.get("custom.my_text_scaler")?.name).toBe("Renamed Text Scaler");
      expect(store.getPythonCode("custom.my_text_scaler")).toBe("code v2");
    });

    it("deletes a custom block and removes it from BlockRegistry", () => {
      const store = useCustomBlockStore.getState();
      store.addCustomBlock(customDef);
      expect(blockRegistry.has("custom.my_text_scaler")).toBe(true);

      store.deleteCustomBlock("custom.my_text_scaler");
      expect(store.customBlocks).toHaveLength(0);
      expect(blockRegistry.has("custom.my_text_scaler")).toBe(false);
    });

    it("exports and imports custom block JSON losslessly", () => {
      const store = useCustomBlockStore.getState();
      store.addCustomBlock(customDef, "print('custom code')");

      const jsonStr = store.exportCustomBlockJson("custom.my_text_scaler");
      expect(jsonStr).toContain("custom.my_text_scaler");
      expect(jsonStr).toContain("print('custom code')");

      // Clear store & registry
      store.deleteCustomBlock("custom.my_text_scaler");
      expect(blockRegistry.has("custom.my_text_scaler")).toBe(false);

      // Re-import
      const imported = store.importCustomBlockJson(jsonStr);
      expect(imported.id).toBe("custom.my_text_scaler");
      expect(blockRegistry.has("custom.my_text_scaler")).toBe(true);
      expect(store.getPythonCode("custom.my_text_scaler")).toBe("print('custom code')");
    });
  });
});

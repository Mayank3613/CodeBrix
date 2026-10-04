import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { parseCbxProject, serializeCbxProject } from "../../apps/desktop/src/project/projectManager";
import { MockWorkflowService } from "@codebrix/shared";
import {
  generateCsvPython,
  generateExcelPython,
  generateScalingPython,
  generateEncodingPython,
} from "../../libraries/data/src/index";

describe("Integration 3 Gate: .cbx Project Loading, Validation, and Code Generation", () => {
  const workflowService = new MockWorkflowService();
  const cbxFilePath = path.resolve(__dirname, "../../examples/iris-classification.cbx");

  it("loads and parses examples/iris-classification.cbx cleanly", () => {
    expect(fs.existsSync(cbxFilePath)).toBe(true);
    const rawContent = fs.readFileSync(cbxFilePath, "utf-8");

    const parseResult = parseCbxProject(rawContent);
    expect(parseResult.success).toBe(true);
    expect(parseResult.project).toBeDefined();

    const project = parseResult.project!;
    expect(project.format).toBe("codebrix-project");
    expect(project.schemaVersion).toBe("0.1.0");

    // All 6 acceptance pipeline blocks exist
    const blockIds = Object.keys(project.graph.blocks);
    expect(blockIds).toEqual(
      expect.arrayContaining([
        "blk-csv",
        "blk-split",
        "blk-rf",
        "blk-predict",
        "blk-acc",
        "blk-cm",
      ])
    );
    expect(project.graph.connections.length).toBe(8);
  });

  it("validates the loaded Iris acceptance workflow graph", async () => {
    const rawContent = fs.readFileSync(cbxFilePath, "utf-8");
    const { project } = parseCbxProject(rawContent);
    expect(project).toBeDefined();

    const validation = await workflowService.validateGraph(project!.graph);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it("re-serializes the loaded project losslessly", () => {
    const rawContent = fs.readFileSync(cbxFilePath, "utf-8");
    const { project } = parseCbxProject(rawContent);
    expect(project).toBeDefined();

    const serialized = serializeCbxProject(project!.graph, project!.canvasViewport);
    const reloaded = parseCbxProject(serialized);

    expect(reloaded.success).toBe(true);
    expect(Object.keys(reloaded.project!.graph.blocks)).toEqual(
      Object.keys(project!.graph.blocks)
    );
    expect(reloaded.project!.graph.connections.length).toBe(
      project!.graph.connections.length
    );
  });

  it("generates valid Python code snippets without schema mismatch", () => {
    const rawContent = fs.readFileSync(cbxFilePath, "utf-8");
    const { project } = parseCbxProject(rawContent);
    expect(project).toBeDefined();

    const csvConfig = project!.graph.blocks["blk-csv"].config;
    const csvCode = generateCsvPython(csvConfig, { outputVarName: "df_iris" });
    expect(csvCode).toContain("pd.read_csv");
    expect(csvCode).toContain("df_iris =");

    // Verify all Phase 2 data generator functions work with standard configs
    const excelCode = generateExcelPython({ filePath: "data.xlsx" }, { outputVarName: "df_excel" });
    expect(excelCode).toContain("pd.read_excel");

    const scalingCode = generateScalingPython({ method: "standard" }, { inputVarName: "df_iris", outputVarName: "df_scaled" });
    expect(scalingCode).toContain("StandardScaler");

    const encodingCode = generateEncodingPython({ method: "onehot" }, { inputVarName: "df_scaled", outputVarName: "df_encoded" });
    expect(encodingCode).toContain("pd.get_dummies");
  });
});

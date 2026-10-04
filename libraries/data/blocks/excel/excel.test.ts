import { describe, it, expect } from "vitest";
import { excelBlockDefinition } from "./block";
import { generatePython } from "./generate";
import { isValidBlockDefinition } from "@codebrix/shared";

describe("Excel Loader Block", () => {
  it("conforms to standard BlockDefinition contract", () => {
    expect(isValidBlockDefinition(excelBlockDefinition)).toBe(true);
    expect(excelBlockDefinition.id).toBe("data.excel_loader");
    expect(excelBlockDefinition.category).toBe("data");
    expect(excelBlockDefinition.outputs[0]?.type).toBe("dataframe");
  });

  it("generates correct Python snippet with defaults", () => {
    const code = generatePython({}, { outputVarName: "df" });
    expect(code).toContain("import pandas as pd");
    expect(code).toContain('df = pd.read_excel("data.xlsx", sheet_name="Sheet1", header=0)');
  });

  it("generates custom parameters correctly", () => {
    const code = generatePython(
      {
        filePath: "sales_report.xlsx",
        sheetName: "Q4",
        headerRow: 1,
      },
      { outputVarName: "sales_df" }
    );
    expect(code).toContain('sales_df = pd.read_excel("sales_report.xlsx", sheet_name="Q4", header=1)');
  });
});

import { describe, it, expect } from "vitest";
import { csvBlockDefinition } from "./block";
import { generatePython } from "./generate";
import { isValidBlockDefinition } from "@codebrix/shared";

describe("CSV Loader Block (D1-1.6)", () => {
  it("conforms strictly to the BlockDefinition contract", () => {
    expect(isValidBlockDefinition(csvBlockDefinition)).toBe(true);
    expect(csvBlockDefinition.id).toBe("data.csv_loader");
    expect(csvBlockDefinition.category).toBe("data");
    expect(csvBlockDefinition.outputs[0]?.type).toBe("dataframe");
  });

  it("generates correct Python code for loading Iris dataset", () => {
    const code = generatePython({
      filePath: "tests/fixtures/iris.csv",
      delimiter: ",",
      hasHeader: true,
    });

    expect(code).toContain('import pandas as pd');
    expect(code).toContain('pd.read_csv("tests/fixtures/iris.csv", sep=",", header=0)');
  });

  it("handles custom variable names and no-header setting", () => {
    const code = generatePython(
      {
        filePath: "data/raw.csv",
        delimiter: "\t",
        hasHeader: false,
      },
      { outputVarName: "raw_df" }
    );

    expect(code).toContain('raw_df = pd.read_csv("data/raw.csv", sep="\\t", header=None)');
  });
});

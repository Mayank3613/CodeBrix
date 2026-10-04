import { describe, it, expect } from "vitest";
import { jsonBlockDefinition } from "./block";
import { generatePython } from "./generate";
import { isValidBlockDefinition } from "@codebrix/shared";

describe("JSON Loader Block (D1-1.6)", () => {
  it("conforms strictly to the BlockDefinition contract", () => {
    expect(isValidBlockDefinition(jsonBlockDefinition)).toBe(true);
    expect(jsonBlockDefinition.id).toBe("data.json_loader");
    expect(jsonBlockDefinition.category).toBe("data");
    expect(jsonBlockDefinition.outputs[0]?.type).toBe("dataframe");
  });

  it("generates correct Python code for loading JSON dataset", () => {
    const code = generatePython({
      filePath: "sample.json",
      orient: "records",
    });

    expect(code).toContain('import pandas as pd');
    expect(code).toContain('pd.read_json("sample.json", orient="records")');
  });
});

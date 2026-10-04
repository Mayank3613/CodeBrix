import { describe, it, expect } from "vitest";
import { scalingBlockDefinition } from "./block";
import { generatePython } from "./generate";
import { isValidBlockDefinition } from "@codebrix/shared";

describe("Feature Scaler Block", () => {
  it("conforms to standard BlockDefinition contract", () => {
    expect(isValidBlockDefinition(scalingBlockDefinition)).toBe(true);
    expect(scalingBlockDefinition.id).toBe("data.scaler");
    expect(scalingBlockDefinition.category).toBe("preprocessing");
    expect(scalingBlockDefinition.inputs[0]?.type).toBe("dataframe");
    expect(scalingBlockDefinition.outputs[0]?.type).toBe("dataframe");
  });

  it("generates Python for StandardScaler with all columns by default", () => {
    const code = generatePython({}, { inputVarName: "raw_df", outputVarName: "scaled_df" });
    expect(code).toContain("from sklearn.preprocessing import StandardScaler");
    expect(code).toContain("scaled_df = raw_df.copy()");
    expect(code).toContain("StandardScaler()");
  });

  it("generates Python for MinMaxScaler with explicit feature columns", () => {
    const code = generatePython(
      { method: "minmax", features: "sepal_length, sepal_width" },
      { inputVarName: "df", outputVarName: "df_norm" }
    );
    expect(code).toContain("from sklearn.preprocessing import MinMaxScaler");
    expect(code).toContain('["sepal_length","sepal_width"]');
    expect(code).toContain("MinMaxScaler()");
  });
});

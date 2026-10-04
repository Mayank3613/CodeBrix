import { describe, it, expect } from "vitest";
import { encodingBlockDefinition } from "./block";
import { generatePython } from "./generate";
import { isValidBlockDefinition } from "@codebrix/shared";

describe("Categorical Encoder Block", () => {
  it("conforms to standard BlockDefinition contract", () => {
    expect(isValidBlockDefinition(encodingBlockDefinition)).toBe(true);
    expect(encodingBlockDefinition.id).toBe("data.encoder");
    expect(encodingBlockDefinition.category).toBe("preprocessing");
    expect(encodingBlockDefinition.inputs[0]?.type).toBe("dataframe");
    expect(encodingBlockDefinition.outputs[0]?.type).toBe("dataframe");
  });

  it("generates Python for One-Hot Encoding with auto detection", () => {
    const code = generatePython({}, { inputVarName: "df_raw", outputVarName: "df_encoded" });
    expect(code).toContain("import pandas as pd");
    expect(code).toContain("pd.get_dummies(df_raw, columns=_cat_cols, drop_first=False, dtype=int)");
  });

  it("generates Python for Label Encoding", () => {
    const code = generatePython(
      { method: "label", columns: "species" },
      { inputVarName: "df", outputVarName: "df_lbl" }
    );
    expect(code).toContain("from sklearn.preprocessing import LabelEncoder");
    expect(code).toContain("LabelEncoder().fit_transform");
    expect(code).toContain('["species"]');
  });
});

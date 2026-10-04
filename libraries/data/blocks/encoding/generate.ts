export interface EncodingGenerateContext {
  inputVarName?: string;
  outputVarName?: string;
}

/**
 * Generate Python snippet for categorical encoding.
 */
export function generatePython(
  config: Record<string, unknown>,
  context: EncodingGenerateContext = {}
): string {
  const method = String(config["method"] ?? "onehot");
  const columns = String(config["columns"] ?? "auto").trim();
  const dropFirst = Boolean(config["dropFirst"] ?? false);
  const inVar = context.inputVarName || "df";
  const outVar = context.outputVarName || "df_encoded";

  if (method === "onehot") {
    if (columns === "auto") {
      return [
        `import pandas as pd`,
        `_cat_cols = ${inVar}.select_dtypes(include=['object', 'category', 'string']).columns`,
        `${outVar} = pd.get_dummies(${inVar}, columns=_cat_cols, drop_first=${dropFirst ? "True" : "False"}, dtype=int)`,
      ].join("\n");
    }

    const colList = columns
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    return [
      `import pandas as pd`,
      `${outVar} = pd.get_dummies(${inVar}, columns=${JSON.stringify(colList)}, drop_first=${dropFirst ? "True" : "False"}, dtype=int)`,
    ].join("\n");
  }

  if (method === "label") {
    return [
      `from sklearn.preprocessing import LabelEncoder`,
      `import pandas as pd`,
      `${outVar} = ${inVar}.copy()`,
      `_target_cols = ${columns === "auto" ? `${outVar}.select_dtypes(include=['object', 'category', 'string']).columns` : JSON.stringify(columns.split(",").map((c) => c.trim()).filter(Boolean))}`,
      `for _col in _target_cols:`,
      `    ${outVar}[_col] = LabelEncoder().fit_transform(${outVar}[_col].astype(str))`,
    ].join("\n");
  }

  // Ordinal encoding fallback
  return [
    `from sklearn.preprocessing import OrdinalEncoder`,
    `import pandas as pd`,
    `${outVar} = ${inVar}.copy()`,
    `_target_cols = ${columns === "auto" ? `${outVar}.select_dtypes(include=['object', 'category', 'string']).columns` : JSON.stringify(columns.split(",").map((c) => c.trim()).filter(Boolean))}`,
    `if len(_target_cols) > 0:`,
    `    ${outVar}[_target_cols] = OrdinalEncoder().fit_transform(${outVar}[_target_cols].astype(str))`,
  ].join("\n");
}

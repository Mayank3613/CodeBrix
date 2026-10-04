export interface ScalingGenerateContext {
  inputVarName?: string;
  outputVarName?: string;
}

/**
 * Generate Python snippet for feature scaling.
 */
export function generatePython(
  config: Record<string, unknown>,
  context: ScalingGenerateContext = {}
): string {
  const method = String(config["method"] ?? "standard");
  const features = String(config["features"] ?? "all").trim();
  const inVar = context.inputVarName || "df";
  const outVar = context.outputVarName || "df_scaled";

  let scalerClass = "StandardScaler";
  if (method === "minmax") {
    scalerClass = "MinMaxScaler";
  } else if (method === "robust") {
    scalerClass = "RobustScaler";
  }

  if (features === "all") {
    return [
      `from sklearn.preprocessing import ${scalerClass}`,
      `import pandas as pd`,
      `${outVar} = ${inVar}.copy()`,
      `_numeric_cols = ${outVar}.select_dtypes(include=['number']).columns`,
      `_scaler = ${scalerClass}()`,
      `${outVar}[_numeric_cols] = _scaler.fit_transform(${outVar}[_numeric_cols])`,
    ].join("\n");
  }

  const colList = features
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  return [
    `from sklearn.preprocessing import ${scalerClass}`,
    `import pandas as pd`,
    `${outVar} = ${inVar}.copy()`,
    `_target_cols = ${JSON.stringify(colList)}`,
    `_scaler = ${scalerClass}()`,
    `${outVar}[_target_cols] = _scaler.fit_transform(${outVar}[_target_cols])`,
  ].join("\n");
}

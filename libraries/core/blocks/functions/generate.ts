export interface GenerateContext {
  outputVarName?: string;
  inputVarNames?: Record<string, string>;
}

/**
 * Generates Python code defining a custom function and calling it with input arguments.
 */
export function generatePython(
  config: Record<string, unknown>,
  context: GenerateContext = {}
): string {
  const funcName =
    String(config["functionName"] ?? "custom_transform")
      .trim()
      .replace(/[^a-zA-Z0-9_]/g, "_") || "custom_transform";
  const params = String(config["parameters"] ?? "x").trim();
  const returnExpr = String(config["returnExpr"] ?? "x").trim();
  const docstring = String(config["docstring"] ?? "").trim();
  const outVar = context.outputVarName || `${funcName}_result`;

  const arg1 = context.inputVarNames?.["input_arg"] ?? "None";
  const arg2 = context.inputVarNames?.["secondary_arg"];
  const callArgs = arg2 ? `${arg1}, ${arg2}` : arg1;

  const lines: string[] = [];
  lines.push(`def ${funcName}(${params}):`);
  if (docstring) {
    lines.push(`    """${docstring}"""`);
  }
  lines.push(`    return ${returnExpr}`);
  lines.push(`${outVar} = ${funcName}(${callArgs})`);

  return lines.join("\n");
}

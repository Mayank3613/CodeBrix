export interface GenerateContext {
  outputVarName?: string;
  inputVarNames?: Record<string, string>;
}

/**
 * Generate Python code for condition evaluation and branching.
 */
export function generatePython(
  config: Record<string, unknown>,
  context: GenerateContext = {}
): string {
  const operator = String(config["operator"] ?? "==");
  const threshold = String(config["threshold"] ?? "0");
  const left = context.inputVarNames?.["input_val"] || "input_val";
  const right =
    context.inputVarNames?.["compare_val"] ||
    (!isNaN(Number(threshold)) ? threshold : JSON.stringify(threshold));

  const outVar = context.outputVarName || "cond_res";

  if (operator === "is not None" || operator === "is None") {
    return `# Condition evaluation: ${left} ${operator}\n${outVar} = ${left} ${operator}`;
  }

  return `# Condition evaluation: ${left} ${operator} ${right}\n${outVar} = bool(${left} ${operator} ${right})`;
}

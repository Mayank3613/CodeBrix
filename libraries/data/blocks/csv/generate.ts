export interface GenerateContext {
  outputVarName?: string;
}

/**
 * Generate Python script snippet for CSV loading.
 */
export function generatePython(
  config: Record<string, unknown>,
  context: GenerateContext = {}
): string {
  const filePath = String(config["filePath"] ?? "tests/fixtures/iris.csv");
  const delimiter = String(config["delimiter"] ?? ",");
  const hasHeader = config["hasHeader"] !== false;
  const outVar = context.outputVarName || "df";

  const headerArg = hasHeader ? "0" : "None";

  return `import pandas as pd\n${outVar} = pd.read_csv(${JSON.stringify(filePath)}, sep=${JSON.stringify(delimiter)}, header=${headerArg})`;
}

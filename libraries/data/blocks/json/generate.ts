export interface GenerateContext {
  outputVarName?: string;
}

/**
 * Generate Python snippet for reading JSON files using pandas.
 */
export function generatePython(
  config: Record<string, unknown>,
  context: GenerateContext = {}
): string {
  const filePath = String(config["filePath"] ?? "data.json");
  const orient = String(config["orient"] ?? "records");
  const outVar = context.outputVarName || "df";

  return `import pandas as pd\n${outVar} = pd.read_json("${filePath}", orient="${orient}")`;
}

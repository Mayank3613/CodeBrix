export interface GenerateContext {
  outputVarName?: string;
}

/**
 * Generate Python script snippet for Excel file loading.
 */
export function generatePython(
  config: Record<string, unknown>,
  context: GenerateContext = {}
): string {
  const filePath = String(config["filePath"] ?? "data.xlsx");
  const sheetName = String(config["sheetName"] ?? "Sheet1");
  const headerRow = Number(config["headerRow"] ?? 0);
  const outVar = context.outputVarName || "df";

  return `import pandas as pd\n${outVar} = pd.read_excel(${JSON.stringify(filePath)}, sheet_name=${JSON.stringify(sheetName)}, header=${headerRow})`;
}

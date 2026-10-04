export interface GenerateContext {
  outputVarName?: string;
  inputVarNames?: Record<string, string>;
}

/**
 * Generates Python code for iteration and accumulation loop structures.
 */
export function generatePython(
  config: Record<string, unknown>,
  context: GenerateContext = {}
): string {
  const loopType = String(config["loopType"] ?? "range");
  const iterations = Number(config["iterations"] ?? 5);
  const itemName =
    String(config["itemName"] ?? "item")
      .trim()
      .replace(/[^a-zA-Z0-9_]/g, "_") || "item";

  const collectionVar = context.inputVarNames?.["collection_in"];
  const dynamicCountVar = context.inputVarNames?.["count_in"];
  const outListVar = context.outputVarName || `${itemName}_results`;

  if (loopType === "for_each" && collectionVar) {
    return [
      `# For Each Loop over ${collectionVar}`,
      `${outListVar} = []`,
      `for idx, ${itemName} in enumerate(${collectionVar}):`,
      `    ${outListVar}.append(${itemName})`,
    ].join("\n");
  }

  const rangeLimit = dynamicCountVar || (isNaN(iterations) ? "5" : String(iterations));

  return [
    `# Range Loop (0..${rangeLimit})`,
    `${outListVar} = []`,
    `for idx in range(int(${rangeLimit})):`,
    `    ${itemName} = idx`,
    `    ${outListVar}.append(${itemName})`,
  ].join("\n");
}

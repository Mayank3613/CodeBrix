export interface GenerateContext {
  outputVarName?: string;
  inputVarNames?: Record<string, string>;
}

/**
 * Generate Python code defining or assigning a variable.
 */
export function generatePython(
  config: Record<string, unknown>,
  context: GenerateContext = {}
): string {
  const varName = String(config["varName"] ?? "var_1").trim().replace(/[^a-zA-Z0-9_]/g, "_") || "var_1";
  const varType = String(config["varType"] ?? "number");
  const rawValue = String(config["varValue"] ?? "0");
  const outVar = context.outputVarName || varName;

  // If input override is connected, assign it directly
  if (context.inputVarNames?.["input_val"]) {
    return `# Variable: ${varName} (overridden by input)\n${outVar} = ${context.inputVarNames["input_val"]}`;
  }

  let formattedValue: string;
  switch (varType) {
    case "number": {
      const num = Number(rawValue);
      formattedValue = isNaN(num) ? "0" : String(num);
      break;
    }
    case "boolean": {
      const lower = rawValue.trim().toLowerCase();
      formattedValue = lower === "true" || lower === "1" ? "True" : "False";
      break;
    }
    case "json": {
      try {
        const parsed = JSON.parse(rawValue);
        formattedValue = JSON.stringify(parsed);
      } catch {
        formattedValue = JSON.stringify(rawValue);
      }
      break;
    }
    case "string":
    default:
      formattedValue = JSON.stringify(rawValue);
      break;
  }

  return `# Variable definition: ${varName}\n${outVar} = ${formattedValue}`;
}

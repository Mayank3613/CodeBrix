import type { BlockCodeGenerator, BlockCodeContext, BlockCodeResult } from "../types.js";
import { getOutputVariableName } from "../variable-resolver.js";

export class CsvLoaderGenerator implements BlockCodeGenerator {
  readonly definitionId = "data.csv_loader";

  generate(context: BlockCodeContext): BlockCodeResult {
    const { block, inputs, outputs, options } = context;
    const outputVar = outputs["dataset_out"] ?? getOutputVariableName(block.id, "dataset_out");
    
    // Filepath comes from config, or dynamically from an input port if connected
    const configPath = (block.config["filePath"] as string) ?? (block.config["filepath"] as string) ?? "data.csv";
    const filePathExpr = inputs["file_path_in"] ? inputs["file_path_in"] : JSON.stringify(configPath);

    const lines: string[] = [];

    if (options.includeComments) {
      lines.push(`# Block: ${block.label ?? "CSV Loader"} (${block.id})`);
    }

    lines.push(`csv_path_${block.id.replace(/[^a-zA-Z0-9_]/g, "_")} = ${filePathExpr}`);
    lines.push(`${outputVar} = pd.read_csv(csv_path_${block.id.replace(/[^a-zA-Z0-9_]/g, "_")})`);

    if (options.includeProtocolHooks) {
      lines.push(`emit_json({`);
      lines.push(`    "type": "console",`);
      lines.push(`    "stream": "stdout",`);
      lines.push(`    "text": f"[{block.id}] Loaded {len(${outputVar})} rows, {len(${outputVar}.columns)} columns from {csv_path_${block.id.replace(/[^a-zA-Z0-9_]/g, "_")}}",`);
      lines.push(`    "timestamp": iso_now()`);
      lines.push(`})`);
    }

    return {
      imports: ["import pandas as pd", "import os"],
      code: lines.join("\n"),
    };
  }
}

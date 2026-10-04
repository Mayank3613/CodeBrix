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

    const cleanId = block.id.replace(/[^a-zA-Z0-9_]/g, "_");
    lines.push(`csv_path_${cleanId} = ${filePathExpr}`);
    lines.push(`if not os.path.isabs(str(csv_path_${cleanId})) and not os.path.exists(str(csv_path_${cleanId})):`);
    lines.push(`    for _cand in [".", "../..", "../../..", os.getcwd()]:`);
    lines.push(`        _cand_path = os.path.join(_cand, str(csv_path_${cleanId}))`);
    lines.push(`        if os.path.exists(_cand_path):`);
    lines.push(`            csv_path_${cleanId} = _cand_path`);
    lines.push(`            break`);
    lines.push(`${outputVar} = pd.read_csv(csv_path_${cleanId})`);

    if (options.includeProtocolHooks) {
      lines.push(`emit_json({`);
      lines.push(`    "type": "console",`);
      lines.push(`    "stream": "stdout",`);
      lines.push(`    "text": f"[${block.id}] Loaded {len(${outputVar})} rows, {len(${outputVar}.columns)} columns from {csv_path_${cleanId}}",`);
      lines.push(`    "timestamp": iso_now()`);
      lines.push(`})`);
      lines.push(`emit_json({`);
      lines.push(`    "type": "table",`);
      lines.push(`    "title": f"Preview: {csv_path_${cleanId}}",`);
      lines.push(`    "blockId": ${JSON.stringify(block.id)},`);
      lines.push(`    "columns": [str(c) for c in ${outputVar}.columns],`);
      lines.push(`    "rows": ${outputVar}.head(10).values.tolist(),`);
      lines.push(`    "totalRows": int(len(${outputVar})),`);
      lines.push(`    "totalColumns": int(len(${outputVar}.columns)),`);
      lines.push(`    "timestamp": iso_now()`);
      lines.push(`})`);
    }

    return {
      imports: ["import pandas as pd", "import os"],
      code: lines.join("\n"),
    };
  }
}

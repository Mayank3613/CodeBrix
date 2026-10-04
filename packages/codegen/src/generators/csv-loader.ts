import type { BlockCodeGenerator, BlockCodeContext, BlockCodeResult } from "../types.js";
import { getOutputVariableName } from "../variable-resolver.js";

export class CsvLoaderGenerator implements BlockCodeGenerator {
  readonly definitionId = "data.csv_loader";

  generate(context: BlockCodeContext): BlockCodeResult {
    const { block, inputs, outputs, options } = context;
    const outputVar = outputs["dataset_out"] ?? getOutputVariableName(block.id, "dataset_out");
    
    // Filepath comes from config, or dynamically from an input port if connected
    const rawPath = (block.config["filePath"] as string) ?? (block.config["filepath"] as string) ?? "data.csv";
    const sanitizedPath = typeof rawPath === "string"
      ? rawPath.trim().replace(/^["']+|["']+$/g, "").replace(/\\/g, "/")
      : "data.csv";
    const filePathExpr = inputs["file_path_in"] ? inputs["file_path_in"] : JSON.stringify(sanitizedPath);

    const lines: string[] = [];

    if (options.includeComments) {
      lines.push(`# Block: ${block.label ?? "CSV Loader"} (${block.id})`);
    }

    const safeId = block.id.replace(/[^a-zA-Z0-9_]/g, "_");
    lines.push(`csv_path_${safeId} = str(${filePathExpr}).strip().strip('"').strip("'")`);
    lines.push(`if not os.path.isabs(csv_path_${safeId}) and not os.path.exists(csv_path_${safeId}):`);
    lines.push(`    for _cand in [`);
    lines.push(`        os.path.join(os.getcwd(), csv_path_${safeId}),`);
    lines.push(`        os.path.join(os.path.dirname(os.getcwd()), csv_path_${safeId}),`);
    lines.push(`        os.path.join(os.path.dirname(os.path.dirname(os.getcwd())), csv_path_${safeId}),`);
    lines.push(`    ]:`);
    lines.push(`        if os.path.exists(_cand):`);
    lines.push(`            csv_path_${safeId} = _cand`);
    lines.push(`            break`);
    lines.push(`try:`);
    lines.push(`    ${outputVar} = pd.read_csv(csv_path_${safeId}, sep=None, engine='python', encoding='utf-8')`);
    lines.push(`except Exception:`);
    lines.push(`    try:`);
    lines.push(`        ${outputVar} = pd.read_csv(csv_path_${safeId}, encoding='latin1')`);
    lines.push(`    except Exception:`);
    lines.push(`        ${outputVar} = pd.read_csv(csv_path_${safeId})`);
    lines.push(`${outputVar}.columns = [str(c).strip() for c in ${outputVar}.columns]`);

    if (options.includeProtocolHooks) {
      lines.push(`emit_json({`);
      lines.push(`    "type": "console",`);
      lines.push(`    "stream": "stdout",`);
      lines.push(`    "text": f"[${block.id}] Loaded {len(${outputVar})} rows, {len(${outputVar}.columns)} columns from {csv_path_${safeId}}",`);
      lines.push(`    "timestamp": iso_now()`);
      lines.push(`})`);
      lines.push(`_preview_rows_${safeId} = ${outputVar}.head(10).fillna("").astype(str).values.tolist()`);
      lines.push(`emit_json({`);
      lines.push(`    "type": "table",`);
      lines.push(`    "title": f"Preview: {os.path.basename(csv_path_${safeId})}",`);
      lines.push(`    "columns": list(${outputVar}.columns),`);
      lines.push(`    "rows": _preview_rows_${safeId},`);
      lines.push(`    "totalRows": len(${outputVar}),`);
      lines.push(`    "totalColumns": len(${outputVar}.columns),`);
      lines.push(`    "timestamp": iso_now()`);
      lines.push(`})`);
    }

    return {
      imports: ["import pandas as pd", "import os"],
      code: lines.join("\n"),
    };
  }
}

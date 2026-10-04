import type { BlockCodeGenerator, BlockCodeContext, BlockCodeResult } from "../types.js";
import { getOutputVariableName } from "../variable-resolver.js";

export class JsonLoaderGenerator implements BlockCodeGenerator {
  readonly definitionId = "data.json_loader";

  generate(context: BlockCodeContext): BlockCodeResult {
    const { block, inputs, outputs, options } = context;
    const outputVar = outputs["dataset_out"] ?? getOutputVariableName(block.id, "dataset_out");

    const rawPath = (block.config["filePath"] as string) ?? (block.config["filepath"] as string) ?? "data.json";
    const sanitizedPath = typeof rawPath === "string"
      ? rawPath.trim().replace(/^["']+|["']+$/g, "").replace(/\\/g, "/")
      : "data.json";
    const orient = String(block.config["orient"] ?? "records");
    const filePathExpr = inputs["file_path_in"] ? inputs["file_path_in"] : JSON.stringify(sanitizedPath);

    const safeId = block.id.replace(/[^a-zA-Z0-9_]/g, "_");
    const lines: string[] = [];

    if (options.includeComments) {
      lines.push(`# Block: ${block.label ?? "JSON Loader"} (${block.id})`);
    }

    lines.push(`json_path_${safeId} = str(${filePathExpr}).strip().strip('"').strip("'")`);
    lines.push(`if not os.path.isabs(json_path_${safeId}) and not os.path.exists(json_path_${safeId}):`);
    lines.push(`    for _cand in [os.path.join(os.getcwd(), json_path_${safeId}), os.path.join(os.path.dirname(os.getcwd()), json_path_${safeId})]:`);
    lines.push(`        if os.path.exists(_cand):`);
    lines.push(`            json_path_${safeId} = _cand`);
    lines.push(`            break`);
    lines.push(`${outputVar} = pd.read_json(json_path_${safeId}, orient=${JSON.stringify(orient)})`);

    if (options.includeProtocolHooks) {
      lines.push(`emit_json({`);
      lines.push(`    "type": "console",`);
      lines.push(`    "stream": "stdout",`);
      lines.push(`    "text": f"[${block.id}] Loaded JSON: {len(${outputVar})} rows from {json_path_${safeId}}",`);
      lines.push(`    "timestamp": iso_now()`);
      lines.push(`})`);
    }

    return {
      imports: ["import pandas as pd", "import os"],
      code: lines.join("\n"),
    };
  }
}

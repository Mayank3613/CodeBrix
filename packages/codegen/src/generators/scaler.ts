import type { BlockCodeGenerator, BlockCodeContext, BlockCodeResult } from "../types.js";
import { getOutputVariableName } from "../variable-resolver.js";

export class ScalerGenerator implements BlockCodeGenerator {
  readonly definitionId = "data.scaler";

  generate(context: BlockCodeContext): BlockCodeResult {
    const { block, inputs, outputs, options } = context;
    const inputDataset = inputs["dataset_in"] ?? "df";
    const outputVar = outputs["dataset_out"] ?? getOutputVariableName(block.id, "dataset_out");

    const method = String(block.config["method"] ?? "standard");
    const features = String(block.config["features"] ?? "all").trim();

    let scalerClass = "StandardScaler";
    if (method === "minmax") {
      scalerClass = "MinMaxScaler";
    } else if (method === "robust") {
      scalerClass = "RobustScaler";
    }

    const cleanId = block.id.replace(/[^a-zA-Z0-9_]/g, "_");
    const lines: string[] = [];

    if (options.includeComments) {
      lines.push(`# Block: ${block.label ?? "Feature Scaler"} (${block.id})`);
    }

    lines.push(`${outputVar} = ${inputDataset}.copy()`);
    if (features === "all" || !features) {
      lines.push(`_numeric_cols_${cleanId} = ${outputVar}.select_dtypes(include=['number']).columns`);
      lines.push(`if len(_numeric_cols_${cleanId}) > 0:`);
      lines.push(`    _scaler_${cleanId} = ${scalerClass}()`);
      lines.push(`    ${outputVar}[_numeric_cols_${cleanId}] = _scaler_${cleanId}.fit_transform(${outputVar}[_numeric_cols_${cleanId}].fillna(0))`);
    } else {
      const colList = features.split(",").map((c) => c.trim()).filter(Boolean);
      lines.push(`_target_cols_${cleanId} = [c for c in ${JSON.stringify(colList)} if c in ${outputVar}.columns]`);
      lines.push(`if len(_target_cols_${cleanId}) > 0:`);
      lines.push(`    _scaler_${cleanId} = ${scalerClass}()`);
      lines.push(`    ${outputVar}[_target_cols_${cleanId}] = _scaler_${cleanId}.fit_transform(${outputVar}[_target_cols_${cleanId}].fillna(0))`);
    }

    if (options.includeProtocolHooks) {
      lines.push(`emit_json({`);
      lines.push(`    "type": "console",`);
      lines.push(`    "stream": "stdout",`);
      lines.push(`    "text": f"[${block.id}] Feature scaling applied ({scalerClass})",`);
      lines.push(`    "timestamp": iso_now()`);
      lines.push(`})`);
    }

    return {
      imports: ["import pandas as pd", `from sklearn.preprocessing import ${scalerClass}`],
      code: lines.join("\n"),
    };
  }
}

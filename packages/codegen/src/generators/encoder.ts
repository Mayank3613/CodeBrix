import type { BlockCodeGenerator, BlockCodeContext, BlockCodeResult } from "../types.js";
import { getOutputVariableName } from "../variable-resolver.js";

export class EncoderGenerator implements BlockCodeGenerator {
  readonly definitionId = "data.encoder";

  generate(context: BlockCodeContext): BlockCodeResult {
    const { block, inputs, outputs, options } = context;
    const inputDataset = inputs["dataset_in"] ?? "df";
    const outputVar = outputs["dataset_out"] ?? getOutputVariableName(block.id, "dataset_out");

    const method = String(block.config["method"] ?? "onehot");
    const columns = String(block.config["columns"] ?? "auto").trim();
    const dropFirst = Boolean(block.config["dropFirst"] ?? false);

    const lines: string[] = [];

    if (options.includeComments) {
      lines.push(`# Block: ${block.label ?? "Categorical Encoder"} (${block.id})`);
    }

    const cleanId = block.id.replace(/[^a-zA-Z0-9_]/g, "_");

    if (method === "onehot") {
      if (columns === "auto") {
        lines.push(`_cat_cols_${cleanId} = ${inputDataset}.select_dtypes(include=['object', 'category', 'string']).columns`);
        lines.push(`${outputVar} = pd.get_dummies(${inputDataset}, columns=_cat_cols_${cleanId}, drop_first=${dropFirst ? "True" : "False"}, dtype=float)`);
      } else {
        const colList = columns
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean);
        lines.push(`${outputVar} = pd.get_dummies(${inputDataset}, columns=${JSON.stringify(colList)}, drop_first=${dropFirst ? "True" : "False"}, dtype=float)`);
      }
    } else if (method === "label") {
      lines.push(`${outputVar} = ${inputDataset}.copy()`);
      if (columns === "auto") {
        lines.push(`_target_cols_${cleanId} = ${outputVar}.select_dtypes(include=['object', 'category', 'string']).columns`);
      } else {
        const colList = columns
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean);
        lines.push(`_target_cols_${cleanId} = ${JSON.stringify(colList)}`);
      }
      lines.push(`for _col in _target_cols_${cleanId}:`);
      lines.push(`    ${outputVar}[_col] = LabelEncoder().fit_transform(${outputVar}[_col].astype(str))`);
    } else {
      lines.push(`${outputVar} = ${inputDataset}.copy()`);
      if (columns === "auto") {
        lines.push(`_target_cols_${cleanId} = ${outputVar}.select_dtypes(include=['object', 'category', 'string']).columns`);
      } else {
        const colList = columns
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean);
        lines.push(`_target_cols_${cleanId} = ${JSON.stringify(colList)}`);
      }
      lines.push(`if len(_target_cols_${cleanId}) > 0:`);
      lines.push(`    ${outputVar}[_target_cols_${cleanId}] = OrdinalEncoder().fit_transform(${outputVar}[_target_cols_${cleanId}].astype(str))`);
    }

    if (options.includeProtocolHooks) {
      lines.push(`emit_json({`);
      lines.push(`    "type": "console",`);
      lines.push(`    "stream": "stdout",`);
      lines.push(`    "text": f"[${block.id}] Categorical encoding applied ({method}): shape is {${outputVar}.shape}",`);
      lines.push(`    "timestamp": iso_now()`);
      lines.push(`})`);
    }

    const imports = ["import pandas as pd"];
    if (method === "label") {
      imports.push("from sklearn.preprocessing import LabelEncoder");
    } else if (method === "ordinal") {
      imports.push("from sklearn.preprocessing import OrdinalEncoder");
    }

    return {
      imports,
      code: lines.join("\n"),
    };
  }
}

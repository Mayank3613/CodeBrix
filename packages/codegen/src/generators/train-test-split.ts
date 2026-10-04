import type { BlockCodeGenerator, BlockCodeContext, BlockCodeResult } from "../types.js";
import { getOutputVariableName } from "../variable-resolver.js";

export class TrainTestSplitGenerator implements BlockCodeGenerator {
  readonly definitionId = "ml.train_test_split";

  generate(context: BlockCodeContext): BlockCodeResult {
    const { block, inputs, outputs, options } = context;
    const inputDataset = inputs["dataset_in"] ?? "df";
    
    const trainDataOut = outputs["train_data_out"] ?? getOutputVariableName(block.id, "train_data_out");
    const testDataOut = outputs["test_data_out"] ?? getOutputVariableName(block.id, "test_data_out");
    const yTestOut = outputs["y_test_out"] ?? getOutputVariableName(block.id, "y_test_out");

    const testSize = (block.config["test_size"] as number) ?? 0.2;
    const randomState = (block.config["random_state"] as number) ?? 42;
    const targetColumn = (block.config["target_column"] as string) ?? "species";

    const cleanId = block.id.replace(/[^a-zA-Z0-9_]/g, "_");
    const lines: string[] = [];

    if (options.includeComments) {
      lines.push(`# Block: ${block.label ?? "Train/Test Split"} (${block.id})`);
    }

    lines.push(`df_src_${cleanId} = ${inputDataset}.copy()`);
    lines.push(`target_col_${cleanId} = ${JSON.stringify(targetColumn)}`);
    lines.push(`if target_col_${cleanId} in df_src_${cleanId}.columns:`);
    lines.push(`    _target_name_${cleanId} = target_col_${cleanId}`);
    lines.push(`else:`);
    lines.push(`    _target_name_${cleanId} = df_src_${cleanId}.columns[-1]`);
    lines.push(`y_${cleanId} = df_src_${cleanId}[_target_name_${cleanId}]`);
    lines.push(`X_${cleanId} = df_src_${cleanId}.drop(columns=[_target_name_${cleanId}])`);
    lines.push(`_valid_mask_${cleanId} = ~y_${cleanId}.isna()`);
    lines.push(`X_${cleanId} = X_${cleanId}[_valid_mask_${cleanId}]`);
    lines.push(`y_${cleanId} = y_${cleanId}[_valid_mask_${cleanId}]`);
    lines.push(`_cat_cols_${cleanId} = X_${cleanId}.select_dtypes(include=['object', 'category', 'string']).columns`);
    lines.push(`if len(_cat_cols_${cleanId}) > 0:`);
    lines.push(`    X_${cleanId} = pd.get_dummies(X_${cleanId}, columns=_cat_cols_${cleanId}, drop_first=True, dtype=float)`);
    lines.push(`X_${cleanId} = X_${cleanId}.fillna(0)`);
    lines.push(`_effective_test_size_${cleanId} = min(max(int(len(X_${cleanId}) * ${testSize}), 1), len(X_${cleanId}) - 1) if len(X_${cleanId}) > 1 else 0.2`);
    lines.push(
      `X_tr_${cleanId}, X_te_${cleanId}, y_tr_${cleanId}, ${yTestOut} = train_test_split(` +
        `X_${cleanId}, y_${cleanId}, test_size=_effective_test_size_${cleanId}, random_state=${randomState}` +
        `)`
    );
    lines.push(`${trainDataOut} = pd.concat([X_tr_${cleanId}, y_tr_${cleanId}.rename(_target_name_${cleanId})], axis=1)`);
    lines.push(`${testDataOut} = X_te_${cleanId}`);

    if (options.includeProtocolHooks) {
      lines.push(`emit_json({`);
      lines.push(`    "type": "console",`);
      lines.push(`    "stream": "stdout",`);
      lines.push(`    "text": f"[${block.id}] Split completed: {len(${trainDataOut})} training rows, {len(${testDataOut})} test rows (target: '{_target_name_${cleanId}}')",`);
      lines.push(`    "timestamp": iso_now()`);
      lines.push(`})`);
    }

    return {
      imports: ["import pandas as pd", "from sklearn.model_selection import train_test_split"],
      code: lines.join("\n"),
    };
  }
}

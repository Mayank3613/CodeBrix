import type { BlockCodeGenerator, BlockCodeContext, BlockCodeResult } from "../types.js";
import { getOutputVariableName } from "../variable-resolver.js";

export class RandomForestGenerator implements BlockCodeGenerator {
  readonly definitionId = "ml.random_forest_classifier";

  generate(context: BlockCodeContext): BlockCodeResult {
    const { block, inputs, outputs, options } = context;
    const trainDataIn = inputs["train_data_in"] ?? "train_df";
    const modelOut = outputs["model_out"] ?? getOutputVariableName(block.id, "model_out");

    const nEstimators = (block.config["n_estimators"] as number) ?? 100;
    const randomState = (block.config["random_state"] as number) ?? 42;
    const targetColumn = (block.config["target_column"] as string) ?? "species";

    const cleanId = block.id.replace(/[^a-zA-Z0-9_]/g, "_");
    const lines: string[] = [];

    if (options.includeComments) {
      lines.push(`# Block: ${block.label ?? "Random Forest"} (${block.id})`);
    }

    lines.push(`df_train_${cleanId} = ${trainDataIn}`);
    lines.push(`target_col_${cleanId} = ${JSON.stringify(targetColumn)}`);
    lines.push(`if target_col_${cleanId} in df_train_${cleanId}.columns:`);
    lines.push(`    X_${cleanId} = df_train_${cleanId}.drop(columns=[target_col_${cleanId}])`);
    lines.push(`    y_${cleanId} = df_train_${cleanId}[target_col_${cleanId}]`);
    lines.push(`else:`);
    lines.push(`    X_${cleanId} = df_train_${cleanId}.iloc[:, :-1]`);
    lines.push(`    y_${cleanId} = df_train_${cleanId}.iloc[:, -1]`);
    lines.push(`${modelOut} = RandomForestClassifier(n_estimators=${nEstimators}, random_state=${randomState})`);
    lines.push(`${modelOut}.fit(X_${cleanId}, y_${cleanId})`);

    if (options.includeProtocolHooks) {
      lines.push(`emit_json({`);
      lines.push(`    "type": "console",`);
      lines.push(`    "stream": "stdout",`);
      lines.push(`    "text": f"[{block.id}] Random Forest trained: {${nEstimators}} estimators on {len(X_${cleanId})} samples",`);
      lines.push(`    "timestamp": iso_now()`);
      lines.push(`})`);
    }

    return {
      imports: ["from sklearn.ensemble import RandomForestClassifier"],
      code: lines.join("\n"),
    };
  }
}

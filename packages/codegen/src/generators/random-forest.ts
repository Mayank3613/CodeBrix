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

    lines.push(`df_train_${cleanId} = ${trainDataIn}.copy()`);
    lines.push(`target_col_${cleanId} = ${JSON.stringify(targetColumn)}`);
    lines.push(`if target_col_${cleanId} in df_train_${cleanId}.columns:`);
    lines.push(`    _target_name_${cleanId} = target_col_${cleanId}`);
    lines.push(`else:`);
    lines.push(`    _target_name_${cleanId} = df_train_${cleanId}.columns[-1]`);
    lines.push(`y_${cleanId} = df_train_${cleanId}[_target_name_${cleanId}]`);
    lines.push(`X_${cleanId} = df_train_${cleanId}.drop(columns=[_target_name_${cleanId}])`);
    lines.push(`_cat_cols_${cleanId} = X_${cleanId}.select_dtypes(include=['object', 'category', 'string']).columns`);
    lines.push(`if len(_cat_cols_${cleanId}) > 0:`);
    lines.push(`    X_${cleanId} = pd.get_dummies(X_${cleanId}, columns=_cat_cols_${cleanId}, drop_first=True, dtype=float)`);
    lines.push(`X_${cleanId} = X_${cleanId}.fillna(0)`);
    lines.push(`_is_continuous_${cleanId} = False`);
    lines.push(`try:`);
    lines.push(`    _target_type_${cleanId} = type_of_target(y_${cleanId})`);
    lines.push(`    _is_continuous_${cleanId} = _target_type_${cleanId} in ['continuous', 'continuous-multioutput']`);
    lines.push(`except Exception:`);
    lines.push(`    _is_continuous_${cleanId} = False`);
    lines.push(`if _is_continuous_${cleanId}:`);
    lines.push(`    ${modelOut} = RandomForestRegressor(n_estimators=${nEstimators}, random_state=${randomState})`);
    lines.push(`    ${modelOut}.fit(X_${cleanId}, y_${cleanId}.astype(float))`);
    lines.push(`else:`);
    lines.push(`    ${modelOut} = RandomForestClassifier(n_estimators=${nEstimators}, random_state=${randomState})`);
    lines.push(`    ${modelOut}.fit(X_${cleanId}, y_${cleanId}.astype(str))`);

    if (options.includeProtocolHooks) {
      lines.push(`emit_json({`);
      lines.push(`    "type": "console",`);
      lines.push(`    "stream": "stdout",`);
      lines.push(`    "blockId": ${JSON.stringify(block.id)},`);
      lines.push(`    "text": f"[${block.id}] Random Forest trained ({'Regressor' if _is_continuous_${cleanId} else 'Classifier'}): {${nEstimators}} estimators on {len(X_${cleanId})} samples",`);
      lines.push(`    "timestamp": iso_now()`);
      lines.push(`})`);
    }

    return {
      imports: [
        "import pandas as pd",
        "from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor",
        "from sklearn.utils.multiclass import type_of_target",
      ],
      code: lines.join("\n"),
    };
  }
}

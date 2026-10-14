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
    lines.push(`    _is_continuous_${cleanId} = _target_type_${cleanId} in ['continuous', 'continuous-multioutput'] and len(set(y_${cleanId})) > 5`);
    lines.push(`except Exception:`);
    lines.push(`    _is_continuous_${cleanId} = False`);
    lines.push(`if _is_continuous_${cleanId}:`);
    lines.push(`    ${modelOut} = RandomForestRegressor(n_estimators=${nEstimators}, random_state=${randomState})`);
    lines.push(`    ${modelOut}.fit(X_${cleanId}, y_${cleanId}.astype(float))`);
    lines.push(`else:`);
    lines.push(`    ${modelOut} = RandomForestClassifier(n_estimators=${nEstimators}, random_state=${randomState})`);
    lines.push(`    ${modelOut}.fit(X_${cleanId}, y_${cleanId}.astype(str))`);

    if (options.includeProtocolHooks) {
      lines.push(`try:`);
      lines.push(`    if hasattr(${modelOut}, 'feature_importances_'):`);
      lines.push(`        _feats_${cleanId} = list(X_${cleanId}.columns)`);
      lines.push(`        _imps_${cleanId} = [float(v) for v in ${modelOut}.feature_importances_]`);
      lines.push(`        _sorted_idx = sorted(range(len(_imps_${cleanId})), key=lambda i: _imps_${cleanId}[i], reverse=True)[:6]`);
      lines.push(`        _top_f = [_feats_${cleanId}[i] for i in _sorted_idx]`);
      lines.push(`        _top_v = [_imps_${cleanId}[i] for i in _sorted_idx]`);
      lines.push(`        _max_v = max(_top_v) if _top_v and max(_top_v) > 0 else 1.0`);
      lines.push(`        _svg_bars = ""`);
      lines.push(`        for _idx, (_f_name, _val) in enumerate(zip(_top_f, _top_v)):`);
      lines.push(`            _w = int((_val / _max_v) * 200)`);
      lines.push(`            _y = 30 + _idx * 24`);
      lines.push(`            _f_clean = str(_f_name)[:18]`);
      lines.push(`            _svg_bars += f'<text x="12" y="{_y+13}" fill="#94a3b8" font-family="sans-serif" font-size="10">{_f_clean}</text>'`);
      lines.push(`            _svg_bars += f'<rect x="130" y="{_y}" width="{max(_w, 4)}" height="16" rx="3" fill="#06b6d4" opacity="0.85"/>'`);
      lines.push(`            _svg_bars += f'<text x="{138+_w}" y="{_y+12}" fill="#e2e8f0" font-family="monospace" font-size="9">{_val:.3f}</text>'`);
      lines.push(`        _svg_h = 42 + len(_top_f) * 24`);
      lines.push(`        _svg_rf = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 {_svg_h}" width="100%" height="{_svg_h}"><rect width="100%" height="100%" fill="#090d18" rx="8"/><text x="12" y="18" fill="#e2e8f0" font-family="sans-serif" font-size="11" font-weight="bold">Feature Importance: {len(_top_f)} Key Predictors</text>{_svg_bars}</svg>'`);
      lines.push(`        emit_json({`);
      lines.push(`            "type": "image",`);
      lines.push(`            "blockId": ${JSON.stringify(block.id)},`);
      lines.push(`            "title": f"Feature Importance ({len(_top_f)} Features)",`);
      lines.push(`            "format": "svg",`);
      lines.push(`            "data": _svg_rf,`);
      lines.push(`            "metadata": {"kind": "plot"},`);
      lines.push(`            "timestamp": iso_now()`);
      lines.push(`        })`);
      lines.push(`except Exception:`);
      lines.push(`    pass`);
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

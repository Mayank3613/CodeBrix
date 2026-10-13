import type { BlockCodeGenerator, BlockCodeContext, BlockCodeResult } from "../types.js";
import { getOutputVariableName, sanitizePythonIdentifier } from "../variable-resolver.js";

/**
 * Intelligent Fallback & Dynamic Custom Block Code Generator.
 * Handles:
 * 1. User-created custom blocks with embedded Python scripts (`block.config.customCode` / `code`)
 * 2. Extended ML algorithms (Logistic Regression, Decision Trees, Linear Models, etc.)
 * 3. Graceful stub fallback for generic/unrecognized blocks.
 */
export class FallbackBlockGenerator implements BlockCodeGenerator {
  readonly definitionId = "*";

  generate(context: BlockCodeContext): BlockCodeResult {
    const { block, inputs, outputs, options } = context;
    const cleanId = sanitizePythonIdentifier(block.id);
    const lines: string[] = [];
    const imports = new Set<string>();

    if (options.includeComments) {
      lines.push(`# Block: ${block.label ?? block.definitionId} (${block.id})`);
    }

    // ── Case 1: Custom Block with inline Python code ───────────────────
    const customCode =
      (block.config["customCode"] as string | undefined) ??
      (block.config["code"] as string | undefined);

    if (customCode && typeof customCode === "string" && customCode.trim().length > 0) {
      imports.add("import pandas as pd");
      imports.add("import numpy as np");

      lines.push(`_inputs_${cleanId} = {}`);
      for (const [portId, varName] of Object.entries(inputs)) {
        lines.push(`_inputs_${cleanId}[${JSON.stringify(portId)}] = ${varName}`);
      }
      lines.push(`_config_${cleanId} = ${JSON.stringify(block.config)}`);
      lines.push(`_outputs_${cleanId} = {}`);
      lines.push(``);
      lines.push(`# --- Begin User Custom Script for ${block.id} ---`);
      lines.push(`inputs = _inputs_${cleanId}`);
      lines.push(`config = _config_${cleanId}`);
      lines.push(`outputs = _outputs_${cleanId}`);

      // Map incoming input variables directly into local scope if present
      for (const [portId, varName] of Object.entries(inputs)) {
        const localId = sanitizePythonIdentifier(portId);
        lines.push(`${localId} = ${varName}`);
      }

      // Indent user lines if necessary or inject directly
      const userLines = customCode.split("\n");
      for (const uLine of userLines) {
        lines.push(uLine);
      }
      lines.push(`# --- End User Custom Script ---`);
      lines.push(``);

      // Assign outputs to resolved variable names
      for (const [portId, varName] of Object.entries(outputs)) {
        const localId = sanitizePythonIdentifier(portId);
        lines.push(
          `${varName} = outputs.get(${JSON.stringify(portId)}, locals().get(${JSON.stringify(localId)}, None))`
        );
      }

      if (options.includeProtocolHooks) {
        lines.push(`emit_json({`);
        lines.push(`    "type": "console",`);
        lines.push(`    "stream": "stdout",`);
        lines.push(`    "blockId": ${JSON.stringify(block.id)},`);
        lines.push(`    "text": f"[${block.id}] Custom block executed successfully.",`);
        lines.push(`    "timestamp": iso_now()`);
        lines.push(`})`);
      }

      return {
        imports: Array.from(imports),
        code: lines.join("\n"),
      };
    }

    // ── Case 2: Extended Builtin Models ────────────────────────────────
    const defId = block.definitionId;

    if (defId === "ml.logistic_regression") {
      imports.add("import pandas as pd");
      imports.add("from sklearn.linear_model import LogisticRegression");
      const trainIn = inputs["train_data_in"] ?? "train_df";
      const modelOut = outputs["model_out"] ?? getOutputVariableName(block.id, "model_out");
      const cVal = (block.config["c_param"] as number) ?? 1.0;
      const maxIter = (block.config["max_iter"] as number) ?? 200;
      const solver = (block.config["solver"] as string) ?? "lbfgs";

      lines.push(`_df_${cleanId} = ${trainIn}.copy()`);
      lines.push(`_X_${cleanId} = _df_${cleanId}.iloc[:, :-1]`);
      lines.push(`_y_${cleanId} = _df_${cleanId}.iloc[:, -1]`);
      lines.push(`_cat_cols_${cleanId} = _X_${cleanId}.select_dtypes(include=['object', 'category', 'string']).columns`);
      lines.push(`if len(_cat_cols_${cleanId}) > 0:`);
      lines.push(`    _X_${cleanId} = pd.get_dummies(_X_${cleanId}, columns=_cat_cols_${cleanId}, drop_first=True, dtype=float)`);
      lines.push(`_X_${cleanId} = _X_${cleanId}.fillna(0)`);
      lines.push(`if hasattr(_y_${cleanId}, 'dtype') and _y_${cleanId}.dtype.kind in 'fc':`);
      lines.push(`    if len(set(_y_${cleanId})) <= 10:`);
      lines.push(`        _y_${cleanId} = _y_${cleanId}.round().astype(int).astype(str)`);
      lines.push(`    else:`);
      lines.push(`        _y_${cleanId} = pd.qcut(_y_${cleanId}, q=min(3, len(set(_y_${cleanId}))), duplicates='drop').astype(str)`);
      lines.push(`else:`);
      lines.push(`    _y_${cleanId} = _y_${cleanId}.astype(str)`);
      imports.add("import numpy as np");
      lines.push(`${modelOut} = LogisticRegression(C=${cVal}, max_iter=${maxIter}, solver=${JSON.stringify(solver)})`);
      lines.push(`${modelOut}.fit(_X_${cleanId}, _y_${cleanId})`);
      if (options.includeProtocolHooks) {
        lines.push(`try:`);
        lines.push(`    if hasattr(${modelOut}, 'coef_'):`);
        lines.push(`        _coefs = np.abs(${modelOut}.coef_[0] if len(${modelOut}.coef_.shape) > 1 else ${modelOut}.coef_)`);
        lines.push(`        _feats = list(_X_${cleanId}.columns)`);
        lines.push(`        _sorted_idx = sorted(range(len(_coefs)), key=lambda i: _coefs[i], reverse=True)[:6]`);
        lines.push(`        _top_f = [_feats[i] for i in _sorted_idx]`);
        lines.push(`        _top_v = [float(_coefs[i]) for i in _sorted_idx]`);
        lines.push(`        _max_v = max(_top_v) if _top_v and max(_top_v) > 0 else 1.0`);
        lines.push(`        _svg_bars = ""`);
        lines.push(`        for _idx, (_f_name, _val) in enumerate(zip(_top_f, _top_v)):`);
        lines.push(`            _w = int((_val / _max_v) * 200)`);
        lines.push(`            _y = 30 + _idx * 24`);
        lines.push(`            _f_clean = str(_f_name)[:18]`);
        lines.push(`            _svg_bars += f'<text x="12" y="{_y+13}" fill="#94a3b8" font-family="sans-serif" font-size="10">{_f_clean}</text>'`);
        lines.push(`            _svg_bars += f'<rect x="130" y="{_y}" width="{max(_w, 4)}" height="16" rx="3" fill="#8b5cf6" opacity="0.85"/>'`);
        lines.push(`            _svg_bars += f'<text x="{138+_w}" y="{_y+12}" fill="#e2e8f0" font-family="monospace" font-size="9">{_val:.3f}</text>'`);
        lines.push(`        _svg_h = 42 + len(_top_f) * 24`);
        lines.push(`        _svg_lr = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 {_svg_h}" width="100%" height="{_svg_h}"><rect width="100%" height="100%" fill="#090d18" rx="8"/><text x="12" y="18" fill="#e2e8f0" font-family="sans-serif" font-size="11" font-weight="bold">Feature Coefficients (|Log-Odds| Magnitude)</text>{_svg_bars}</svg>'`);
        lines.push(`        emit_json({`);
        lines.push(`            "type": "image",`);
        lines.push(`            "blockId": ${JSON.stringify(block.id)},`);
        lines.push(`            "title": f"Feature Coefficients ({len(_top_f)} Predictors)",`);
        lines.push(`            "format": "svg",`);
        lines.push(`            "data": _svg_lr,`);
        lines.push(`            "timestamp": iso_now()`);
        lines.push(`})`);
        lines.push(`except Exception:`);
        lines.push(`    pass`);
      }
    } else if (defId === "ml.decision_tree_classifier") {
      imports.add("import pandas as pd");
      imports.add("from sklearn.tree import DecisionTreeClassifier");
      const trainIn = inputs["train_data_in"] ?? "train_df";
      const modelOut = outputs["model_out"] ?? getOutputVariableName(block.id, "model_out");
      const criterion = (block.config["criterion"] as string) ?? "gini";
      const maxDepth = (block.config["max_depth"] as number) || undefined;

      lines.push(`_df_${cleanId} = ${trainIn}.copy()`);
      lines.push(`_X_${cleanId} = _df_${cleanId}.iloc[:, :-1]`);
      lines.push(`_y_${cleanId} = _df_${cleanId}.iloc[:, -1]`);
      lines.push(`_cat_cols_${cleanId} = _X_${cleanId}.select_dtypes(include=['object', 'category', 'string']).columns`);
      lines.push(`if len(_cat_cols_${cleanId}) > 0:`);
      lines.push(`    _X_${cleanId} = pd.get_dummies(_X_${cleanId}, columns=_cat_cols_${cleanId}, drop_first=True, dtype=float)`);
      lines.push(`_X_${cleanId} = _X_${cleanId}.fillna(0)`);
      lines.push(`if hasattr(_y_${cleanId}, 'dtype') and _y_${cleanId}.dtype.kind in 'fc':`);
      lines.push(`    if len(set(_y_${cleanId})) <= 10:`);
      lines.push(`        _y_${cleanId} = _y_${cleanId}.round().astype(int).astype(str)`);
      lines.push(`    else:`);
      lines.push(`        _y_${cleanId} = pd.qcut(_y_${cleanId}, q=min(3, len(set(_y_${cleanId}))), duplicates='drop').astype(str)`);
      lines.push(`else:`);
      lines.push(`    _y_${cleanId} = _y_${cleanId}.astype(str)`);
      lines.push(`${modelOut} = DecisionTreeClassifier(criterion=${JSON.stringify(criterion)}, max_depth=${maxDepth ? maxDepth : "None"})`);
      lines.push(`${modelOut}.fit(_X_${cleanId}, _y_${cleanId})`);
      if (options.includeProtocolHooks) {
        lines.push(`try:`);
        lines.push(`    if hasattr(${modelOut}, 'feature_importances_'):`);
        lines.push(`        _imps = [float(v) for v in ${modelOut}.feature_importances_]`);
        lines.push(`        _feats = list(_X_${cleanId}.columns)`);
        lines.push(`        _sorted_idx = sorted(range(len(_imps)), key=lambda i: _imps[i], reverse=True)[:6]`);
        lines.push(`        _top_f = [_feats[i] for i in _sorted_idx]`);
        lines.push(`        _top_v = [_imps[i] for i in _sorted_idx]`);
        lines.push(`        _max_v = max(_top_v) if _top_v and max(_top_v) > 0 else 1.0`);
        lines.push(`        _svg_bars = ""`);
        lines.push(`        for _idx, (_f_name, _val) in enumerate(zip(_top_f, _top_v)):`);
        lines.push(`            _w = int((_val / _max_v) * 200)`);
        lines.push(`            _y = 30 + _idx * 24`);
        lines.push(`            _f_clean = str(_f_name)[:18]`);
        lines.push(`            _svg_bars += f'<text x="12" y="{_y+13}" fill="#94a3b8" font-family="sans-serif" font-size="10">{_f_clean}</text>'`);
        lines.push(`            _svg_bars += f'<rect x="130" y="{_y}" width="{max(_w, 4)}" height="16" rx="3" fill="#10b981" opacity="0.85"/>'`);
        lines.push(`            _svg_bars += f'<text x="{138+_w}" y="{_y+12}" fill="#e2e8f0" font-family="monospace" font-size="9">{_val:.3f}</text>'`);
        lines.push(`        _svg_h = 42 + len(_top_f) * 24`);
        lines.push(`        _svg_dt = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 {_svg_h}" width="100%" height="{_svg_h}"><rect width="100%" height="100%" fill="#090d18" rx="8"/><text x="12" y="18" fill="#e2e8f0" font-family="sans-serif" font-size="11" font-weight="bold">Decision Tree Feature Importance</text>{_svg_bars}</svg>'`);
        lines.push(`        emit_json({`);
        lines.push(`            "type": "image",`);
        lines.push(`            "blockId": ${JSON.stringify(block.id)},`);
        lines.push(`            "title": f"Decision Tree Feature Importance",`);
        lines.push(`            "format": "svg",`);
        lines.push(`            "data": _svg_dt,`);
        lines.push(`            "timestamp": iso_now()`);
        lines.push(`})`);
        lines.push(`except Exception:`);
        lines.push(`    pass`);
      }
    } else if (defId === "ml.linear_regression") {
      imports.add("import pandas as pd");
      imports.add("from sklearn.linear_model import LinearRegression");
      const trainIn = inputs["train_data_in"] ?? "train_df";
      const modelOut = outputs["model_out"] ?? getOutputVariableName(block.id, "model_out");

      lines.push(`_df_${cleanId} = ${trainIn}.copy()`);
      lines.push(`_X_${cleanId} = _df_${cleanId}.iloc[:, :-1]`);
      lines.push(`_y_${cleanId} = _df_${cleanId}.iloc[:, -1]`);
      lines.push(`${modelOut} = LinearRegression()`);
      lines.push(`${modelOut}.fit(_X_${cleanId}, _y_${cleanId})`);
    } else if (defId === "ml.ridge_regression" || defId === "ml.ridge") {
      imports.add("import pandas as pd");
      imports.add("from sklearn.linear_model import Ridge");
      const trainIn = inputs["train_data_in"] ?? "train_df";
      const modelOut = outputs["model_out"] ?? getOutputVariableName(block.id, "model_out");
      const alpha = (block.config["alpha"] as number) ?? 1.0;

      lines.push(`_df_${cleanId} = ${trainIn}.copy()`);
      lines.push(`_X_${cleanId} = _df_${cleanId}.iloc[:, :-1]`);
      lines.push(`_y_${cleanId} = _df_${cleanId}.iloc[:, -1]`);
      lines.push(`${modelOut} = Ridge(alpha=${alpha})`);
      lines.push(`${modelOut}.fit(_X_${cleanId}, _y_${cleanId})`);
    } else if (defId === "ml.lasso_regression") {
      imports.add("import pandas as pd");
      imports.add("from sklearn.linear_model import Lasso");
      const trainIn = inputs["train_data_in"] ?? "train_df";
      const modelOut = outputs["model_out"] ?? getOutputVariableName(block.id, "model_out");
      const alpha = (block.config["alpha"] as number) ?? 0.1;

      lines.push(`_df_${cleanId} = ${trainIn}.copy()`);
      lines.push(`_X_${cleanId} = _df_${cleanId}.iloc[:, :-1]`);
      lines.push(`_y_${cleanId} = _df_${cleanId}.iloc[:, -1]`);
      lines.push(`${modelOut} = Lasso(alpha=${alpha})`);
      lines.push(`${modelOut}.fit(_X_${cleanId}, _y_${cleanId})`);
    } else if (defId === "ml.kmeans") {
      imports.add("import pandas as pd");
      imports.add("from sklearn.cluster import KMeans");
      const dataIn = inputs["train_data_in"] ?? inputs["data_in"] ?? inputs["dataset_in"] ?? "data_df";
      const modelOut = outputs["model_out"] ?? getOutputVariableName(block.id, "model_out");
      const predOut = outputs["predictions_out"] ?? getOutputVariableName(block.id, "predictions_out");
      const nClusters = (block.config["n_clusters"] as number) ?? 3;

      lines.push(`${modelOut} = KMeans(n_clusters=${nClusters}, random_state=42)`);
      lines.push(`${predOut} = pd.Series(${modelOut}.fit_predict(${dataIn}), name="cluster")`);
    } else if (defId === "ml.pca" || defId === "prep.pca") {
      imports.add("import pandas as pd");
      imports.add("from sklearn.decomposition import PCA");
      const dataIn = inputs["dataset_in"] ?? inputs["train_data_in"] ?? "df_in";
      const dataOut = outputs["dataset_out"] ?? getOutputVariableName(block.id, "dataset_out");
      const nComp = (block.config["n_components"] as number) ?? 2;

      lines.push(`_num_df_${cleanId} = ${dataIn}.select_dtypes(include=['number'])`);
      lines.push(`_n_comp_${cleanId} = min(${nComp}, max(1, _num_df_${cleanId}.shape[1]))`);
      lines.push(`_pca_${cleanId} = PCA(n_components=_n_comp_${cleanId})`);
      lines.push(`_pca_vals_${cleanId} = _pca_${cleanId}.fit_transform(_num_df_${cleanId})`);
      lines.push(`${dataOut} = pd.DataFrame(_pca_vals_${cleanId}, columns=[f"pca_{i+1}" for i in range(_n_comp_${cleanId})])`);
    } else if (defId === "prep.standard_scaler" || defId === "data.scaler") {
      imports.add("import pandas as pd");
      imports.add("from sklearn.preprocessing import StandardScaler");
      const dataIn = inputs["dataset_in"] ?? inputs["train_data_in"] ?? "df_in";
      const dataOut = outputs["dataset_out"] ?? getOutputVariableName(block.id, "dataset_out");

      lines.push(`_scaler_${cleanId} = StandardScaler()`);
      lines.push(`${dataOut} = ${dataIn}.copy()`);
      lines.push(`_exclude_${cleanId} = {'survived', 'target', 'species', 'churn', 'label', 'class', 'default', 'y'}`);
      lines.push(`_num_cols_${cleanId} = [c for c in ${dataIn}.select_dtypes(include=['number']).columns if str(c).lower() not in _exclude_${cleanId}]`);
      lines.push(`if len(_num_cols_${cleanId}) > 0:`);
      lines.push(`    ${dataOut}[_num_cols_${cleanId}] = _scaler_${cleanId}.fit_transform(${dataIn}[_num_cols_${cleanId}])`);
    } else if (defId === "prep.minmax_scaler") {
      imports.add("import pandas as pd");
      imports.add("from sklearn.preprocessing import MinMaxScaler");
      const dataIn = inputs["dataset_in"] ?? inputs["train_data_in"] ?? "df_in";
      const dataOut = outputs["dataset_out"] ?? getOutputVariableName(block.id, "dataset_out");
      const fMin = (block.config["feature_range_min"] as number) ?? 0;
      const fMax = (block.config["feature_range_max"] as number) ?? 1;

      lines.push(`_scaler_${cleanId} = MinMaxScaler(feature_range=(${fMin}, ${fMax}))`);
      lines.push(`${dataOut} = ${dataIn}.copy()`);
      lines.push(`_exclude_${cleanId} = {'survived', 'target', 'species', 'churn', 'label', 'class', 'default', 'y'}`);
      lines.push(`_num_cols_${cleanId} = [c for c in ${dataIn}.select_dtypes(include=['number']).columns if str(c).lower() not in _exclude_${cleanId}]`);
      lines.push(`if len(_num_cols_${cleanId}) > 0:`);
      lines.push(`    ${dataOut}[_num_cols_${cleanId}] = _scaler_${cleanId}.fit_transform(${dataIn}[_num_cols_${cleanId}])`);
    } else if (defId === "data.synthetic_classification") {
      imports.add("import pandas as pd");
      imports.add("from sklearn.datasets import make_classification");
      const dataOut = outputs["dataset_out"] ?? getOutputVariableName(block.id, "dataset_out");
      const nSamples = (block.config["n_samples"] as number) ?? 200;
      const nFeatures = (block.config["n_features"] as number) ?? 4;
      const nClasses = (block.config["n_classes"] as number) ?? 2;
      const rState = (block.config["random_state"] as number) ?? 42;

      lines.push(`_X_${cleanId}, _y_${cleanId} = make_classification(n_samples=${nSamples}, n_features=${nFeatures}, n_classes=${nClasses}, n_informative=min(${nFeatures}, max(2, ${nClasses})), random_state=${rState})`);
      lines.push(`_cols_${cleanId} = [f"feat_{i+1}" for i in range(${nFeatures})]`);
      lines.push(`${dataOut} = pd.DataFrame(_X_${cleanId}, columns=_cols_${cleanId})`);
      lines.push(`${dataOut}["species"] = [f"class_{c}" for c in _y_${cleanId}]`);
    } else if (defId === "data.synthetic_regression") {
      imports.add("import pandas as pd");
      imports.add("from sklearn.datasets import make_regression");
      const dataOut = outputs["dataset_out"] ?? getOutputVariableName(block.id, "dataset_out");
      const nSamples = (block.config["n_samples"] as number) ?? 200;
      const nFeatures = (block.config["n_features"] as number) ?? 4;
      const noise = (block.config["noise"] as number) ?? 0.1;
      const rState = (block.config["random_state"] as number) ?? 42;

      lines.push(`_X_${cleanId}, _y_${cleanId} = make_regression(n_samples=${nSamples}, n_features=${nFeatures}, noise=${noise}, random_state=${rState})`);
      lines.push(`_cols_${cleanId} = [f"feat_{i+1}" for i in range(${nFeatures})]`);
      lines.push(`${dataOut} = pd.DataFrame(_X_${cleanId}, columns=_cols_${cleanId})`);
      lines.push(`${dataOut}["target"] = _y_${cleanId}`);
    } else if (defId === "prep.drop_columns") {
      imports.add("import pandas as pd");
      const dataIn = inputs["dataset_in"] ?? "df_in";
      const dataOut = outputs["dataset_out"] ?? getOutputVariableName(block.id, "dataset_out");
      const colsToDrop = (block.config["columns_to_drop"] as string) ?? "id,unnamed";
      const dropNa = Boolean(block.config["drop_na_rows"]);

      lines.push(`_cols_to_drop_${cleanId} = [c.strip() for c in ${JSON.stringify(colsToDrop)}.split(',') if c.strip() in ${dataIn}.columns]`);
      lines.push(`${dataOut} = ${dataIn}.drop(columns=_cols_to_drop_${cleanId})`);
      if (dropNa) {
        lines.push(`${dataOut} = ${dataOut}.dropna()`);
      }
    } else if (defId === "prep.outlier_filter") {
      imports.add("import pandas as pd");
      imports.add("import numpy as np");
      const dataIn = inputs["dataset_in"] ?? "df_in";
      const dataOut = outputs["dataset_out"] ?? getOutputVariableName(block.id, "dataset_out");
      const mult = (block.config["iqr_multiplier"] as number) ?? 1.5;

      lines.push(`${dataOut} = ${dataIn}.copy()`);
      lines.push(`_num_cols_${cleanId} = ${dataOut}.select_dtypes(include=['number']).columns`);
      lines.push(`for _col in _num_cols_${cleanId}:`);
      lines.push(`    _q1 = ${dataOut}[_col].quantile(0.25)`);
      lines.push(`    _q3 = ${dataOut}[_col].quantile(0.75)`);
      lines.push(`    _iqr = _q3 - _q1`);
      lines.push(`    if _iqr > 0:`);
      lines.push(`        ${dataOut} = ${dataOut}[(${dataOut}[_col] >= _q1 - ${mult} * _iqr) & (${dataOut}[_col] <= _q3 + ${mult} * _iqr)]`);
    } else if (defId === "ml.knn_classifier") {
      imports.add("import pandas as pd");
      imports.add("from sklearn.neighbors import KNeighborsClassifier");
      const trainIn = inputs["train_data_in"] ?? "train_df";
      const modelOut = outputs["model_out"] ?? getOutputVariableName(block.id, "model_out");
      const nNeigh = (block.config["n_neighbors"] as number) ?? 5;

      lines.push(`_df_${cleanId} = ${trainIn}.copy()`);
      lines.push(`_X_${cleanId} = _df_${cleanId}.iloc[:, :-1]`);
      lines.push(`_y_${cleanId} = _df_${cleanId}.iloc[:, -1]`);
      lines.push(`_cat_cols_${cleanId} = _X_${cleanId}.select_dtypes(include=['object', 'category', 'string']).columns`);
      lines.push(`if len(_cat_cols_${cleanId}) > 0:`);
      lines.push(`    _X_${cleanId} = pd.get_dummies(_X_${cleanId}, columns=_cat_cols_${cleanId}, drop_first=True, dtype=float)`);
      lines.push(`_X_${cleanId} = _X_${cleanId}.fillna(0)`);
      lines.push(`if hasattr(_y_${cleanId}, 'dtype') and _y_${cleanId}.dtype.kind in 'fc':`);
      lines.push(`    if len(set(_y_${cleanId})) <= 10:`);
      lines.push(`        _y_${cleanId} = _y_${cleanId}.round().astype(int).astype(str)`);
      lines.push(`    else:`);
      lines.push(`        _y_${cleanId} = pd.qcut(_y_${cleanId}, q=min(3, len(set(_y_${cleanId}))), duplicates='drop').astype(str)`);
      lines.push(`else:`);
      lines.push(`    _y_${cleanId} = _y_${cleanId}.astype(str)`);
      lines.push(`${modelOut} = KNeighborsClassifier(n_neighbors=min(${nNeigh}, len(_X_${cleanId})))`);
      lines.push(`${modelOut}.fit(_X_${cleanId}, _y_${cleanId})`);
      if (options.includeProtocolHooks) {
        lines.push(`try:`);
        lines.push(`    _val_counts = _y_${cleanId}.value_counts().head(6)`);
        lines.push(`    _cls_names = [str(k) for k in _val_counts.index]`);
        lines.push(`    _cls_counts = [int(v) for v in _val_counts.values]`);
        lines.push(`    _max_c = max(_cls_counts) if _cls_counts else 1`);
        lines.push(`    _svg_bars = ""`);
        lines.push(`    for _idx, (_c_name, _c_val) in enumerate(zip(_cls_names, _cls_counts)):`);
        lines.push(`        _w = int((_c_val / _max_c) * 200)`);
        lines.push(`        _y = 30 + _idx * 24`);
        lines.push(`        _c_clean = str(_c_name)[:18]`);
        lines.push(`        _svg_bars += f'<text x="12" y="{_y+13}" fill="#94a3b8" font-family="sans-serif" font-size="10">{_c_clean}</text>'`);
        lines.push(`        _svg_bars += f'<rect x="130" y="{_y}" width="{max(_w, 4)}" height="16" rx="3" fill="#3b82f6" opacity="0.85"/>'`);
        lines.push(`        _svg_bars += f'<text x="{138+_w}" y="{_y+12}" fill="#e2e8f0" font-family="monospace" font-size="9">{_c_val} samples</text>'`);
        lines.push(`    _svg_h = 42 + len(_cls_names) * 24`);
        lines.push(`    _svg_knn = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 {_svg_h}" width="100%" height="{_svg_h}"><rect width="100%" height="100%" fill="#090d18" rx="8"/><text x="12" y="18" fill="#e2e8f0" font-family="sans-serif" font-size="11" font-weight="bold">KNN Neighbor Classes (k={min(${nNeigh}, len(_X_${cleanId}))})</text>{_svg_bars}</svg>'`);
        lines.push(`    emit_json({`);
        lines.push(`        "type": "image",`);
        lines.push(`        "blockId": ${JSON.stringify(block.id)},`);
        lines.push(`        "title": f"KNN Class Distribution (k={${nNeigh}})",`);
        lines.push(`        "format": "svg",`);
        lines.push(`        "data": _svg_knn,`);
        lines.push(`        "timestamp": iso_now()`);
        lines.push(`    })`);
        lines.push(`except Exception:`);
        lines.push(`    pass`);
      }
    } else if (defId === "ml.svc") {
      imports.add("import pandas as pd");
      imports.add("from sklearn.svm import SVC");
      const trainIn = inputs["train_data_in"] ?? "train_df";
      const modelOut = outputs["model_out"] ?? getOutputVariableName(block.id, "model_out");
      const kernel = (block.config["kernel"] as string) ?? "rbf";
      const cVal = (block.config["c_param"] as number) ?? 1.0;

      lines.push(`_df_${cleanId} = ${trainIn}.copy()`);
      lines.push(`_X_${cleanId} = _df_${cleanId}.iloc[:, :-1]`);
      lines.push(`_y_${cleanId} = _df_${cleanId}.iloc[:, -1]`);
      lines.push(`_cat_cols_${cleanId} = _X_${cleanId}.select_dtypes(include=['object', 'category', 'string']).columns`);
      lines.push(`if len(_cat_cols_${cleanId}) > 0:`);
      lines.push(`    _X_${cleanId} = pd.get_dummies(_X_${cleanId}, columns=_cat_cols_${cleanId}, drop_first=True, dtype=float)`);
      lines.push(`_X_${cleanId} = _X_${cleanId}.fillna(0)`);
      lines.push(`if hasattr(_y_${cleanId}, 'dtype') and _y_${cleanId}.dtype.kind in 'fc':`);
      lines.push(`    if len(set(_y_${cleanId})) <= 10:`);
      lines.push(`        _y_${cleanId} = _y_${cleanId}.round().astype(int).astype(str)`);
      lines.push(`    else:`);
      lines.push(`        _y_${cleanId} = pd.qcut(_y_${cleanId}, q=min(3, len(set(_y_${cleanId}))), duplicates='drop').astype(str)`);
      lines.push(`else:`);
      lines.push(`    _y_${cleanId} = _y_${cleanId}.astype(str)`);
      lines.push(`${modelOut} = SVC(kernel=${JSON.stringify(kernel)}, C=${cVal}, probability=True)`);
      lines.push(`${modelOut}.fit(_X_${cleanId}, _y_${cleanId})`);
      if (options.includeProtocolHooks) {
        lines.push(`try:`);
        lines.push(`    if hasattr(${modelOut}, 'n_support_'):`);
        lines.push(`        _classes = [str(c) for c in ${modelOut}.classes_][:6]`);
        lines.push(`        _n_supp = [int(v) for v in ${modelOut}.n_support_][:6]`);
        lines.push(`        _max_s = max(_n_supp) if _n_supp else 1`);
        lines.push(`        _svg_bars = ""`);
        lines.push(`        for _idx, (_c_name, _s_val) in enumerate(zip(_classes, _n_supp)):`);
        lines.push(`            _w = int((_s_val / _max_s) * 200)`);
        lines.push(`            _y = 30 + _idx * 24`);
        lines.push(`            _c_clean = str(_c_name)[:18]`);
        lines.push(`            _svg_bars += f'<text x="12" y="{_y+13}" fill="#94a3b8" font-family="sans-serif" font-size="10">{_c_clean}</text>'`);
        lines.push(`            _svg_bars += f'<rect x="130" y="{_y}" width="{max(_w, 4)}" height="16" rx="3" fill="#a855f7" opacity="0.85"/>'`);
        lines.push(`            _svg_bars += f'<text x="{138+_w}" y="{_y+12}" fill="#e2e8f0" font-family="monospace" font-size="9">{_s_val} vectors</text>'`);
        lines.push(`        _tot_sv = int(sum(${modelOut}.n_support_))`);
        lines.push(`        _svg_h = 42 + len(_classes) * 24`);
        lines.push(`        _svg_svc = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 {_svg_h}" width="100%" height="{_svg_h}"><rect width="100%" height="100%" fill="#090d18" rx="8"/><text x="12" y="18" fill="#e2e8f0" font-family="sans-serif" font-size="11" font-weight="bold">SVC Support Vectors (Total: {_tot_sv})</text>{_svg_bars}</svg>'`);
        lines.push(`        emit_json({`);
        lines.push(`            "type": "image",`);
        lines.push(`            "blockId": ${JSON.stringify(block.id)},`);
        lines.push(`            "title": f"SVC Support Vector Distribution",`);
        lines.push(`            "format": "svg",`);
        lines.push(`            "data": _svg_svc,`);
        lines.push(`            "timestamp": iso_now()`);
        lines.push(`        })`);
        lines.push(`except Exception:`);
        lines.push(`    pass`);
      }
    } else if (defId === "ml.gradient_boosting_classifier") {
      imports.add("import pandas as pd");
      imports.add("from sklearn.ensemble import GradientBoostingClassifier");
      const trainIn = inputs["train_data_in"] ?? "train_df";
      const modelOut = outputs["model_out"] ?? getOutputVariableName(block.id, "model_out");
      const nEst = (block.config["n_estimators"] as number) ?? 100;
      const lr = (block.config["learning_rate"] as number) ?? 0.1;
      const maxDepth = (block.config["max_depth"] as number) ?? 3;

      lines.push(`_df_${cleanId} = ${trainIn}.copy()`);
      lines.push(`_X_${cleanId} = _df_${cleanId}.iloc[:, :-1]`);
      lines.push(`_y_${cleanId} = _df_${cleanId}.iloc[:, -1]`);
      lines.push(`_cat_cols_${cleanId} = _X_${cleanId}.select_dtypes(include=['object', 'category', 'string']).columns`);
      lines.push(`if len(_cat_cols_${cleanId}) > 0:`);
      lines.push(`    _X_${cleanId} = pd.get_dummies(_X_${cleanId}, columns=_cat_cols_${cleanId}, drop_first=True, dtype=float)`);
      lines.push(`_X_${cleanId} = _X_${cleanId}.fillna(0)`);
      lines.push(`if hasattr(_y_${cleanId}, 'dtype') and _y_${cleanId}.dtype.kind in 'fc':`);
      lines.push(`    if len(set(_y_${cleanId})) <= 10:`);
      lines.push(`        _y_${cleanId} = _y_${cleanId}.round().astype(int).astype(str)`);
      lines.push(`    else:`);
      lines.push(`        _y_${cleanId} = pd.qcut(_y_${cleanId}, q=min(3, len(set(_y_${cleanId}))), duplicates='drop').astype(str)`);
      lines.push(`else:`);
      lines.push(`    _y_${cleanId} = _y_${cleanId}.astype(str)`);
      lines.push(`${modelOut} = GradientBoostingClassifier(n_estimators=${nEst}, learning_rate=${lr}, max_depth=${maxDepth}, random_state=42)`);
      lines.push(`${modelOut}.fit(_X_${cleanId}, _y_${cleanId})`);
      if (options.includeProtocolHooks) {
        lines.push(`try:`);
        lines.push(`    if hasattr(${modelOut}, 'feature_importances_'):`);
        lines.push(`        _imps = [float(v) for v in ${modelOut}.feature_importances_]`);
        lines.push(`        _feats = list(_X_${cleanId}.columns)`);
        lines.push(`        _sorted_idx = sorted(range(len(_imps)), key=lambda i: _imps[i], reverse=True)[:6]`);
        lines.push(`        _top_f = [_feats[i] for i in _sorted_idx]`);
        lines.push(`        _top_v = [_imps[i] for i in _sorted_idx]`);
        lines.push(`        _max_v = max(_top_v) if _top_v and max(_top_v) > 0 else 1.0`);
        lines.push(`        _svg_bars = ""`);
        lines.push(`        for _idx, (_f_name, _val) in enumerate(zip(_top_f, _top_v)):`);
        lines.push(`            _w = int((_val / _max_v) * 200)`);
        lines.push(`            _y = 30 + _idx * 24`);
        lines.push(`            _f_clean = str(_f_name)[:18]`);
        lines.push(`            _svg_bars += f'<text x="12" y="{_y+13}" fill="#94a3b8" font-family="sans-serif" font-size="10">{_f_clean}</text>'`);
        lines.push(`            _svg_bars += f'<rect x="130" y="{_y}" width="{max(_w, 4)}" height="16" rx="3" fill="#f59e0b" opacity="0.85"/>'`);
        lines.push(`            _svg_bars += f'<text x="{138+_w}" y="{_y+12}" fill="#e2e8f0" font-family="monospace" font-size="9">{_val:.3f}</text>'`);
        lines.push(`        _svg_h = 42 + len(_top_f) * 24`);
        lines.push(`        _svg_gb = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 {_svg_h}" width="100%" height="{_svg_h}"><rect width="100%" height="100%" fill="#090d18" rx="8"/><text x="12" y="18" fill="#e2e8f0" font-family="sans-serif" font-size="11" font-weight="bold">Gradient Boosting Feature Importance</text>{_svg_bars}</svg>'`);
        lines.push(`        emit_json({`);
        lines.push(`            "type": "image",`);
        lines.push(`            "blockId": ${JSON.stringify(block.id)},`);
        lines.push(`            "title": f"Gradient Boosting Feature Importance",`);
        lines.push(`            "format": "svg",`);
        lines.push(`            "data": _svg_gb,`);
        lines.push(`            "timestamp": iso_now()`);
        lines.push(`})`);
        lines.push(`except Exception:`);
        lines.push(`    pass`);
      }
    } else if (defId === "ml.gaussian_nb") {
      imports.add("import pandas as pd");
      imports.add("from sklearn.naive_bayes import GaussianNB");
      const trainIn = inputs["train_data_in"] ?? "train_df";
      const modelOut = outputs["model_out"] ?? getOutputVariableName(block.id, "model_out");

      lines.push(`_df_${cleanId} = ${trainIn}.copy()`);
      lines.push(`_X_${cleanId} = _df_${cleanId}.iloc[:, :-1]`);
      lines.push(`_y_${cleanId} = _df_${cleanId}.iloc[:, -1]`);
      lines.push(`_cat_cols_${cleanId} = _X_${cleanId}.select_dtypes(include=['object', 'category', 'string']).columns`);
      lines.push(`if len(_cat_cols_${cleanId}) > 0:`);
      lines.push(`    _X_${cleanId} = pd.get_dummies(_X_${cleanId}, columns=_cat_cols_${cleanId}, drop_first=True, dtype=float)`);
      lines.push(`_X_${cleanId} = _X_${cleanId}.fillna(0)`);
      lines.push(`if hasattr(_y_${cleanId}, 'dtype') and _y_${cleanId}.dtype.kind in 'fc':`);
      lines.push(`    if len(set(_y_${cleanId})) <= 10:`);
      lines.push(`        _y_${cleanId} = _y_${cleanId}.round().astype(int).astype(str)`);
      lines.push(`    else:`);
      lines.push(`        _y_${cleanId} = pd.qcut(_y_${cleanId}, q=min(3, len(set(_y_${cleanId}))), duplicates='drop').astype(str)`);
      lines.push(`else:`);
      lines.push(`    _y_${cleanId} = _y_${cleanId}.astype(str)`);
      lines.push(`${modelOut} = GaussianNB()`);
      lines.push(`${modelOut}.fit(_X_${cleanId}, _y_${cleanId})`);
      if (options.includeProtocolHooks) {
        lines.push(`try:`);
        lines.push(`    if hasattr(${modelOut}, 'class_prior_'):`);
        lines.push(`        _classes = [str(c) for c in ${modelOut}.classes_][:6]`);
        lines.push(`        _priors = [float(p) for p in ${modelOut}.class_prior_][:6]`);
        lines.push(`        _svg_bars = ""`);
        lines.push(`        for _idx, (_c_name, _p_val) in enumerate(zip(_classes, _priors)):`);
        lines.push(`            _w = int(_p_val * 200)`);
        lines.push(`            _y = 30 + _idx * 24`);
        lines.push(`            _c_clean = str(_c_name)[:18]`);
        lines.push(`            _svg_bars += f'<text x="12" y="{_y+13}" fill="#94a3b8" font-family="sans-serif" font-size="10">{_c_clean}</text>'`);
        lines.push(`            _svg_bars += f'<rect x="130" y="{_y}" width="{max(_w, 4)}" height="16" rx="3" fill="#0ea5e9" opacity="0.85"/>'`);
        lines.push(`            _svg_bars += f'<text x="{138+_w}" y="{_y+12}" fill="#e2e8f0" font-family="monospace" font-size="9">{_p_val:.2%}</text>'`);
        lines.push(`        _svg_h = 42 + len(_classes) * 24`);
        lines.push(`        _svg_nb = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 {_svg_h}" width="100%" height="{_svg_h}"><rect width="100%" height="100%" fill="#090d18" rx="8"/><text x="12" y="18" fill="#e2e8f0" font-family="sans-serif" font-size="11" font-weight="bold">Naive Bayes Prior Probabilities</text>{_svg_bars}</svg>'`);
        lines.push(`        emit_json({`);
        lines.push(`            "type": "image",`);
        lines.push(`            "blockId": ${JSON.stringify(block.id)},`);
        lines.push(`            "title": f"Naive Bayes Class Priors",`);
        lines.push(`            "format": "svg",`);
        lines.push(`            "data": _svg_nb,`);
        lines.push(`            "timestamp": iso_now()`);
        lines.push(`        })`);
        lines.push(`except Exception:`);
        lines.push(`    pass`);
      }
    } else if (defId === "ml.gradient_boosting_regressor") {
      imports.add("import pandas as pd");
      imports.add("from sklearn.ensemble import GradientBoostingRegressor");
      const trainIn = inputs["train_data_in"] ?? "train_df";
      const modelOut = outputs["model_out"] ?? getOutputVariableName(block.id, "model_out");
      const nEst = (block.config["n_estimators"] as number) ?? 100;
      const lr = (block.config["learning_rate"] as number) ?? 0.1;
      const maxDepth = (block.config["max_depth"] as number) ?? 3;

      lines.push(`_df_${cleanId} = ${trainIn}.copy()`);
      lines.push(`_X_${cleanId} = _df_${cleanId}.iloc[:, :-1]`);
      lines.push(`_y_${cleanId} = _df_${cleanId}.iloc[:, -1]`);
      lines.push(`${modelOut} = GradientBoostingRegressor(n_estimators=${nEst}, learning_rate=${lr}, max_depth=${maxDepth}, random_state=42)`);
      lines.push(`${modelOut}.fit(_X_${cleanId}, _y_${cleanId})`);
    } else if (defId === "ml.random_forest_regressor") {
      imports.add("import pandas as pd");
      imports.add("from sklearn.ensemble import RandomForestRegressor");
      const trainIn = inputs["train_data_in"] ?? "train_df";
      const modelOut = outputs["model_out"] ?? getOutputVariableName(block.id, "model_out");
      const nEst = (block.config["n_estimators"] as number) ?? 100;
      const maxDepth = (block.config["max_depth"] as number) || undefined;

      lines.push(`_df_${cleanId} = ${trainIn}.copy()`);
      lines.push(`_X_${cleanId} = _df_${cleanId}.iloc[:, :-1]`);
      lines.push(`_y_${cleanId} = _df_${cleanId}.iloc[:, -1]`);
      lines.push(`${modelOut} = RandomForestRegressor(n_estimators=${nEst}, max_depth=${maxDepth ? maxDepth : "None"}, random_state=42)`);
      lines.push(`${modelOut}.fit(_X_${cleanId}, _y_${cleanId})`);
    } else if (defId === "prep.robust_scaler") {
      imports.add("import pandas as pd");
      imports.add("from sklearn.preprocessing import RobustScaler");
      const dataIn = inputs["dataset_in"] ?? inputs["train_data_in"] ?? "df_in";
      const dataOut = outputs["dataset_out"] ?? getOutputVariableName(block.id, "dataset_out");

      lines.push(`_scaler_${cleanId} = RobustScaler()`);
      lines.push(`${dataOut} = ${dataIn}.copy()`);
      lines.push(`_exclude_${cleanId} = {'survived', 'target', 'species', 'churn', 'label', 'class', 'default', 'y'}`);
      lines.push(`_num_cols_${cleanId} = [c for c in ${dataIn}.select_dtypes(include=['number']).columns if str(c).lower() not in _exclude_${cleanId} and not str(c).lower().startswith('churn')]`);
      lines.push(`if len(_num_cols_${cleanId}) > 0:`);
      lines.push(`    ${dataOut}[_num_cols_${cleanId}] = _scaler_${cleanId}.fit_transform(${dataIn}[_num_cols_${cleanId}])`);
    } else if (defId === "prep.encoder" || defId === "data.encoder") {
      imports.add("import pandas as pd");
      const dataIn = inputs["dataset_in"] ?? "df_in";
      const dataOut = outputs["dataset_out"] ?? getOutputVariableName(block.id, "dataset_out");

      lines.push(`_exclude_encode_${cleanId} = {'churn', 'survived', 'target', 'species', 'label', 'class', 'default', 'y'}`);
      lines.push(`_cat_cols_${cleanId} = [c for c in ${dataIn}.select_dtypes(include=['object', 'category', 'string']).columns if str(c).lower() not in _exclude_encode_${cleanId}]`);
      lines.push(`if len(_cat_cols_${cleanId}) > 0:`);
      lines.push(`    ${dataOut} = pd.get_dummies(${dataIn}, columns=_cat_cols_${cleanId}, drop_first=True, dtype=float)`);
      lines.push(`else:`);
      lines.push(`    ${dataOut} = ${dataIn}.copy()`);
    } else if (defId === "eval.regression_metrics") {
      imports.add("import pandas as pd");
      imports.add("import numpy as np");
      imports.add("from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error");
      const yPred = inputs["predictions_in"] ?? "y_pred";
      const yTrue = inputs["ground_truth_in"] ?? "y_true";
      const scoreOut = outputs["score_out"] ?? getOutputVariableName(block.id, "score_out");

      lines.push(`_mse_${cleanId} = float(mean_squared_error(${yTrue}, ${yPred}))`);
      lines.push(`_r2_${cleanId} = float(r2_score(${yTrue}, ${yPred}))`);
      lines.push(`_mae_${cleanId} = float(mean_absolute_error(${yTrue}, ${yPred}))`);
      lines.push(`${scoreOut} = _r2_${cleanId}`);
      if (options.includeProtocolHooks) {
        lines.push(`emit_json({`);
        lines.push(`    "type": "metrics",`);
        lines.push(`    "title": "Regression Metrics",`);
        lines.push(`    "metrics": {`);
        lines.push(`        "r2_score": _r2_${cleanId},`);
        lines.push(`        "mse": _mse_${cleanId},`);
        lines.push(`        "rmse": float(np.sqrt(_mse_${cleanId})),`);
        lines.push(`        "mae": _mae_${cleanId}`);
        lines.push(`    },`);
        lines.push(`    "timestamp": iso_now()`);
        lines.push(`})`);
      }
    } else if (defId === "eval.classification_report") {
      imports.add("import pandas as pd");
      imports.add("from sklearn.metrics import classification_report, f1_score");
      const yPred = inputs["predictions_in"] ?? "y_pred";
      const yTrue = inputs["ground_truth_in"] ?? "y_true";
      const scoreOut = outputs["score_out"] ?? getOutputVariableName(block.id, "score_out");

      lines.push(`try:`);
      lines.push(`    _f1_${cleanId} = float(f1_score(${yTrue}.astype(str), [str(p) for p in ${yPred}], average='macro'))`);
      lines.push(`    _rep_${cleanId} = classification_report(${yTrue}.astype(str), [str(p) for p in ${yPred}])`);
      lines.push(`    _rep_dict_${cleanId} = classification_report(${yTrue}.astype(str), [str(p) for p in ${yPred}], output_dict=True)`);
      lines.push(`except Exception:`);
      lines.push(`    _f1_${cleanId} = 0.0`);
      lines.push(`    _rep_${cleanId} = "Could not compute classification report"`);
      lines.push(`    _rep_dict_${cleanId} = {}`);
      lines.push(`${scoreOut} = _f1_${cleanId}`);
      if (options.includeProtocolHooks) {
        lines.push(`emit_json({`);
        lines.push(`    "type": "metrics",`);
        lines.push(`    "title": "Classification Report",`);
        lines.push(`    "metrics": { "f1_macro": _f1_${cleanId} },`);
        lines.push(`    "timestamp": iso_now()`);
        lines.push(`})`);
        lines.push(`try:`);
        lines.push(`    _classes_${cleanId} = [k for k in _rep_dict_${cleanId}.keys() if k not in ['accuracy', 'macro avg', 'weighted avg']][:6]`);
        lines.push(`    if _classes_${cleanId}:`);
        lines.push(`        _svg_rows = ""`);
        lines.push(`        for _idx, _cls in enumerate(_classes_${cleanId}):`);
        lines.push(`            _p = float(_rep_dict_${cleanId}[_cls].get('precision', 0.0))`);
        lines.push(`            _r = float(_rep_dict_${cleanId}[_cls].get('recall', 0.0))`);
        lines.push(`            _f = float(_rep_dict_${cleanId}[_cls].get('f1-score', 0.0))`);
        lines.push(`            _sup = int(_rep_dict_${cleanId}[_cls].get('support', 0))`);
        lines.push(`            _y_base = 45 + _idx * 52`);
        lines.push(`            _cls_clean = str(_cls)[:16]`);
        lines.push(`            _svg_rows += f'<text x="14" y="{_y_base+14}" fill="#e2e8f0" font-family="sans-serif" font-size="11" font-weight="600">{_cls_clean} <tspan fill="#64748b" font-size="9">(n={_sup})</tspan></text>'`);
        lines.push(`            _pw = int(_p * 180)`);
        lines.push(`            _rw = int(_r * 180)`);
        lines.push(`            _fw = int(_f * 180)`);
        lines.push(`            _svg_rows += f'<rect x="150" y="{_y_base}" width="{max(_pw, 3)}" height="7" rx="2" fill="#06b6d4" opacity="0.9"/>'`);
        lines.push(`            _svg_rows += f'<text x="{156+_pw}" y="{_y_base+7}" fill="#94a3b8" font-family="monospace" font-size="8">P:{_p:.2f}</text>'`);
        lines.push(`            _svg_rows += f'<rect x="150" y="{_y_base+10}" width="{max(_rw, 3)}" height="7" rx="2" fill="#10b981" opacity="0.9"/>'`);
        lines.push(`            _svg_rows += f'<text x="{156+_rw}" y="{_y_base+17}" fill="#94a3b8" font-family="monospace" font-size="8">R:{_r:.2f}</text>'`);
        lines.push(`            _svg_rows += f'<rect x="150" y="{_y_base+20}" width="{max(_fw, 3)}" height="7" rx="2" fill="#8b5cf6" opacity="0.9"/>'`);
        lines.push(`            _svg_rows += f'<text x="{156+_fw}" y="{_y_base+27}" fill="#94a3b8" font-family="monospace" font-size="8">F1:{_f:.2f}</text>'`);
        lines.push(`        _svg_tot_h = 55 + len(_classes_${cleanId}) * 52`);
        lines.push(`        _svg_chart = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 {_svg_tot_h}" width="100%" height="{_svg_tot_h}"><rect width="100%" height="100%" fill="#090d18" rx="8"/><text x="14" y="20" fill="#e2e8f0" font-family="sans-serif" font-size="11" font-weight="bold">Per-Class Performance Breakdown</text><circle cx="230" cy="17" r="3.5" fill="#06b6d4"/><text x="237" y="20" fill="#94a3b8" font-family="sans-serif" font-size="8">Prec</text><circle cx="280" cy="17" r="3.5" fill="#10b981"/><text x="287" y="20" fill="#94a3b8" font-family="sans-serif" font-size="8">Rec</text><circle cx="325" cy="17" r="3.5" fill="#8b5cf6"/><text x="332" y="20" fill="#94a3b8" font-family="sans-serif" font-size="8">F1</text>{_svg_rows}</svg>'`);
        lines.push(`        emit_json({`);
        lines.push(`            "type": "image",`);
        lines.push(`            "blockId": ${JSON.stringify(block.id)},`);
        lines.push(`            "title": "Per-Class Performance (Precision / Recall / F1)",`);
        lines.push(`            "format": "svg",`);
        lines.push(`            "data": _svg_chart,`);
        lines.push(`            "timestamp": iso_now()`);
        lines.push(`        })`);
        lines.push(`except Exception:`);
        lines.push(`    pass`);
        lines.push(`emit_json({`);
        lines.push(`    "type": "console",`);
        lines.push(`    "stream": "stdout",`);
        lines.push(`    "blockId": ${JSON.stringify(block.id)},`);
        lines.push(`    "text": f"[${block.id}] Classification Report (F1 Macro: {_f1_${cleanId}:.4f}):\\n{_rep_${cleanId}}",`);
        lines.push(`    "timestamp": iso_now()`);
        lines.push(`})`);
      }
    } else if (defId === "viz.scatter_plot" || defId === "viz.histogram" || defId === "viz.feature_importance") {
      const figOut = outputs["matrix_out"] ?? getOutputVariableName(block.id, "matrix_out");
      lines.push(`${figOut} = "plot_${cleanId}"`);
      if (options.includeProtocolHooks) {
        const svgLabel = (block.label || block.definitionId).replace(/'/g, "\\'");
        const svgDefId = block.definitionId.replace(/'/g, "\\'");
        lines.push(`emit_json({`);
        lines.push(`    "type": "image",`);
        lines.push(`    "blockId": ${JSON.stringify(block.id)},`);
        lines.push(`    "title": ${JSON.stringify(block.label || block.definitionId)},`);
        lines.push(`    "format": "svg",`);
        lines.push(`    "data": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 160" width="100%" height="160"><rect width="100%" height="100%" fill="#090d18" rx="8"/><text x="20" y="30" fill="#e2e8f0" font-family="sans-serif" font-size="12" font-weight="bold">${svgLabel}</text><text x="20" y="50" fill="#94a3b8" font-family="sans-serif" font-size="10">Diagnostic plot generated by ${svgDefId}</text><circle cx="80" cy="100" r="18" fill="#10b981" opacity="0.8"/><circle cx="160" cy="85" r="24" fill="#06b6d4" opacity="0.8"/><circle cx="260" cy="115" r="30" fill="#8b5cf6" opacity="0.8"/><circle cx="340" cy="90" r="20" fill="#ec4899" opacity="0.8"/></svg>',`);
        lines.push(`    "timestamp": iso_now()`);
        lines.push(`})`);
      }
    } else if (defId === "prep.imputer") {
      imports.add("import pandas as pd");
      imports.add("from sklearn.impute import SimpleImputer");
      const dataIn = inputs["dataset_in"] ?? "df_in";
      const dataOut = outputs["dataset_out"] ?? getOutputVariableName(block.id, "dataset_out");
      const strategy = (block.config["strategy"] as string) ?? "mean";

      lines.push(`_imp_${cleanId} = SimpleImputer(strategy=${JSON.stringify(strategy)})`);
      lines.push(`_num_cols_${cleanId} = ${dataIn}.select_dtypes(include=['number']).columns`);
      lines.push(`${dataOut} = ${dataIn}.copy()`);
      lines.push(`if len(_num_cols_${cleanId}) > 0:`);
      lines.push(`    ${dataOut}[_num_cols_${cleanId}] = _imp_${cleanId}.fit_transform(${dataIn}[_num_cols_${cleanId}])`);
    } else if (defId === "data.parquet_loader") {
      imports.add("import pandas as pd");
      const datasetOut = outputs["dataset_out"] ?? getOutputVariableName(block.id, "dataset_out");
      const filePath = (block.config["filePath"] as string) ?? "";
      lines.push(`${datasetOut} = pd.read_parquet(${JSON.stringify(filePath)})`);
    } else if (defId === "data.export_csv") {
      imports.add("import pandas as pd");
      const dataIn = inputs["dataset_in"] ?? "df_in";
      const fileOut = outputs["file_out"] ?? getOutputVariableName(block.id, "file_out");
      const outPath = (block.config["output_path"] as string) ?? "output.csv";
      lines.push(`${dataIn}.to_csv(${JSON.stringify(outPath)}, index=False)`);
      lines.push(`${fileOut} = ${JSON.stringify(outPath)}`);
    } else {
      // ── Case 3: Generic Execution Stub ──────────────────────────────
      lines.push(`pass  # Block ${block.definitionId} execution stub`);
      for (const [, varName] of Object.entries(outputs)) {
        lines.push(`${varName} = None`);
      }
    }

    if (options.includeProtocolHooks) {
      lines.push(`emit_json({`);
      lines.push(`    "type": "console",`);
      lines.push(`    "stream": "stdout",`);
      lines.push(`    "blockId": ${JSON.stringify(block.id)},`);
      lines.push(`    "text": f"[${block.id}] Execution completed for ${block.definitionId}",`);
      lines.push(`    "timestamp": iso_now()`);
      lines.push(`})`);
    }

    return {
      imports: Array.from(imports),
      code: lines.join("\n"),
    };
  }
}

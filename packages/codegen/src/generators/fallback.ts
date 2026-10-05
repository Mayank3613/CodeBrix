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
      lines.push(`${modelOut} = LogisticRegression(C=${cVal}, max_iter=${maxIter}, solver=${JSON.stringify(solver)})`);
      lines.push(`${modelOut}.fit(_X_${cleanId}, _y_${cleanId})`);
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
      lines.push(`${modelOut} = DecisionTreeClassifier(criterion=${JSON.stringify(criterion)}, max_depth=${maxDepth ? maxDepth : "None"})`);
      lines.push(`${modelOut}.fit(_X_${cleanId}, _y_${cleanId})`);
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
      lines.push(`_num_cols_${cleanId} = ${dataIn}.select_dtypes(include=['number']).columns`);
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
      lines.push(`_num_cols_${cleanId} = ${dataIn}.select_dtypes(include=['number']).columns`);
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
      lines.push(`${modelOut} = KNeighborsClassifier(n_neighbors=min(${nNeigh}, len(_X_${cleanId})))`);
      lines.push(`${modelOut}.fit(_X_${cleanId}, _y_${cleanId})`);
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
      lines.push(`${modelOut} = SVC(kernel=${JSON.stringify(kernel)}, C=${cVal}, probability=True)`);
      lines.push(`${modelOut}.fit(_X_${cleanId}, _y_${cleanId})`);
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
      lines.push(`${modelOut} = GradientBoostingClassifier(n_estimators=${nEst}, learning_rate=${lr}, max_depth=${maxDepth}, random_state=42)`);
      lines.push(`${modelOut}.fit(_X_${cleanId}, _y_${cleanId})`);
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
      lines.push(`_num_cols_${cleanId} = ${dataIn}.select_dtypes(include=['number']).columns`);
      lines.push(`if len(_num_cols_${cleanId}) > 0:`);
      lines.push(`    ${dataOut}[_num_cols_${cleanId}] = _scaler_${cleanId}.fit_transform(${dataIn}[_num_cols_${cleanId}])`);
    } else if (defId === "prep.encoder" || defId === "data.encoder") {
      imports.add("import pandas as pd");
      const dataIn = inputs["dataset_in"] ?? "df_in";
      const dataOut = outputs["dataset_out"] ?? getOutputVariableName(block.id, "dataset_out");

      lines.push(`_cat_cols_${cleanId} = ${dataIn}.select_dtypes(include=['object', 'category', 'string']).columns`);
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

      lines.push(`_f1_${cleanId} = float(f1_score(${yTrue}, [str(p) for p in ${yPred}], average='macro'))`);
      lines.push(`${scoreOut} = _f1_${cleanId}`);
      if (options.includeProtocolHooks) {
        lines.push(`emit_json({`);
        lines.push(`    "type": "metrics",`);
        lines.push(`    "title": "Classification Report",`);
        lines.push(`    "metrics": { "f1_macro": _f1_${cleanId} },`);
        lines.push(`    "timestamp": iso_now()`);
        lines.push(`})`);
      }
    } else if (defId === "viz.scatter_plot" || defId === "viz.histogram" || defId === "viz.feature_importance") {
      const figOut = outputs["matrix_out"] ?? getOutputVariableName(block.id, "matrix_out");
      lines.push(`${figOut} = "plot_${cleanId}"`);
      if (options.includeProtocolHooks) {
        lines.push(`emit_json({`);
        lines.push(`    "type": "image",`);
        lines.push(`    "title": ${JSON.stringify(block.label || block.definitionId)},`);
        lines.push(`    "format": "svg",`);
        lines.push(`    "data": f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 160" width="100%" height="160"><rect width="100%" height="100%" fill="#090d18" rx="8"/><text x="20" y="30" fill="#e2e8f0" font-family="sans-serif" font-size="12" font-weight="bold">{block.label}</text><text x="20" y="50" fill="#94a3b8" font-family="sans-serif" font-size="10">Diagnostic plot generated by {block.definitionId}</text><circle cx="80" cy="100" r="18" fill="#10b981" opacity="0.8"/><circle cx="160" cy="85" r="24" fill="#06b6d4" opacity="0.8"/><circle cx="260" cy="115" r="30" fill="#8b5cf6" opacity="0.8"/><circle cx="340" cy="90" r="20" fill="#ec4899" opacity="0.8"/></svg>',`);
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
      for (const [portId, varName] of Object.entries(outputs)) {
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

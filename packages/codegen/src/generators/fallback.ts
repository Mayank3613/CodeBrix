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
    } else if (defId === "ml.kmeans") {
      imports.add("import pandas as pd");
      imports.add("from sklearn.cluster import KMeans");
      const dataIn = inputs["train_data_in"] ?? inputs["data_in"] ?? "data_df";
      const modelOut = outputs["model_out"] ?? getOutputVariableName(block.id, "model_out");
      const predOut = outputs["predictions_out"] ?? getOutputVariableName(block.id, "predictions_out");
      const nClusters = (block.config["n_clusters"] as number) ?? 3;

      lines.push(`${modelOut} = KMeans(n_clusters=${nClusters}, random_state=42)`);
      lines.push(`${predOut} = pd.Series(${modelOut}.fit_predict(${dataIn}), name="cluster")`);
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

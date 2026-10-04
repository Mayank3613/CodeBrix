import type { BlockCodeGenerator, BlockCodeContext, BlockCodeResult } from "../types.js";
import { getOutputVariableName } from "../variable-resolver.js";

export class PredictGenerator implements BlockCodeGenerator {
  readonly definitionId = "ml.predict";

  generate(context: BlockCodeContext): BlockCodeResult {
    const { block, inputs, outputs, options } = context;
    const modelIn = inputs["model_in"] ?? "model";
    const testDataIn = inputs["test_data_in"] ?? "X_test";
    const predictionsOut = outputs["predictions_out"] ?? getOutputVariableName(block.id, "predictions_out");

    const cleanId = block.id.replace(/[^a-zA-Z0-9_]/g, "_");
    const lines: string[] = [];

    if (options.includeComments) {
      lines.push(`# Block: ${block.label ?? "Predict"} (${block.id})`);
    }

    lines.push(`_test_in_${cleanId} = ${testDataIn}.copy()`);
    lines.push(`_cat_cols_${cleanId} = _test_in_${cleanId}.select_dtypes(include=['object', 'category', 'string']).columns`);
    lines.push(`if len(_cat_cols_${cleanId}) > 0:`);
    lines.push(`    _test_in_${cleanId} = pd.get_dummies(_test_in_${cleanId}, columns=_cat_cols_${cleanId}, drop_first=True, dtype=float)`);
    lines.push(`_test_in_${cleanId} = _test_in_${cleanId}.fillna(0)`);
    lines.push(`if hasattr(${modelIn}, 'feature_names_in_'):`);
    lines.push(`    _test_in_${cleanId} = _test_in_${cleanId}.reindex(columns=${modelIn}.feature_names_in_, fill_value=0)`);
    lines.push(`${predictionsOut} = ${modelIn}.predict(_test_in_${cleanId})`);

    if (options.includeProtocolHooks) {
      lines.push(`emit_json({`);
      lines.push(`    "type": "console",`);
      lines.push(`    "stream": "stdout",`);
      lines.push(`    "text": f"[${block.id}] Predict: generated {len(${predictionsOut})} predictions",`);
      lines.push(`    "timestamp": iso_now()`);
      lines.push(`})`);
    }

    return {
      imports: ["import pandas as pd"],
      code: lines.join("\n"),
    };
  }
}

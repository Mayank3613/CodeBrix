import type { BlockCodeGenerator, BlockCodeContext, BlockCodeResult } from "../types.js";
import { getOutputVariableName } from "../variable-resolver.js";

export class PredictGenerator implements BlockCodeGenerator {
  readonly definitionId = "ml.predict";

  generate(context: BlockCodeContext): BlockCodeResult {
    const { block, inputs, outputs, options } = context;
    const modelIn = inputs["model_in"] ?? "model";
    const testDataIn = inputs["test_data_in"] ?? "X_test";
    const predictionsOut = outputs["predictions_out"] ?? getOutputVariableName(block.id, "predictions_out");

    const lines: string[] = [];

    if (options.includeComments) {
      lines.push(`# Block: ${block.label ?? "Predict"} (${block.id})`);
    }

    lines.push(`${predictionsOut} = ${modelIn}.predict(${testDataIn})`);

    if (options.includeProtocolHooks) {
      lines.push(`emit_json({`);
      lines.push(`    "type": "console",`);
      lines.push(`    "stream": "stdout",`);
      lines.push(`    "text": f"[${block.id}] Predict: generated {len(${predictionsOut})} predictions",`);
      lines.push(`    "timestamp": iso_now()`);
      lines.push(`})`);
    }

    return {
      imports: [],
      code: lines.join("\n"),
    };
  }
}

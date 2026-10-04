import type { BlockCodeGenerator, BlockCodeContext, BlockCodeResult } from "../types.js";
import { getOutputVariableName } from "../variable-resolver.js";

export class AccuracyGenerator implements BlockCodeGenerator {
  readonly definitionId = "eval.accuracy";

  generate(context: BlockCodeContext): BlockCodeResult {
    const { block, inputs, outputs, options } = context;
    const yPred = inputs["predictions_in"] ?? "y_pred";
    const yTrue = inputs["ground_truth_in"] ?? "y_true";
    const scoreOut = outputs["score_out"] ?? getOutputVariableName(block.id, "score_out");

    const lines: string[] = [];

    if (options.includeComments) {
      lines.push(`# Block: ${block.label ?? "Accuracy Score"} (${block.id})`);
    }

    lines.push(`${scoreOut} = float(accuracy_score(${yTrue}, ${yPred}))`);

    if (options.includeProtocolHooks) {
      lines.push(`emit_json({`);
      lines.push(`    "type": "metrics",`);
      lines.push(`    "title": "Model Accuracy",`);
      lines.push(`    "metrics": {`);
      lines.push(`        "accuracy": round(${scoreOut}, 4),`);
      lines.push(`        "accuracy_pct": f"{round(${scoreOut} * 100, 2)}%"`);
      lines.push(`    },`);
      lines.push(`    "timestamp": iso_now()`);
      lines.push(`})`);
      lines.push(`emit_json({`);
      lines.push(`    "type": "console",`);
      lines.push(`    "stream": "stdout",`);
      lines.push(`    "text": f"[{block.id}] Model Accuracy: {${scoreOut}:.4f} ({${scoreOut} * 100:.2f}%)",`);
      lines.push(`    "timestamp": iso_now()`);
      lines.push(`})`);
    }

    return {
      imports: ["from sklearn.metrics import accuracy_score"],
      code: lines.join("\n"),
    };
  }
}

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

    const cleanId = block.id.replace(/[^a-zA-Z0-9_]/g, "_");
    lines.push(`correct_count_${cleanId} = int(sum(1 for _t, _p in zip(${yTrue}, ${yPred}) if _t == _p))`);
    lines.push(`incorrect_count_${cleanId} = int(len(${yTrue}) - correct_count_${cleanId})`);
    lines.push(`${scoreOut} = float(accuracy_score(${yTrue}, ${yPred}))`);

    if (options.includeProtocolHooks) {
      lines.push(`emit_json({`);
      lines.push(`    "type": "metrics",`);
      lines.push(`    "title": "Model Accuracy",`);
      lines.push(`    "metrics": {`);
      lines.push(`        "accuracy": round(${scoreOut}, 4),`);
      lines.push(`        "accuracy_pct": f"{round(${scoreOut} * 100, 2)}%",`);
      lines.push(`        "correct_predictions": correct_count_${cleanId},`);
      lines.push(`        "incorrect_predictions": incorrect_count_${cleanId},`);
      lines.push(`        "test_samples": int(len(${yTrue}))`);
      lines.push(`    },`);
      lines.push(`    "timestamp": iso_now()`);
      lines.push(`})`);
      lines.push(`emit_json({`);
      lines.push(`    "type": "console",`);
      lines.push(`    "stream": "stdout",`);
      lines.push(`    "text": f"[${block.id}] Model Accuracy: {${scoreOut}:.4f} ({${scoreOut} * 100:.2f}%) — {correct_count_${cleanId}}/{len(${yTrue})} correct ({incorrect_count_${cleanId}} errors)",`);
      lines.push(`    "timestamp": iso_now()`);
      lines.push(`})`);
    }

    return {
      imports: ["from sklearn.metrics import accuracy_score"],
      code: lines.join("\n"),
    };
  }
}

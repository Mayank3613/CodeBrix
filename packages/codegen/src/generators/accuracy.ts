import type { BlockCodeGenerator, BlockCodeContext, BlockCodeResult } from "../types.js";
import { getOutputVariableName } from "../variable-resolver.js";

export class AccuracyGenerator implements BlockCodeGenerator {
  readonly definitionId = "eval.accuracy";

  generate(context: BlockCodeContext): BlockCodeResult {
    const { block, inputs, outputs, options } = context;
    const yPred = inputs["predictions_in"] ?? "y_pred";
    const yTrue = inputs["ground_truth_in"] ?? "y_true";
    const scoreOut = outputs["score_out"] ?? getOutputVariableName(block.id, "score_out");

    const cleanId = block.id.replace(/[^a-zA-Z0-9_]/g, "_");
    const lines: string[] = [];

    if (options.includeComments) {
      lines.push(`# Block: ${block.label ?? "Accuracy Score"} (${block.id})`);
    }

    lines.push(`_metric_title_${cleanId} = "Model Accuracy"`);
    lines.push(`_metric_key_${cleanId} = "accuracy"`);
    lines.push(`correct_count_${cleanId} = int(sum(1 for _t, _p in zip(${yTrue}, ${yPred}) if str(_t) == str(_p)))`);
    lines.push(`incorrect_count_${cleanId} = int(len(${yTrue}) - correct_count_${cleanId})`);
    lines.push(`try:`);
    lines.push(`    ${scoreOut} = float(accuracy_score(${yTrue}.astype(str), [str(p) for p in ${yPred}]))`);
    lines.push(`    _disp_score_${cleanId} = f"{${scoreOut}:.4f} ({${scoreOut} * 100:.2f}%)"`);
    lines.push(`except Exception:`);
    lines.push(`    try:`);
    lines.push(`        from sklearn.metrics import r2_score`);
    lines.push(`        ${scoreOut} = float(r2_score(${yTrue}, ${yPred}))`);
    lines.push(`        _metric_title_${cleanId} = "R² Score (Regression)"`);
    lines.push(`        _metric_key_${cleanId} = "r2_score"`);
    lines.push(`        _disp_score_${cleanId} = f"{${scoreOut}:.4f}"`);
    lines.push(`    except Exception:`);
    lines.push(`        import numpy as np`);
    lines.push(`        ${scoreOut} = float(np.mean(np.array(${yTrue}) == np.array(${yPred})))`);
    lines.push(`        _metric_title_${cleanId} = "Match Accuracy"`);
    lines.push(`        _metric_key_${cleanId} = "accuracy"`);
    lines.push(`        _disp_score_${cleanId} = f"{${scoreOut}:.4f} ({${scoreOut} * 100:.2f}%)"`);

    if (options.includeProtocolHooks) {
      lines.push(`emit_json({`);
      lines.push(`    "type": "metrics",`);
      lines.push(`    "title": _metric_title_${cleanId},`);
      lines.push(`    "metrics": {`);
      lines.push(`        _metric_key_${cleanId}: round(${scoreOut}, 4),`);
      lines.push(`        "score": _disp_score_${cleanId},`);
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
      lines.push(`    "text": f"[${block.id}] {_metric_title_${cleanId}}: {_disp_score_${cleanId}} — {correct_count_${cleanId}}/{len(${yTrue})} correct ({incorrect_count_${cleanId}} errors)",`);
      lines.push(`    "timestamp": iso_now()`);
      lines.push(`})`);
    }

    return {
      imports: ["from sklearn.metrics import accuracy_score", "import numpy as np"],
      code: lines.join("\n"),
    };
  }
}

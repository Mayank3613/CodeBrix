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
      lines.push(`        "score": _disp_score_${cleanId}`);
      lines.push(`    },`);
      lines.push(`    "timestamp": iso_now()`);
      lines.push(`})`);
      lines.push(`emit_json({`);
      lines.push(`    "type": "console",`);
      lines.push(`    "stream": "stdout",`);
      lines.push(`    "text": f"[${block.id}] {_metric_title_${cleanId}}: {_disp_score_${cleanId}}",`);
      lines.push(`    "timestamp": iso_now()`);
      lines.push(`})`);
    }

    return {
      imports: ["from sklearn.metrics import accuracy_score", "import numpy as np"],
      code: lines.join("\n"),
    };
  }
}

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
      lines.push(`    "blockId": ${JSON.stringify(block.id)},`);
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
      lines.push(`try:`);
      lines.push(`    _tot_${cleanId} = max(1, correct_count_${cleanId} + incorrect_count_${cleanId})`);
      lines.push(`    _bar_w = int((correct_count_${cleanId} / _tot_${cleanId}) * 280)`);
      lines.push(`    _err_w = max(0, 280 - _bar_w)`);
      lines.push(`    _pct_val = float(round(${scoreOut} * 100, 1))`);
      lines.push(`    _svg_acc = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 100" width="100%" height="100"><rect width="100%" height="100%" fill="#090d18" rx="8"/><text x="16" y="24" fill="#e2e8f0" font-family="sans-serif" font-size="11" font-weight="bold">{_metric_title_${cleanId}}: {_pct_val}%</text><text x="364" y="24" fill="#94a3b8" font-family="monospace" font-size="10" text-anchor="end">{correct_count_${cleanId}}/{_tot_${cleanId}} Correct</text><rect x="16" y="36" width="{_bar_w}" height="18" rx="4" fill="#10b981" opacity="0.9"/><rect x="{16+_bar_w}" y="36" width="{_err_w}" height="18" rx="4" fill="#f43f5e" opacity="0.85"/><circle cx="22" cy="74" r="4" fill="#10b981"/><text x="32" y="77" fill="#94a3b8" font-family="sans-serif" font-size="9">Correct: {correct_count_${cleanId}} ({_pct_val}%)</text><circle cx="160" cy="74" r="4" fill="#f43f5e"/><text x="170" y="77" fill="#94a3b8" font-family="sans-serif" font-size="9">Errors: {incorrect_count_${cleanId}}</text></svg>'`);
      lines.push(`    emit_json({`);
      lines.push(`        "type": "image",`);
      lines.push(`        "blockId": ${JSON.stringify(block.id)},`);
      lines.push(`        "title": f"{_metric_title_${cleanId}} Breakdown",`);
      lines.push(`        "format": "svg",`);
      lines.push(`        "data": _svg_acc,`);
      lines.push(`        "timestamp": iso_now()`);
      lines.push(`    })`);
      lines.push(`except Exception:`);
      lines.push(`    pass`);
      lines.push(`emit_json({`);
      lines.push(`    "type": "console",`);
      lines.push(`    "stream": "stdout",`);
      lines.push(`    "blockId": ${JSON.stringify(block.id)},`);
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

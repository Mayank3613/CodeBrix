import type { BlockCodeGenerator, BlockCodeContext, BlockCodeResult } from "../types.js";
import { getOutputVariableName } from "../variable-resolver.js";

export class ConfusionMatrixGenerator implements BlockCodeGenerator {
  readonly definitionId = "eval.confusion_matrix";

  generate(context: BlockCodeContext): BlockCodeResult {
    const { block, inputs, outputs, options } = context;
    const yPred = inputs["predictions_in"] ?? "y_pred";
    const yTrue = inputs["ground_truth_in"] ?? "y_true";
    const figureOut = outputs["figure_out"] ?? getOutputVariableName(block.id, "figure_out");

    const cleanId = block.id.replace(/[^a-zA-Z0-9_]/g, "_");
    const lines: string[] = [];

    if (options.includeComments) {
      lines.push(`# Block: ${block.label ?? "Confusion Matrix"} (${block.id})`);
    }

    lines.push(`try:`);
    lines.push(`    cm_${cleanId} = confusion_matrix(${yTrue}.astype(str), [str(p) for p in ${yPred}])`);
    lines.push(`except Exception:`);
    lines.push(`    try:`);
    lines.push(`        _yt_b = pd.qcut(${yTrue}, q=min(3, len(set(${yTrue}))), duplicates='drop').astype(str)`);
    lines.push(`        _yp_b = pd.qcut(${yPred}, q=min(3, len(set(${yPred}))), duplicates='drop').astype(str)`);
    lines.push(`        cm_${cleanId} = confusion_matrix(_yt_b, _yp_b)`);
    lines.push(`    except Exception:`);
    lines.push(`        cm_${cleanId} = np.array([[0]])`);
    lines.push(`${figureOut} = cm_${cleanId}.tolist()`);

    if (options.includeProtocolHooks) {
      lines.push(`emit_json({`);
      lines.push(`    "type": "metrics",`);
      lines.push(`    "title": "Confusion Matrix",`);
      lines.push(`    "metrics": {`);
      lines.push(`        "matrix": ${figureOut}`);
      lines.push(`    },`);
      lines.push(`    "timestamp": iso_now()`);
      lines.push(`})`);
      lines.push(`emit_json({`);
      lines.push(`    "type": "image",`);
      lines.push(`    "title": "Confusion Matrix Heatmap",`);
      lines.push(`    "format": "confusion_matrix",`);
      lines.push(`    "data": json.dumps(${figureOut}),`);
      lines.push(`    "timestamp": iso_now()`);
      lines.push(`})`);
      lines.push(`emit_json({`);
      lines.push(`    "type": "console",`);
      lines.push(`    "stream": "stdout",`);
      lines.push(`    "text": f"[${block.id}] Confusion Matrix generated:\\n{cm_${cleanId}}",`);
      lines.push(`    "timestamp": iso_now()`);
      lines.push(`})`);
    }

    return {
      imports: [
        "from sklearn.metrics import confusion_matrix",
        "import numpy as np",
        "import pandas as pd",
      ],
      code: lines.join("\n"),
    };
  }
}

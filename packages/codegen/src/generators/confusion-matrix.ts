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

    lines.push(`cm_${cleanId} = confusion_matrix(${yTrue}, ${yPred})`);
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
      lines.push(`    "type": "console",`);
      lines.push(`    "stream": "stdout",`);
      lines.push(`    "text": f"[{block.id}] Confusion Matrix generated:\\n{cm_${cleanId}}",`);
      lines.push(`    "timestamp": iso_now()`);
      lines.push(`})`);
    }

    return {
      imports: ["from sklearn.metrics import confusion_matrix"],
      code: lines.join("\n"),
    };
  }
}

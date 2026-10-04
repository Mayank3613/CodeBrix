import type { BlockCodeGenerator, BlockCodeContext, BlockCodeResult } from "../types.js";

export class FallbackBlockGenerator implements BlockCodeGenerator {
  readonly definitionId = "*";

  generate(context: BlockCodeContext): BlockCodeResult {
    const { block, options } = context;
    const lines: string[] = [];

    if (options.includeComments) {
      lines.push(`# Block: ${block.label ?? block.definitionId} (${block.id}) - Generic Stub`);
    }

    lines.push(`pass  # Block ${block.definitionId} execution stub`);

    if (options.includeProtocolHooks) {
      lines.push(`emit_json({`);
      lines.push(`    "type": "console",`);
      lines.push(`    "stream": "stdout",`);
      lines.push(`    "text": f"[${block.id}] Generic execution completed for ${block.definitionId}",`);
      lines.push(`    "timestamp": iso_now()`);
      lines.push(`})`);
    }

    return {
      imports: [],
      code: lines.join("\n"),
    };
  }
}

import type { WorkflowGraph, ExecutionPlan } from "@codebrix/types";
import type {
  CodegenOptions,
  GeneratedScript,
  BlockCodeContext,
} from "./types.js";
import { VariableResolver } from "./variable-resolver.js";
import { BlockGeneratorRegistry } from "./generators/index.js";

/**
 * Default code generation options.
 */
const DEFAULT_OPTIONS: Required<CodegenOptions> = {
  includeProtocolHooks: true,
  includeComments: true,
  targetPythonVersion: "3.11",
  indentSpaces: 4,
};

/**
 * PythonCodeGenerator: Translates a validated WorkflowGraph and ExecutionPlan
 * into a standalone, executable PEP-8 compliant Python script.
 */
export class PythonCodeGenerator {
  private readonly variableResolver: VariableResolver;
  private readonly registry: BlockGeneratorRegistry;

  constructor(
    registry?: BlockGeneratorRegistry,
    variableResolver?: VariableResolver
  ) {
    this.registry = registry ?? new BlockGeneratorRegistry();
    this.variableResolver = variableResolver ?? new VariableResolver();
  }

  /**
   * Generates a complete Python script from a workflow graph and its execution plan.
   *
   * @param graph The workflow graph to generate code for
   * @param plan The execution plan containing topological execution order
   * @param options Custom code generation options
   * @returns GeneratedScript containing the Python code and metadata
   */
  generate(
    graph: WorkflowGraph,
    plan: ExecutionPlan,
    options?: CodegenOptions
  ): GeneratedScript {
    const opts: Required<CodegenOptions> = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    const indent1 = " ".repeat(opts.indentSpaces);
    const indent2 = " ".repeat(opts.indentSpaces * 2);
    const indent3 = " ".repeat(opts.indentSpaces * 3);
    const indent4 = " ".repeat(opts.indentSpaces * 4);

    const allImports = new Set<string>([
      "import sys",
      "import json",
      "import os",
      "import traceback",
      "from datetime import datetime, timezone",
    ]);

    const stepCodeBlocks: string[] = [];

    // Process blocks in topological execution order
    for (let i = 0; i < plan.executionOrder.length; i++) {
      const blockId = plan.executionOrder[i]!;
      const block = graph.blocks[blockId];
      if (!block) continue;

      const { inputs, outputs } = this.variableResolver.resolveForBlock(
        blockId,
        graph
      );

      const generator = this.registry.get(block.definitionId);
      const context: BlockCodeContext = {
        block,
        inputs,
        outputs,
        options: opts,
      };

      const result = generator.generate(context);

      // Collect imports
      for (const imp of result.imports) {
        if (imp.trim()) allImports.add(imp.trim());
      }

      // Indent block body code to level 3 (inside inner try)
      const indentedBlockCode = result.code
        .split("\n")
        .map((line) => (line.length > 0 ? `${indent3}${line}` : ""))
        .join("\n");

      const stepHeader = opts.includeComments
        ? `${indent2}# ${"-".repeat(60)}\n` +
          `${indent2}# Step ${i + 1}: ${block.label ?? block.id} (${block.definitionId})\n` +
          `${indent2}# ${"-".repeat(60)}\n`
        : "";

      let blockStep = `${stepHeader}${indent2}try:\n`;

      if (opts.includeProtocolHooks) {
        blockStep +=
          `${indent3}emit_json({\n` +
          `${indent4}"event": "block_start",\n` +
          `${indent4}"payload": {"blockId": "${block.id}"},\n` +
          `${indent4}"timestamp": iso_now()\n` +
          `${indent3}})\n`;
      }

      blockStep += `${indentedBlockCode}\n`;

      if (opts.includeProtocolHooks) {
        blockStep +=
          `${indent3}emit_json({\n` +
          `${indent4}"event": "block_done",\n` +
          `${indent4}"payload": {"blockId": "${block.id}", "status": "success"},\n` +
          `${indent4}"timestamp": iso_now()\n` +
          `${indent3}})\n`;
      }

      blockStep +=
        `${indent2}except Exception as e:\n` +
        (opts.includeProtocolHooks
          ? `${indent3}emit_json({\n` +
            `${indent4}"event": "block_error",\n` +
            `${indent4}"payload": {\n` +
            `${indent4}    "blockId": "${block.id}",\n` +
            `${indent4}    "error": str(e),\n` +
            `${indent4}    "traceback": traceback.format_exc()\n` +
            `${indent4}},\n` +
            `${indent4}"timestamp": iso_now()\n` +
            `${indent3}})\n`
          : "") +
        `${indent3}raise\n`;

      stepCodeBlocks.push(blockStep);
    }

    // Separate imports into stdlib and 3rd party
    const stdLibImports: string[] = [];
    const thirdPartyImports: string[] = [];

    for (const imp of Array.from(allImports).sort()) {
      if (
        imp.includes("sys") ||
        imp.includes("json") ||
        imp.includes("os") ||
        imp.includes("traceback") ||
        imp.includes("datetime")
      ) {
        stdLibImports.push(imp);
      } else {
        thirdPartyImports.push(imp);
      }
    }

    const importsSection = [
      ...stdLibImports,
      ...(thirdPartyImports.length > 0 ? ["", ...thirdPartyImports] : []),
    ].join("\n");

    const nowIso = new Date().toISOString();

    const scriptParts: string[] = [
      `"""`,
      `Auto-generated by CodeBrix Python Code Generator`,
      `Workflow: ${graph.name} (${graph.id})`,
      `Generated at: ${nowIso}`,
      `Total steps: ${plan.executionOrder.length}`,
      `"""`,
      "",
      importsSection,
      "",
      "# " + "=".repeat(70),
      "# CodeBrix Runtime Helpers",
      "# " + "=".repeat(70),
      "def iso_now() -> str:",
      '    return datetime.now(timezone.utc).isoformat()',
      "",
      "def emit_json(obj: dict):",
      '    print(json.dumps(obj), flush=True)',
      "",
      "# " + "=".repeat(70),
      "# Pipeline Execution Flow",
      "# " + "=".repeat(70),
      "def main():",
      opts.includeProtocolHooks
        ? `${indent1}emit_json({\n` +
          `${indent2}"event": "status",\n` +
          `${indent2}"payload": "running",\n` +
          `${indent2}"timestamp": iso_now()\n` +
          `${indent1}})`
        : `${indent1}pass`,
      "",
      `${indent1}try:`,
      stepCodeBlocks.join("\n"),
      opts.includeProtocolHooks
        ? `${indent2}emit_json({\n` +
          `${indent3}"event": "done",\n` +
          `${indent3}"payload": {"exitCode": 0, "status": "success"},\n` +
          `${indent3}"timestamp": iso_now()\n` +
          `${indent2}})`
        : "",
      `${indent1}except Exception as e:`,
      opts.includeProtocolHooks
        ? `${indent2}emit_json({\n` +
          `${indent3}"event": "error",\n` +
          `${indent3}"payload": {\n` +
          `${indent4}"message": str(e),\n` +
          `${indent4}"traceback": traceback.format_exc()\n` +
          `${indent3}},\n` +
          `${indent3}"timestamp": iso_now()\n` +
          `${indent2}})\n` +
          `${indent2}emit_json({\n` +
          `${indent3}"event": "done",\n` +
          `${indent3}"payload": {"exitCode": 1, "status": "failed"},\n` +
          `${indent3}"timestamp": iso_now()\n` +
          `${indent2}})`
        : `${indent2}print(f"Error: {e}", file=sys.stderr)`,
      `${indent2}sys.exit(1)`,
      "",
      'if __name__ == "__main__":',
      "    main()",
      "",
    ];

    const fullCode = scriptParts.join("\n");

    return {
      code: fullCode,
      workflowId: graph.id,
      executionOrder: plan.executionOrder,
      generatedAt: nowIso,
    };
  }
}

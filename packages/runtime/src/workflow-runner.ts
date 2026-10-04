import type { WorkflowGraph, ExecutionResult } from "@codebrix/types";
import {
  BlockDefinitionRegistry,
  GraphValidator,
  getExecutionPlan,
  IRIS_BLOCK_DEFINITIONS,
} from "@codebrix/graph-engine";
import { PythonCodeGenerator, type CodegenOptions } from "@codebrix/codegen";
import { SubprocessPythonRuntime } from "./runtime.js";
import type { ExecuteOptions } from "./types.js";

/**
 * Configuration options for end-to-end workflow execution.
 */
export interface WorkflowRunnerOptions extends Omit<ExecuteOptions, "script" | "workflowId"> {
  /** Optional custom block registry (defaults to Iris block definitions) */
  registry?: BlockDefinitionRegistry;
  /** Custom codegen options */
  codegenOptions?: CodegenOptions;
}

/**
 * High-level runner that coordinates the complete CodeBrix pipeline:
 * 1. Validates the workflow DAG (Phase 1)
 * 2. Generates the topological execution plan (Phase 1)
 * 3. Generates executable Python code (Phase 2)
 * 4. Spawns and monitors the Python execution subprocess (Phase 3)
 */
export class WorkflowRunner {
  private readonly runtime: SubprocessPythonRuntime;
  private readonly codegen: PythonCodeGenerator;

  constructor(searchDir?: string) {
    this.runtime = new SubprocessPythonRuntime(searchDir);
    this.codegen = new PythonCodeGenerator();
  }

  /**
   * Execute a workflow end-to-end with streaming events and lifecycle tracking.
   */
  async runWorkflow(
    workflow: WorkflowGraph,
    options: WorkflowRunnerOptions = {}
  ): Promise<ExecutionResult> {
    // 1. Initialize registry and validate DAG
    const registry = options.registry ?? new BlockDefinitionRegistry();
    if (!options.registry) {
      registry.registerMany(IRIS_BLOCK_DEFINITIONS);
    }

    const validator = new GraphValidator(registry);
    const valResult = validator.validate(workflow);

    if (!valResult.valid) {
      const errorMsg = valResult.errors.map((e) => e.message).join("; ");
      throw new Error(`Workflow validation failed: ${errorMsg}`);
    }

    // 2. Generate topological ExecutionPlan
    const plan = getExecutionPlan(workflow);

    // 3. Generate standalone Python script
    const scriptResult = this.codegen.generate(
      workflow,
      plan,
      options.codegenOptions
    );

    // 4. Execute via SubprocessPythonRuntime
    return this.runtime.execute({
      script: scriptResult.code,
      workflowId: workflow.id,
      cwd: options.cwd,
      timeoutMs: options.timeoutMs,
      env: options.env,
      onOutput: options.onOutput,
      onStatus: options.onStatus,
      onBlockStatus: options.onBlockStatus,
    });
  }

  /**
   * Stop an ongoing execution session.
   */
  async stop(executionId: string): Promise<void> {
    return this.runtime.stop(executionId);
  }
}

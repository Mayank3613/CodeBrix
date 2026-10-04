import type {
  WorkflowGraph,
  ValidationResult,
  ExecutionPlan,
  ExecutionResult,
} from "@codebrix/types";
import {
  BlockDefinitionRegistry,
  GraphValidator,
  getExecutionPlan,
  IRIS_BLOCK_DEFINITIONS,
} from "@codebrix/graph-engine";
import { PythonCodeGenerator } from "@codebrix/codegen";
import { blockRegistry } from "../registry/index.js";
import { runPythonExecution } from "./tauriPythonRuntime.js";
import type { IWorkflowService } from "@codebrix/shared";

/**
 * Production Workflow Service powering CodeBrix desktop studio.
 * Replaces the mock service with real graph validation, DAG cycle detection,
 * topological execution planning, and live Python code generation.
 */
export class EngineWorkflowService implements IWorkflowService {
  private getRegistry(): BlockDefinitionRegistry {
    const reg = new BlockDefinitionRegistry();

    // 1. Register canonical reference definitions (Iris pipeline)
    reg.registerMany(IRIS_BLOCK_DEFINITIONS);

    // 2. Register all definitions currently in the UI catalogue
    try {
      const uiBlocks = blockRegistry.list();
      for (const def of uiBlocks) {
        if (!reg.has(def.id)) {
          reg.register(def);
        }
      }
    } catch {
      // Registry access fallback
    }

    return reg;
  }

  /**
   * Validates the canvas workflow DAG against port contracts, connection invariants,
   * duplicate inputs, and cycle checks.
   */
  async validateGraph(graph: WorkflowGraph): Promise<ValidationResult> {
    const registry = this.getRegistry();
    const validator = new GraphValidator(registry);
    return validator.validate(graph);
  }

  /**
   * Generates a topological execution plan using Kahn's algorithm.
   */
  async getExecutionPlan(graph: WorkflowGraph): Promise<ExecutionPlan> {
    return getExecutionPlan(graph);
  }

  /**
   * Compiles the workflow into a Python script and executes it via the runtime.
   */
  async executeWorkflow(graph: WorkflowGraph): Promise<ExecutionResult> {
    const valResult = await this.validateGraph(graph);
    if (!valResult.valid) {
      throw new Error(
        `Validation failed: ${valResult.errors.map((e) => e.message).join(", ")}`
      );
    }

    const plan = await this.getExecutionPlan(graph);
    const generator = new PythonCodeGenerator();
    const script = generator.generate(graph, plan);

    return runPythonExecution(script.code, graph.id, plan.executionOrder);
  }

  /**
   * Generates standalone PEP-8 Python script without executing it.
   */
  async generatePythonScript(graph: WorkflowGraph): Promise<string> {
    const valResult = await this.validateGraph(graph);
    if (!valResult.valid) {
      throw new Error(
        `Validation failed: ${valResult.errors.map((e) => e.message).join(", ")}`
      );
    }
    const plan = await this.getExecutionPlan(graph);
    const generator = new PythonCodeGenerator();
    const script = generator.generate(graph, plan);
    return script.code;
  }
}

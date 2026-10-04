import type {
  WorkflowGraph,
  ValidationResult,
  ExecutionPlan,
  ExecutionResult,
} from "@codebrix/types";
import type { IWorkflowService } from "@codebrix/shared";
import {
  GraphValidator,
  BlockDefinitionRegistry,
  IRIS_BLOCK_DEFINITIONS,
  getExecutionPlan as graphEngineGetExecutionPlan,
} from "@codebrix/graph-engine";
import { PythonCodeGenerator } from "@codebrix/codegen";
import { blockRegistry } from "../registry";
import { runPythonExecution } from "./tauriPythonRuntime";

/**
 * RealWorkflowService: Concrete integration service backed by @codebrix/graph-engine,
 * @codebrix/codegen, and the real Python runtime process.
 */
export class RealWorkflowService implements IWorkflowService {
  private getRegistry(): BlockDefinitionRegistry {
    const reg = new BlockDefinitionRegistry();
    // Register reference IRIS block definitions
    for (const def of IRIS_BLOCK_DEFINITIONS) {
      reg.register(def);
    }
    // Also include any custom or loaded block definitions from Desktop blockRegistry
    for (const def of blockRegistry.list()) {
      if (!reg.has(def.id)) {
        reg.register(def);
      }
    }
    return reg;
  }

  async validateGraph(graph: WorkflowGraph): Promise<ValidationResult> {
    const validator = new GraphValidator(this.getRegistry());
    return validator.validate(graph);
  }

  async getExecutionPlan(graph: WorkflowGraph): Promise<ExecutionPlan> {
    return graphEngineGetExecutionPlan(graph);
  }

  async executeWorkflow(graph: WorkflowGraph): Promise<ExecutionResult> {
    const plan = await this.getExecutionPlan(graph);
    const codeGen = new PythonCodeGenerator();
    const { code } = codeGen.generate(graph, plan);

    return runPythonExecution(code, graph.id);
  }
}


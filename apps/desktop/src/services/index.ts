/**
 * CodeBrix Workflow Service Provider
 *
 * Phase 4 & 5 Integration:
 * Exports the production EngineWorkflowService backed by @codebrix/graph-engine,
 * @codebrix/codegen, and the Python execution runtime.
 */

import { EngineWorkflowService } from "./engineWorkflowService.js";
import { MockWorkflowService, type IWorkflowService } from "@codebrix/shared";
import { RealWorkflowService } from "./workflowEngineService.js";

// Active workflow service instance
export const workflowService: IWorkflowService = new EngineWorkflowService();

// Re-export interface and classes
export type { IWorkflowService };
export { EngineWorkflowService, RealWorkflowService, MockWorkflowService };
export * from "./tauriPythonRuntime.js";

/**
 * CodeBrix Workflow Service Provider
 *
 * Phase 4 Integration:
 * Exports the real EngineWorkflowService backed by @codebrix/graph-engine,
 * @codebrix/codegen, and the Python execution runtime.
 */

import { EngineWorkflowService } from "./engineWorkflowService.js";
import { MockWorkflowService, type IWorkflowService } from "@codebrix/shared";

// Active workflow service instance
export const workflowService: IWorkflowService = new EngineWorkflowService();

// Re-export interface and classes
export type { IWorkflowService };
export { EngineWorkflowService, MockWorkflowService };
export * from "./tauriPythonRuntime.js";

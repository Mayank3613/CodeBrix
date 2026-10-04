/**
 * CodeBrix Workflow Service Provider
 *
 * Central export seam for Developer 2's Workflow Engine.
 * Exports the RealWorkflowService backed by @codebrix/graph-engine and @codebrix/codegen.
 */

import { MockWorkflowService, type IWorkflowService } from "@codebrix/shared";
import { RealWorkflowService } from "./workflowEngineService";

// Instance of the active workflow service
export const workflowService: IWorkflowService = new RealWorkflowService();

// Re-export interface for components and stores
export type { IWorkflowService };
export { MockWorkflowService, RealWorkflowService };
export * from "./tauriPythonRuntime";

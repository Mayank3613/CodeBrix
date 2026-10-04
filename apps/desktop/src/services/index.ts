/**
 * CodeBrix Workflow Service Provider
 *
 * Central export seam for Developer 2's Workflow Engine.
 * In Phase 0-1, this exports the MockWorkflowService from @codebrix/shared.
 * At Integration 1, switching to the real engine from @codebrix/graph-engine
 * requires updating only this file.
 */

import { MockWorkflowService, type IWorkflowService } from "@codebrix/shared";

// Instance of the active workflow service
export const workflowService: IWorkflowService = new MockWorkflowService();

// Re-export interface for components and stores
export type { IWorkflowService };
export { MockWorkflowService };

/**
 * CodeBrix Frozen Contract Types - Version 0.1.0
 * 
 * Shared between Developer 1 (Data & Workflow) and Developer 2 (ML & Execution).
 * Any changes to this package must follow the contract-PR review process.
 */

export const CONTRACT_VERSION = "0.1.0" as const;

export * from "./ports.js";
export * from "./blocks.js";
export * from "./connections.js";
export * from "./workflow.js";
export * from "./validation.js";
export * from "./execution.js";
export * from "./output.js";

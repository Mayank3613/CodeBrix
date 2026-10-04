/**
 * scripts/validate-iris.ts
 *
 * Developer 2 - Phase 1 Verification Script
 * Validates the Iris classification workflow DAG and prints the execution plan.
 *
 * Run with: npx tsx scripts/validate-iris.ts
 */

import {
  BlockDefinitionRegistry,
  GraphValidator,
  detectCycles,
  getExecutionPlan,
  IRIS_BLOCK_DEFINITIONS,
} from "@codebrix/graph-engine";
import { createIrisWorkflowMock } from "@codebrix/shared";

function runVerification() {
  console.log("\n=======================================================");
  console.log("  CodeBrix ML Engine - Phase 1 Verification");
  console.log("  Graph Engine: Validator, Cycle Detector & Planner");
  console.log("=======================================================\n");

  // 1. Initialize registry
  console.log("[1/5] Initializing Block Definition Registry...");
  const registry = new BlockDefinitionRegistry();
  registry.registerMany(IRIS_BLOCK_DEFINITIONS);
  console.log(`      ✓ Registered ${registry.size} block definitions:`);
  for (const def of registry.getAll()) {
    console.log(`        - [${def.category.toUpperCase()}] ${def.id} ("${def.name}")`);
    console.log(`          Inputs:  ${def.inputs.map((p) => `${p.id}:${p.type}`).join(", ") || "(none)"}`);
    console.log(`          Outputs: ${def.outputs.map((p) => `${p.id}:${p.type}`).join(", ") || "(none)"}`);
  }

  // 2. Load workflow graph
  console.log("\n[2/5] Loading Iris Classification Workflow Graph...");
  const workflow = createIrisWorkflowMock();
  const blockCount = Object.keys(workflow.blocks).length;
  const connCount = workflow.connections.length;
  console.log(`      ✓ Workflow ID: ${workflow.id}`);
  console.log(`      ✓ Name: "${workflow.name}" (version: ${workflow.version})`);
  console.log(`      ✓ Nodes: ${blockCount} blocks`);
  console.log(`      ✓ Edges: ${connCount} connections`);

  // 3. Cycle Detection
  console.log("\n[3/5] Running DFS Cycle Detection...");
  const cycleResult = detectCycles(workflow);
  if (cycleResult.hasCycle) {
    console.error(`      ✗ Cycle detected in graph! Blocks: ${cycleResult.cycleBlockIds.join(" -> ")}`);
    process.exit(1);
  } else {
    console.log("      ✓ Graph is a valid Directed Acyclic Graph (DAG) - 0 cycles found.");
  }

  // 4. DAG Validation
  console.log("\n[4/5] Running Full Graph Validation...");
  const validator = new GraphValidator(registry);
  const result = validator.validate(workflow);

  if (!result.valid) {
    console.error(`      ✗ Validation failed with ${result.errors.length} errors:`);
    for (const err of result.errors) {
      console.error(`        - [${err.code}] ${err.message} (Block: ${err.blockId ?? "N/A"})`);
    }
    process.exit(1);
  }
  console.log("      ✓ Validation PASSED! No topological or port type errors.");

  // 5. Execution Plan
  console.log("\n[5/5] Generating Topological Execution Plan...");
  const plan = getExecutionPlan(workflow);
  console.log(`      ✓ Plan ID: ${plan.planId}`);
  console.log(`      ✓ Created At: ${plan.createdAt}`);
  console.log(`\n  Execution Sequence (${plan.steps.length} steps):`);
  console.log("  --------------------------------------------------");
  
  plan.steps.forEach((step, idx) => {
    const block = workflow.blocks[step.blockId];
    const depsStr = step.dependencies.length > 0 ? step.dependencies.join(", ") : "(none - root node)";
    console.log(`  Step ${idx + 1}: [${step.blockId}] "${block?.label ?? block?.definitionId}"`);
    console.log(`          Definition:   ${block?.definitionId}`);
    console.log(`          Dependencies: ${depsStr}`);
  });

  console.log("  --------------------------------------------------");
  console.log("\n=======================================================");
  console.log("  ✓ PHASE 1 COMPLETE: All graph engine contracts met!");
  console.log("  Ready for Phase 2: Python Code Generator.");
  console.log("=======================================================\n");
}

runVerification();

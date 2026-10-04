/**
 * scripts/generate-iris.ts
 *
 * Developer 2 - Phase 2 Verification Script
 * Compiles the Iris classification acceptance DAG into a standalone Python script.
 *
 * Run with: pnpm run generate:iris
 * (or: npx tsx scripts/generate-iris.ts)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BlockDefinitionRegistry,
  GraphValidator,
  getExecutionPlan,
  IRIS_BLOCK_DEFINITIONS,
} from "@codebrix/graph-engine";
import { createIrisWorkflowMock } from "@codebrix/shared";
import { PythonCodeGenerator } from "@codebrix/codegen";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

function runGenerator() {
  console.log("\n=======================================================");
  console.log("  CodeBrix ML Engine - Phase 2: Python Code Generator");
  console.log("  Compiling Iris Workflow DAG to Standalone Python Script");
  console.log("=======================================================\n");

  // 1. Initialize registry and validate workflow
  console.log("[1/4] Validating Iris Workflow DAG...");
  const registry = new BlockDefinitionRegistry();
  registry.registerMany(IRIS_BLOCK_DEFINITIONS);
  const workflow = createIrisWorkflowMock();

  const validator = new GraphValidator(registry);
  const valResult = validator.validate(workflow);
  if (!valResult.valid) {
    console.error("      ✗ Graph validation failed!");
    process.exit(1);
  }
  console.log("      ✓ Workflow DAG validated successfully.");

  // 2. Generate Execution Plan
  console.log("\n[2/4] Generating Topological Execution Plan...");
  const plan = getExecutionPlan(workflow);
  console.log(`      ✓ Execution plan generated with ${plan.steps.length} sequential steps:`);
  plan.steps.forEach((step, idx) => {
    console.log(`        Step ${idx + 1}: ${step.blockId} (depends on: ${step.dependencies.join(", ") || "none"})`);
  });

  // 3. Compile to Python Code
  console.log("\n[3/4] Compiling to Standalone Python Script...");
  const generator = new PythonCodeGenerator();
  const result = generator.generate(workflow, plan);

  const outDir = path.join(rootDir, "generated");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outFile = path.join(outDir, "iris_pipeline.py");
  fs.writeFileSync(outFile, result.code, "utf-8");
  console.log(`      ✓ Successfully wrote: ${path.relative(rootDir, outFile)} (${result.code.split("\n").length} lines)`);

  // 4. Preview Generated Python Code
  console.log("\n[4/4] Generated Python Script Preview:");
  console.log("----------------------------------------------------------------------");
  const codeLines = result.code.split("\n");
  codeLines.slice(0, 45).forEach((line, i) => {
    const lineNum = String(i + 1).padStart(3, " ");
    console.log(`${lineNum} | ${line}`);
  });
  if (codeLines.length > 45) {
    console.log(`... (${codeLines.length - 45} more lines saved to ${path.relative(rootDir, outFile)})`);
  }
  console.log("----------------------------------------------------------------------");

  console.log("\n=======================================================");
  console.log("  ✓ PHASE 2 COMPLETE: Python script generated!");
  console.log(`  File location: ${outFile}`);
  console.log("  Ready for Phase 3: Python Runtime & Subprocess Execution.");
  console.log("=======================================================\n");
}

runGenerator();

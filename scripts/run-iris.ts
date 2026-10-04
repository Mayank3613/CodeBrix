/**
 * scripts/run-iris.ts
 *
 * Developer 2 - Phase 3 Verification Script
 * Executes the Iris workflow end-to-end via the Python Subprocess Runtime.
 *
 * Run with: pnpm run run:iris
 * (or: npx tsx scripts/run-iris.ts)
 */

import { WorkflowRunner, PythonDetector } from "@codebrix/runtime";
import { createIrisWorkflowMock } from "@codebrix/shared";

async function main() {
  console.log("\n=======================================================");
  console.log("  CodeBrix ML Engine - Phase 3: Subprocess Runtime");
  console.log("  Live End-to-End Execution of Iris Pipeline");
  console.log("=======================================================\n");

  // 1. Detect Python Environment
  console.log("[1/3] Detecting Python Runtime Environment...");
  const detector = new PythonDetector();
  try {
    const env = detector.detect();
    console.log(`      ✓ Found Python: ${env.executable}`);
    console.log(`      ✓ Version:      Python ${env.version} (${env.isVenv ? "virtual environment" : "system candidate"})`);
    console.log(`      ✓ CWD:          ${env.cwd}`);
  } catch (err) {
    console.error(`      ✗ Python environment not found: ${(err as Error).message}`);
    process.exit(1);
  }

  // 2. Setup Workflow & Runner
  console.log("\n[2/3] Initializing Pipeline Runner & Event Listeners...");
  const runner = new WorkflowRunner();
  const workflow = createIrisWorkflowMock();
  console.log(`      ✓ Loaded Workflow: "${workflow.name}" (${Object.keys(workflow.blocks).length} blocks)`);

  console.log("\n[3/3] Executing Workflow in Subprocess with Live Streaming:");
  console.log("----------------------------------------------------------------------");

  const startTime = Date.now();

  try {
    const result = await runner.runWorkflow(workflow, {
      onStatus: (status) => {
        console.log(`  [STATUS] -> ${status.toUpperCase()}`);
      },
      onBlockStatus: (blockId, status) => {
        if (status.status === "running") {
          console.log(`  [BLOCK]  ▶ Started: ${blockId}`);
        } else if (status.status === "success") {
          console.log(`  [BLOCK]  ✔ Succeeded: ${blockId} (${status.durationMs ?? 0}ms)`);
        } else if (status.status === "failed") {
          console.log(`  [BLOCK]  ✖ Failed: ${blockId} - ${status.error}`);
        }
      },
      onOutput: (msg) => {
        if (msg.type === "console") {
          console.log(`    │ ${msg.text}`);
        } else if (msg.type === "metrics") {
          console.log(`    ★ METRICS [${msg.title ?? "Result"}]:`, JSON.stringify(msg.metrics, null, 2).replace(/\n/g, "\n    │ "));
        }
      },
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log("----------------------------------------------------------------------");

    console.log("\n=======================================================");
    console.log(`  ✓ PHASE 3 COMPLETE: Execution ${result.status.toUpperCase()}!`);
    console.log(`  Session ID:    ${result.executionId}`);
    console.log(`  Elapsed Time:  ${elapsed}s (Subprocess duration: ${result.durationMs}ms)`);
    console.log(`  Exit Code:     ${result.exitCode}`);
    console.log(`  Blocks Run:    ${Object.keys(result.blockResults).length}/6 successful`);
    console.log("=======================================================\n");
  } catch (err) {
    console.error("\nExecution failed with error:", err);
    process.exit(1);
  }
}

main();

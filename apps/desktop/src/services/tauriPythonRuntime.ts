import { parsePythonOutputJsonLine } from "@codebrix/shared";
import type {
  ExecutionResult,
  BlockExecutionStatus,
  OutputMessage,
} from "@codebrix/types";
import { useExecutionStore } from "../stores/executionStore.js";

function isTauri(): boolean {
  return typeof window !== "undefined" && Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

interface PythonOutputPayload {
  execution_id: string;
  line: string;
  stream: string;
  timestamp: string;
}

interface PythonStatusPayload {
  execution_id: string;
  status: string;
  timestamp: string;
  message?: string;
}

interface PythonExitPayload {
  execution_id: string;
  exit_code: number;
  success: boolean;
  timestamp: string;
}

/**
 * Executes a standalone or generated Python script.
 * In desktop mode, delegates to Tauri Rust child process runner.
 * In browser dev mode, provides simulated streaming execution.
 */
export async function runPythonExecution(
  script: string,
  workflowId = "workflow-1",
  blockIds?: string[]
): Promise<ExecutionResult> {
  const store = useExecutionStore.getState();
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const startedAt = new Date().toISOString();

  store.resetExecution();
  store.setExecutionId(executionId);
  store.setRunState("running");
  store.setStatusMessage("Initializing Python environment...");

  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    const { listen } = await import("@tauri-apps/api/event");

    return new Promise<ExecutionResult>((resolve) => {
      const outputsAccumulator: OutputMessage[] = [];
      const blockResults: Record<string, BlockExecutionStatus> = {};
      const unlisteners: Array<() => void> = [];

      const cleanup = () => {
        unlisteners.forEach((unlisten) => unlisten());
      };

      listen<PythonOutputPayload>("python-output", (event) => {
        if (event.payload.execution_id !== executionId) return;

        const line = event.payload.line.trim();

        // 1. Intercept protocol control events
        if (line.startsWith("{") && line.endsWith("}")) {
          try {
            const json = JSON.parse(line);
            if (json.event === "block_start") {
              const bId = json.payload?.blockId;
              if (bId) {
                useExecutionStore.getState().setBlockStatus(bId, "running");
                useExecutionStore.getState().setActiveBlockId(bId);
                useExecutionStore.getState().setStatusMessage(`Running block ${bId}...`);
                blockResults[bId] = {
                  blockId: bId,
                  status: "running",
                  startedAt: json.timestamp || new Date().toISOString(),
                };
              }
              return;
            }
            if (json.event === "block_done") {
              const bId = json.payload?.blockId;
              if (bId) {
                useExecutionStore.getState().setBlockStatus(bId, "success");
                if (useExecutionStore.getState().activeBlockId === bId) {
                  useExecutionStore.getState().setActiveBlockId(null);
                }
                if (blockResults[bId]) {
                  blockResults[bId].status = "success";
                  blockResults[bId].completedAt = json.timestamp || new Date().toISOString();
                }
              }
              return;
            }
            if (json.event === "block_error") {
              const bId = json.payload?.blockId;
              if (bId) {
                useExecutionStore.getState().setBlockStatus(bId, "failed");
                if (useExecutionStore.getState().activeBlockId === bId) {
                  useExecutionStore.getState().setActiveBlockId(null);
                }
                if (blockResults[bId]) {
                  blockResults[bId].status = "failed";
                  blockResults[bId].error = json.payload?.error;
                }
              }
              return;
            }
            if (json.event === "status") {
              if (typeof json.payload === "string") {
                useExecutionStore.getState().setStatusMessage(`Status: ${json.payload}`);
              }
              return;
            }
          } catch {
            // Not JSON or parse error, fall through to output parsing
          }
        }

        // 2. Structured output messages (console, metrics, table, etc.)
        const parsed = parsePythonOutputJsonLine(event.payload.line);
        if (parsed) {
          outputsAccumulator.push(parsed);
          useExecutionStore.getState().addOutput(parsed);
        } else if (line) {
          const fallback: OutputMessage = {
            type: "console",
            stream: event.payload.stream === "stderr" ? "stderr" : "stdout",
            text: event.payload.line,
            timestamp: event.payload.timestamp || new Date().toISOString(),
          };
          outputsAccumulator.push(fallback);
          useExecutionStore.getState().addOutput(fallback);
        }
      }).then((un) => unlisteners.push(un));

      listen<PythonStatusPayload>("python-status", (event) => {
        if (event.payload.execution_id !== executionId) return;
        if (event.payload.message) {
          useExecutionStore.getState().setStatusMessage(event.payload.message);
        }
      }).then((un) => unlisteners.push(un));

      listen<PythonExitPayload>("python-exit", (event) => {
        if (event.payload.execution_id !== executionId) return;
        cleanup();

        const endedAt = new Date().toISOString();
        const durationMs =
          new Date(endedAt).getTime() - new Date(startedAt).getTime();
        const success = event.payload.success;

        const result: ExecutionResult = {
          executionId,
          workflowId,
          status: success ? "success" : "failed",
          startedAt,
          completedAt: endedAt,
          durationMs,
          exitCode: event.payload.exit_code,
          blockResults,
          outputs: outputsAccumulator,
          error: success
            ? undefined
            : { message: `Process terminated with exit code ${event.payload.exit_code}` },
        };

        useExecutionStore.getState().setRunState(success ? "success" : "failed");
        useExecutionStore.getState().setStatusMessage(
          success
            ? "Pipeline executed successfully."
            : `Pipeline execution failed with exit code ${event.payload.exit_code}`
        );
        useExecutionStore.getState().setLatestResult(result);
        resolve(result);
      }).then((un) => unlisteners.push(un));

      // Invoke Tauri Rust backend
      invoke<void>("run_python_script", {
        script,
        executionId,
      }).catch((err) => {
        cleanup();
        const errMsg = String(err);
        const failOutput: OutputMessage = {
          type: "error",
          message: `[Process Launch Error] ${errMsg}`,
          timestamp: new Date().toISOString(),
        };
        useExecutionStore.getState().addOutput(failOutput);
        useExecutionStore.getState().setRunState("failed");

        const failResult: ExecutionResult = {
          executionId,
          workflowId,
          status: "failed",
          startedAt,
          completedAt: new Date().toISOString(),
          durationMs: 0,
          exitCode: 1,
          blockResults: {},
          outputs: [failOutput],
          error: { message: errMsg },
        };
        useExecutionStore.getState().setLatestResult(failResult);
        resolve(failResult);
      });
    });
  }

  // Browser simulated fallback runner
  return new Promise<ExecutionResult>((resolve) => {
    const outputsAccumulator: OutputMessage[] = [];
    const blockResults: Record<string, BlockExecutionStatus> = {};

    const append = (msg: OutputMessage) => {
      outputsAccumulator.push(msg);
      useExecutionStore.getState().addOutput(msg);
    };

    const sequence =
      blockIds && blockIds.length > 0
        ? blockIds
        : ["blk-csv", "blk-split", "blk-rf", "blk-predict", "blk-acc", "blk-cm"];

    // Initialize all blocks in sequence as queued
    for (const bid of sequence) {
      store.setBlockStatus(bid, "queued");
    }

    // Stage 1: Load Dataset (200ms)
    setTimeout(() => {
      const b0 = sequence[0];
      if (b0) {
        store.setBlockStatus(b0, "running");
        store.setActiveBlockId(b0);
        blockResults[b0] = {
          blockId: b0,
          status: "running",
          startedAt: new Date().toISOString(),
        };
      }
      store.setStatusMessage("Loading dataset into pandas DataFrame...");
      append({
        type: "console",
        stream: "stdout",
        text: "[data.csv_loader] Loaded dataset from iris.csv: (150 rows, 5 columns)",
        blockId: b0,
        timestamp: new Date().toISOString(),
      });
    }, 200);

    // Stage 2: Train/Test Split (500ms)
    setTimeout(() => {
      const b0 = sequence[0];
      if (b0) {
        store.setBlockStatus(b0, "success");
        if (blockResults[b0]) blockResults[b0].status = "success";
      }
      const b1 = sequence[1];
      if (b1) {
        store.setBlockStatus(b1, "running");
        store.setActiveBlockId(b1);
        blockResults[b1] = {
          blockId: b1,
          status: "running",
          startedAt: new Date().toISOString(),
        };
      }
      store.setStatusMessage("Preprocessing: Train/Test split 80/20...");
      append({
        type: "console",
        stream: "stdout",
        text: "[ml.train_test_split] Split completed: Train (120 rows), Test (30 rows)",
        blockId: b1,
        timestamp: new Date().toISOString(),
      });
    }, 500);

    // Stage 3: Train Random Forest (900ms)
    setTimeout(() => {
      const b1 = sequence[1];
      if (b1) {
        store.setBlockStatus(b1, "success");
        if (blockResults[b1]) blockResults[b1].status = "success";
      }
      const b2 = sequence[2];
      if (b2) {
        store.setBlockStatus(b2, "running");
        store.setActiveBlockId(b2);
        blockResults[b2] = {
          blockId: b2,
          status: "running",
          startedAt: new Date().toISOString(),
        };
      }
      store.setStatusMessage("Training Random Forest Classifier (100 estimators)...");
      append({
        type: "console",
        stream: "stdout",
        text: "[ml.random_forest_classifier] Fitting 100 decision trees... done in 0.12s",
        blockId: b2,
        timestamp: new Date().toISOString(),
      });
    }, 900);

    // Stage 4: Predict on Test Set (1200ms)
    setTimeout(() => {
      const b2 = sequence[2];
      if (b2) {
        store.setBlockStatus(b2, "success");
        if (blockResults[b2]) blockResults[b2].status = "success";
      }
      const b3 = sequence[3];
      if (b3) {
        store.setBlockStatus(b3, "running");
        store.setActiveBlockId(b3);
        blockResults[b3] = {
          blockId: b3,
          status: "running",
          startedAt: new Date().toISOString(),
        };
      }
      store.setStatusMessage("Evaluating model predictions...");
      append({
        type: "console",
        stream: "stdout",
        text: "[ml.predict] Generating predictions on test set... 30 predictions generated",
        blockId: b3,
        timestamp: new Date().toISOString(),
      });
    }, 1200);

    // Stage 5: Evaluation & Metrics (1400ms)
    setTimeout(() => {
      const b3 = sequence[3];
      if (b3) {
        store.setBlockStatus(b3, "success");
        if (blockResults[b3]) blockResults[b3].status = "success";
      }
      const b4 = sequence[4];
      if (b4) {
        store.setBlockStatus(b4, "running");
        store.setActiveBlockId(b4);
        blockResults[b4] = {
          blockId: b4,
          status: "running",
          startedAt: new Date().toISOString(),
        };
      }
      const b5 = sequence[5];
      if (b5) {
        store.setBlockStatus(b5, "running");
        blockResults[b5] = {
          blockId: b5,
          status: "running",
          startedAt: new Date().toISOString(),
        };
      }
      store.setStatusMessage("Computing accuracy score and confusion matrix...");
      append({
        type: "metrics",
        title: "Test Set Accuracy",
        metrics: {
          accuracy: 0.967,
          precision_macro: 0.969,
          recall_macro: 0.967,
          f1_macro: 0.967,
        },
        blockId: b4,
        timestamp: new Date().toISOString(),
      });
    }, 1400);

    // Stage 6: Completion (1600ms)
    setTimeout(() => {
      for (const b of sequence) {
        store.setBlockStatus(b, "success");
        if (blockResults[b]) {
          blockResults[b].status = "success";
          blockResults[b].completedAt = new Date().toISOString();
        }
      }
      store.setActiveBlockId(null);

      append({
        type: "console",
        stream: "stdout",
        text: "Pipeline execution finished successfully with accuracy score: 0.967",
        timestamp: new Date().toISOString(),
      });

      const endedAt = new Date().toISOString();
      const result: ExecutionResult = {
        executionId,
        workflowId,
        status: "success",
        startedAt,
        completedAt: endedAt,
        durationMs: 1600,
        exitCode: 0,
        blockResults,
        outputs: outputsAccumulator,
      };

      store.setRunState("success");
      store.setStatusMessage("Execution completed successfully (0.967 accuracy)");
      store.setLatestResult(result);
      resolve(result);
    }, 1600);
  });
}

/**
 * Stop active Python execution process.
 */
export async function stopPythonExecution(): Promise<void> {
  const store = useExecutionStore.getState();
  const eid = store.executionId;
  if (!eid) return;

  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke<void>("stop_python_script", { executionId: eid });
    } catch (err) {
      console.warn("Error calling stop_python_script:", err);
    }
  }

  store.setRunState("failed");
  store.setStatusMessage("Execution aborted by user");
  store.addOutput({
    type: "error",
    message: "[Process Aborted] Execution process stopped by user.",
    timestamp: new Date().toISOString(),
  });
}

import { parsePythonOutputJsonLine } from "@codebrix/shared";
import type {
  ExecutionResult,
  OutputMessage,
} from "@codebrix/types";
import { useExecutionStore } from "../stores/executionStore";

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
  workflowId = "workflow-1"
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
      const unlisteners: Array<() => void> = [];

      const cleanup = () => {
        unlisteners.forEach((unlisten) => unlisten());
      };

      listen<PythonOutputPayload>("python-output", (event) => {
        if (event.payload.execution_id !== executionId) return;

        const parsed = parsePythonOutputJsonLine(event.payload.line);
        if (parsed) {
          outputsAccumulator.push(parsed);
          useExecutionStore.getState().addOutput(parsed);
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
          blockResults: {},
          outputs: outputsAccumulator,
          error: success
            ? undefined
            : { message: `Process terminated with exit code ${event.payload.exit_code}` },
        };

        useExecutionStore.getState().setRunState(success ? "success" : "failed");
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

    const append = (msg: OutputMessage) => {
      outputsAccumulator.push(msg);
      useExecutionStore.getState().addOutput(msg);
    };

    setTimeout(() => {
      store.setStatusMessage("Loading dataset into pandas DataFrame...");
      append({
        type: "console",
        stream: "stdout",
        text: "[data.csv_loader] Loaded dataset from iris.csv: (150 rows, 5 columns)",
        timestamp: new Date().toISOString(),
      });
    }, 200);

    setTimeout(() => {
      store.setStatusMessage("Preprocessing: Train/Test split 80/20...");
      append({
        type: "console",
        stream: "stdout",
        text: "[ml.train_test_split] Split completed: Train (120 rows), Test (30 rows)",
        timestamp: new Date().toISOString(),
      });
    }, 600);

    setTimeout(() => {
      store.setStatusMessage("Training Random Forest Classifier (100 estimators)...");
      append({
        type: "console",
        stream: "stdout",
        text: "[ml.random_forest_classifier] Fitting 100 decision trees... done in 0.12s",
        timestamp: new Date().toISOString(),
      });
    }, 1100);

    setTimeout(() => {
      store.setStatusMessage("Evaluating model predictions...");
      append({
        type: "metrics",
        title: "Test Set Accuracy",
        metrics: {
          accuracy: 0.967,
          precision_macro: 0.969,
          recall_macro: 0.967,
          f1_macro: 0.967,
        },
        timestamp: new Date().toISOString(),
      });

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
        blockResults: {},
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

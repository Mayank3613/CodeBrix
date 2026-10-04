import { parsePythonOutputJsonLine } from "@codebrix/shared";
import type {
  ExecutionResult,
  OutputMessage,
} from "@codebrix/types";
import { useExecutionStore } from "../stores/executionStore";

function isTauri(): boolean {
  return typeof window !== "undefined" && Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

function getEndpointUrl(path: string): string {
  if (typeof window !== "undefined" && window.location?.origin && !window.location.origin.includes("null")) {
    return path;
  }
  return `http://127.0.0.1:1420${path}`;
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

        // Check for block lifecycle events
        try {
          const rawObj = JSON.parse(event.payload.line) as Record<string, unknown>;
          const payload = rawObj["payload"] as { blockId?: string } | undefined;
          if (rawObj["event"] === "block_start" && payload?.blockId) {
            useExecutionStore.getState().setBlockStatus(payload.blockId, "running");
            useExecutionStore.getState().setActiveBlockId(payload.blockId);
          } else if (rawObj["event"] === "block_done" && payload?.blockId) {
            useExecutionStore.getState().setBlockStatus(payload.blockId, "success");
          } else if (rawObj["event"] === "block_error" && payload?.blockId) {
            useExecutionStore.getState().setBlockStatus(payload.blockId, "failed");
          }
        } catch {
          // not json
        }

        const parsed = parsePythonOutputJsonLine(event.payload.line);
        if (parsed) {
          if (event.payload.stream === "stderr" && parsed.type === "console") {
            parsed.stream = "stderr";
          }
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
          exitCode: event.payload.exit_code,
          blockResults: {},
          outputs: outputsAccumulator,
          error: success
            ? undefined
            : { message: `Process terminated with exit code ${event.payload.exit_code}` },
        };

        useExecutionStore.getState().setRunState(success ? "success" : "failed");
        useExecutionStore.getState().setLatestResult(result);
        if (!success) {
          useExecutionStore.getState().setStatusMessage(`Execution failed with exit code ${event.payload.exit_code}`);
        }
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

  // Web dev mode: execute real Python via Vite dev server SSE endpoint
  return new Promise<ExecutionResult>((resolve) => {
    const outputsAccumulator: OutputMessage[] = [];

    const handleFailure = (errMsg: string) => {
      const failOutput: OutputMessage = {
        type: "error",
        message: `[Process Launch Error] ${errMsg}`,
        timestamp: new Date().toISOString(),
      };
      useExecutionStore.getState().addOutput(failOutput);
      useExecutionStore.getState().setRunState("failed");
      useExecutionStore.getState().setStatusMessage(`Execution failed: ${errMsg}`);

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
    };

    fetch(getEndpointUrl("/api/python/run"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ script, executionId }),
    })
      .then(async (res) => {
        if (!res.ok || !res.body) {
          throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let exitCode = 0;
        let success = true;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data: ")) continue;
            try {
              const evt = JSON.parse(line.slice(6)) as Record<string, unknown>;
              if (evt["type"] === "status" && typeof evt["message"] === "string") {
                useExecutionStore.getState().setStatusMessage(evt["message"]);
              } else if (evt["type"] === "output" && typeof evt["line"] === "string") {
                const lineText = evt["line"];
                const stream = evt["stream"] === "stderr" ? "stderr" : "stdout";

                try {
                  const rawObj = JSON.parse(lineText) as Record<string, unknown>;
                  const payload = rawObj["payload"] as { blockId?: string } | undefined;
                  if (rawObj["event"] === "block_start" && payload?.blockId) {
                    useExecutionStore.getState().setBlockStatus(payload.blockId, "running");
                    useExecutionStore.getState().setActiveBlockId(payload.blockId);
                  } else if (rawObj["event"] === "block_done" && payload?.blockId) {
                    useExecutionStore.getState().setBlockStatus(payload.blockId, "success");
                  } else if (rawObj["event"] === "block_error" && payload?.blockId) {
                    useExecutionStore.getState().setBlockStatus(payload.blockId, "failed");
                  }
                } catch {
                  // not json
                }

                const parsed = parsePythonOutputJsonLine(lineText);
                if (parsed) {
                  if (stream === "stderr" && parsed.type === "console") {
                    parsed.stream = "stderr";
                  }
                  outputsAccumulator.push(parsed);
                  useExecutionStore.getState().addOutput(parsed);
                }
              } else if (evt["type"] === "exit") {
                exitCode = typeof evt["exit_code"] === "number" ? evt["exit_code"] : 0;
                success = Boolean(evt["success"]);
              }
            } catch {
              // ignore malformed SSE
            }
          }
        }

        const endedAt = new Date().toISOString();
        const durationMs =
          new Date(endedAt).getTime() - new Date(startedAt).getTime();

        const result: ExecutionResult = {
          executionId,
          workflowId,
          status: success ? "success" : "failed",
          startedAt,
          completedAt: endedAt,
          durationMs,
          exitCode,
          blockResults: {},
          outputs: outputsAccumulator,
          error: success
            ? undefined
            : { message: `Process terminated with exit code ${exitCode}` },
        };

        useExecutionStore.getState().setRunState(success ? "success" : "failed");
        useExecutionStore.getState().setLatestResult(result);
        if (!success) {
          useExecutionStore.getState().setStatusMessage(`Execution failed with exit code ${exitCode}`);
        }
        resolve(result);
      })
      .catch((err) => {
        handleFailure((err as Error).message || String(err));
      });
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
  } else {
    try {
      await fetch(getEndpointUrl("/api/python/stop"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ executionId: eid }),
      });
    } catch (err) {
      console.warn("Error calling /api/python/stop:", err);
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

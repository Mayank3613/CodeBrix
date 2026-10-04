import { describe, it, expect, beforeEach, vi } from "vitest";
import { runPythonExecution, stopPythonExecution } from "./tauriPythonRuntime";
import { useExecutionStore } from "../stores/executionStore";

describe("Tauri Python Runtime Client (D1-3.6)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useExecutionStore.getState().resetExecution();
  });

  it("runs script execution with simulated streaming output in browser mode", async () => {
    const execPromise = runPythonExecution("print('hello world')", "test-wf");

    // Immediately in running state
    expect(useExecutionStore.getState().runState).toBe("running");
    expect(useExecutionStore.getState().executionId).toBeDefined();

    // Advance timers through simulated stages
    await vi.advanceTimersByTimeAsync(300);
    expect(useExecutionStore.getState().outputs.length).toBeGreaterThanOrEqual(1);

    await vi.advanceTimersByTimeAsync(1500);
    const result = await execPromise;

    expect(result.status).toBe("success");
    expect(useExecutionStore.getState().runState).toBe("success");
    expect(result.outputs.some((o) => o.type === "metrics")).toBe(true);
  });

  it("handles stop execution cleanly without crashing", async () => {
    void runPythonExecution("while True: pass", "test-wf-loop");
    expect(useExecutionStore.getState().runState).toBe("running");

    await stopPythonExecution();
    expect(useExecutionStore.getState().runState).toBe("failed");
    expect(useExecutionStore.getState().statusMessage).toContain("aborted by user");
  });
});

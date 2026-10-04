import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { runPythonExecution, stopPythonExecution } from "./tauriPythonRuntime";
import { useExecutionStore } from "../stores/executionStore";

describe("Tauri Python Runtime Client (D1-3.6)", () => {
  beforeEach(() => {
    useExecutionStore.getState().resetExecution();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("runs script execution with real streaming output protocol in web mode", async () => {
    const sseLines = [
      `data: {"type": "status", "message": "Started execution with python3"}\n\n`,
      `data: {"type": "output", "stream": "stdout", "line": "{\\"event\\": \\"block_start\\", \\"payload\\": {\\"blockId\\": \\"blk-acc\\"}}"}\n\n`,
      `data: {"type": "output", "stream": "stdout", "line": "{\\"type\\": \\"console\\", \\"stream\\": \\"stdout\\", \\"text\\": \\"[blk-acc] Accuracy calculated\\"}"}\n\n`,
      `data: {"type": "output", "stream": "stdout", "line": "{\\"type\\": \\"metrics\\", \\"title\\": \\"Model Accuracy\\", \\"metrics\\": {\\"accuracy\\": 0.967, \\"test_samples\\": 30}}"}\n\n`,
      `data: {"type": "output", "stream": "stdout", "line": "{\\"event\\": \\"block_done\\", \\"payload\\": {\\"blockId\\": \\"blk-acc\\", \\"status\\": \\"success\\"}}"}\n\n`,
      `data: {"type": "exit", "exit_code": 0, "success": true}\n\n`,
    ];

    const stream = new ReadableStream({
      start(controller) {
        for (const line of sseLines) {
          controller.enqueue(new TextEncoder().encode(line));
        }
        controller.close();
      },
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: stream,
    } as unknown as Response);

    const result = await runPythonExecution("print('hello world')", "test-wf");

    expect(result.status).toBe("success");
    expect(result.exitCode).toBe(0);
    expect(useExecutionStore.getState().runState).toBe("success");
    expect(useExecutionStore.getState().blockStatuses["blk-acc"]).toBe("success");
    expect(result.outputs.some((o) => o.type === "metrics")).toBe(true);
    expect(result.outputs.some((o) => o.type === "console")).toBe(true);
  });

  it("handles stop execution cleanly without crashing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    } as unknown as Response);

    // Set execution in progress
    useExecutionStore.getState().setExecutionId("exec-test-123");
    useExecutionStore.getState().setRunState("running");

    await stopPythonExecution();
    expect(useExecutionStore.getState().runState).toBe("failed");
    expect(useExecutionStore.getState().statusMessage).toContain("aborted by user");
  });
});

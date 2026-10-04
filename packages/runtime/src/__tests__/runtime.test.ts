import { describe, it, expect } from "vitest";
import { SubprocessPythonRuntime } from "../runtime.js";
import type { OutputMessage, BlockExecutionStatus } from "@codebrix/types";

describe("SubprocessPythonRuntime", () => {
  const runtime = new SubprocessPythonRuntime();

  it("should execute a script and capture streaming output and block states", async () => {
    const script = `
import json
import sys

def emit(obj):
    print(json.dumps(obj), flush=True)

emit({"event": "status", "payload": "running"})
emit({"event": "block_start", "payload": {"blockId": "b1"}})
emit({"type": "console", "stream": "stdout", "text": "Step 1 executing"})
emit({"event": "block_done", "payload": {"blockId": "b1", "status": "success"}})

emit({"event": "block_start", "payload": {"blockId": "b2"}})
emit({"type": "metrics", "title": "Test Metrics", "metrics": {"val": 42}})
emit({"event": "block_done", "payload": {"blockId": "b2", "status": "success"}})

emit({"event": "done", "payload": {"exitCode": 0, "status": "success"}})
`;

    const receivedOutputs: OutputMessage[] = [];
    const blockStatuses: Record<string, BlockExecutionStatus> = {};

    const result = await runtime.execute({
      script,
      workflowId: "test-wf",
      onOutput: (msg) => receivedOutputs.push(msg),
      onBlockStatus: (blockId, status) => {
        blockStatuses[blockId] = status;
      },
    });

    expect(result.status).toBe("success");
    expect(result.exitCode).toBe(0);
    expect(result.workflowId).toBe("test-wf");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);

    // Outputs verification
    expect(receivedOutputs.length).toBeGreaterThanOrEqual(2);
    const consoleMsg = receivedOutputs.find((m) => m.type === "console");
    expect(consoleMsg).toBeDefined();

    const metricsMsg = receivedOutputs.find((m) => m.type === "metrics");
    expect(metricsMsg).toBeDefined();

    // Block results verification
    expect(result.blockResults["b1"]?.status).toBe("success");
    expect(result.blockResults["b2"]?.status).toBe("success");
    expect(blockStatuses["b1"]?.status).toBe("success");
  });

  it("should capture runtime errors and mark status as failed", async () => {
    const script = `
import sys
raise ValueError("Intentional failure in test pipeline")
`;

    const result = await runtime.execute({
      script,
      workflowId: "failing-wf",
    });

    expect(result.status).toBe("failed");
    expect(result.exitCode).not.toBe(0);
    expect(result.error).toBeDefined();
  });
});

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { workflowService } from "./index";
import { createIrisWorkflowMock } from "@codebrix/shared";
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const originalFetch = globalThis.fetch;

function findWorkspaceRoot(): string {
  let cur = process.cwd();
  while (cur !== path.dirname(cur)) {
    if (fs.existsSync(path.join(cur, "pnpm-workspace.yaml"))) {
      return cur;
    }
    cur = path.dirname(cur);
  }
  return process.cwd();
}

function findPythonExecutable(): string {
  const rootDir = findWorkspaceRoot();
  const configPath = path.join(rootDir, ".python-runtime.json");
  if (fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, "utf-8")) as { python?: string };
      if (cfg.python && fs.existsSync(cfg.python)) return cfg.python;
    } catch {
      // ignore
    }
  }
  const venvUnix = path.join(rootDir, ".venv", "bin", "python");
  if (fs.existsSync(venvUnix)) return venvUnix;
  return process.platform === "win32" ? "python" : "python3";
}

beforeAll(() => {
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (urlStr.includes("/api/python/run") && init?.method === "POST") {
      const body = JSON.parse(String(init.body)) as { script: string; executionId: string };
      const rootDir = findWorkspaceRoot();
      const pyBin = findPythonExecutable();
      const tempScript = path.join(rootDir, "generated", `test_run_${body.executionId}.py`);
      fs.mkdirSync(path.dirname(tempScript), { recursive: true });
      fs.writeFileSync(tempScript, body.script);

      return new Promise<Response>((resolve) => {
        const child = spawn(pyBin, ["-u", tempScript], {
          cwd: rootDir,
          env: { ...process.env, PYTHONUNBUFFERED: "1", PYTHONPATH: rootDir },
        });

        const sseChunks: string[] = [
          `data: ${JSON.stringify({ type: "status", message: `Started with ${pyBin}` })}\n\n`,
        ];

        const sendLines = (stream: "stdout" | "stderr", chunk: Buffer) => {
          const lines = chunk.toString("utf-8").split(/\r?\n/);
          for (const line of lines) {
            if (!line.trim()) continue;
            sseChunks.push(`data: ${JSON.stringify({ type: "output", stream, line })}\n\n`);
          }
        };

        child.stdout.on("data", (chunk: Buffer) => sendLines("stdout", chunk));
        child.stderr.on("data", (chunk: Buffer) => sendLines("stderr", chunk));

        child.on("close", (code) => {
          try {
            if (fs.existsSync(tempScript)) fs.unlinkSync(tempScript);
          } catch {
            // ignore
          }
          const exitCode = code ?? 0;
          sseChunks.push(
            `data: ${JSON.stringify({ type: "exit", exit_code: exitCode, success: exitCode === 0 })}\n\n`
          );

          const stream = new ReadableStream({
            start(controller) {
              for (const ch of sseChunks) {
                controller.enqueue(new TextEncoder().encode(ch));
              }
              controller.close();
            },
          });

          resolve(
            new Response(stream, {
              status: 200,
              headers: { "Content-Type": "text/event-stream" },
            })
          );
        });

        child.on("error", (err) => {
          sseChunks.push(
            `data: ${JSON.stringify({
              type: "output",
              stream: "stderr",
              line: `[Process Error] ${err.message}`,
            })}\n\n`
          );
          sseChunks.push(
            `data: ${JSON.stringify({ type: "exit", exit_code: 1, success: false })}\n\n`
          );
          const stream = new ReadableStream({
            start(controller) {
              for (const ch of sseChunks) {
                controller.enqueue(new TextEncoder().encode(ch));
              }
              controller.close();
            },
          });
          resolve(
            new Response(stream, {
              status: 200,
              headers: { "Content-Type": "text/event-stream" },
            })
          );
        });
      });
    }

    return originalFetch(input, init);
  };
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

describe("WorkflowService (Desktop Service Provider)", () => {
  it("exports active workflow service instance", () => {
    expect(workflowService).toBeDefined();
    expect(typeof workflowService.validateGraph).toBe("function");
    expect(typeof workflowService.executeWorkflow).toBe("function");
    expect(typeof workflowService.getExecutionPlan).toBe("function");
  });

  it("validates the Iris MVP workflow graph as valid", async () => {
    const irisGraph = createIrisWorkflowMock();
    const result = await workflowService.validateGraph(irisGraph);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("generates an execution plan for the Iris workflow", async () => {
    const irisGraph = createIrisWorkflowMock();
    const plan = await workflowService.getExecutionPlan(irisGraph);
    expect(plan.workflowId).toBe(irisGraph.id);
    expect(plan.executionOrder.length).toBeGreaterThan(0);
    expect(plan.executionOrder).toContain("blk-csv");
  });

  it(
    "executes the Iris workflow in a live Python subprocess and returns computed results",
    async () => {
      const irisGraph = createIrisWorkflowMock();
      const result = await workflowService.executeWorkflow(irisGraph);
      expect(result.status).toBe("success");
      expect(result.exitCode).toBe(0);
      expect(result.outputs.length).toBeGreaterThan(0);

      // Verify real console stream from Python
      const consoleOutput = result.outputs.find((o) => o.type === "console");
      expect(consoleOutput).toBeDefined();

      // Verify real scikit-learn computed accuracy metric
      const metricsOutput = result.outputs.find(
        (o) => o.type === "metrics" && (o as { title?: string }).title === "Model Accuracy"
      );
      expect(metricsOutput).toBeDefined();
      if (metricsOutput && metricsOutput.type === "metrics") {
        expect(Number(metricsOutput.metrics["accuracy"])).toBeGreaterThanOrEqual(0.85);
        expect(metricsOutput.metrics["test_samples"]).toBe(30);
        expect(metricsOutput.metrics["correct_predictions"]).toBeDefined();
        expect(metricsOutput.metrics["incorrect_predictions"]).toBeDefined();
      }

      // Verify real tabular dataset preview loaded by pandas from iris.csv
      const tableOutput = result.outputs.find((o) => o.type === "table");
      expect(tableOutput).toBeDefined();
      if (tableOutput && tableOutput.type === "table") {
        expect(tableOutput.totalRows).toBe(150);
        expect(tableOutput.columns).toContain("species");
        expect(tableOutput.rows.length).toBeGreaterThan(0);
      }

      // Verify real computed multiclass confusion matrix
      const cmOutput = result.outputs.find(
        (o) => o.type === "metrics" && (o as { title?: string }).title === "Confusion Matrix"
      );
      expect(cmOutput).toBeDefined();
      if (cmOutput && cmOutput.type === "metrics") {
        expect(Array.isArray(cmOutput.metrics["matrix"])).toBe(true);
        const matrix = cmOutput.metrics["matrix"] as unknown as number[][];
        expect(matrix.length).toBe(3); // 3 classes of Iris: setosa, versicolor, virginica
      }
    },
    25000
  );

  it(
    "dynamically re-computes results when workflow parameters change (no hardcoded values)",
    async () => {
    const irisGraph = createIrisWorkflowMock();

    // Modify test_size from 0.2 to 0.4 in the workflow configuration
    const modifiedGraph = {
      ...irisGraph,
      blocks: {
        ...irisGraph.blocks,
        "blk-split": {
          ...irisGraph.blocks["blk-split"]!,
          config: {
            ...irisGraph.blocks["blk-split"]!.config,
            test_size: 0.4,
          },
        },
      },
    };

    const result = await workflowService.executeWorkflow(modifiedGraph);
    expect(result.status).toBe("success");
    expect(result.exitCode).toBe(0);

    const metricsOutput = result.outputs.find(
      (o) => o.type === "metrics" && (o as { title?: string }).title === "Model Accuracy"
    );
    expect(metricsOutput).toBeDefined();
    if (metricsOutput && metricsOutput.type === "metrics") {
      // 150 rows * 0.4 = 60 test samples dynamically calculated
      expect(metricsOutput.metrics["test_samples"]).toBe(60);
      expect(Number(metricsOutput.metrics["accuracy"])).toBeGreaterThanOrEqual(0.85);
    }
  }, 25000);

  it("generates standalone Python script from workflow DAG", async () => {
    const irisGraph = createIrisWorkflowMock();
    const service = workflowService as unknown as { generatePythonScript: (g: typeof irisGraph) => Promise<string> };
    expect(typeof service.generatePythonScript).toBe("function");
    const script = await service.generatePythonScript(irisGraph);
    expect(script).toContain("import pandas as pd");
    expect(script).toContain("RandomForestClassifier");
    expect(script).toContain("emit_json");
  });
});

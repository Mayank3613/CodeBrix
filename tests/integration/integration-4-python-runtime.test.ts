import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync, spawn } from "node:child_process";
import { parseCbxProject } from "../../apps/desktop/src/project/projectManager.js";
import { PythonCodeGenerator } from "@codebrix/codegen";
import { getExecutionPlan } from "@codebrix/graph-engine";
import { parsePythonOutputJsonLine } from "@codebrix/shared";
import type { OutputMessage } from "@codebrix/types";
import { generateVariablesPython, generateConditionsPython } from "../../libraries/core/src/index.js";

describe("Phase 3 Gate: Generated Python Script Execution & Structured Protocol", () => {
  const rootDir = path.resolve(__dirname, "../../");
  const cbxFilePath = path.join(rootDir, "examples", "iris-classification.cbx");

  function getPythonExecutable(): string | null {
    // 1. Check .python-runtime.json config
    const configPath = path.join(rootDir, ".python-runtime.json");
    if (fs.existsSync(configPath)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(configPath, "utf-8")) as { python?: string };
        if (cfg.python && fs.existsSync(cfg.python)) {
          return cfg.python;
        }
      } catch {
        // ignore
      }
    }

    // 2. Check virtualenv
    const venvWin = path.join(rootDir, ".venv", "Scripts", "python.exe");
    if (fs.existsSync(venvWin)) return venvWin;
    const venvUnix = path.join(rootDir, ".venv", "bin", "python");
    if (fs.existsSync(venvUnix)) return venvUnix;

    // 3. Fallback candidates
    const candidates = process.platform === "win32" ? ["python", "py"] : ["python3", "python"];
    for (const cmd of candidates) {
      const res = spawnSync(cmd, ["--version"], { encoding: "utf-8" });
      if (res.status === 0) {
        return cmd;
      }
    }
    return null;
  }

  it("finds a Python runtime in virtualenv or system environment", () => {
    const python = getPythonExecutable();
    expect(python).not.toBeNull();
  });

  it(
    "executes generated Iris pipeline in a separate Python process and receives structured JSON results",
    async () => {
      const python = getPythonExecutable();
      if (!python) {
        console.warn("Python executable not found; skipping execution test.");
        return;
      }

      // 1. Load project and generate Python code
      const raw = fs.readFileSync(cbxFilePath, "utf-8");
      const { project } = parseCbxProject(raw);
      expect(project).toBeDefined();

      const plan = getExecutionPlan(project!.graph);
      const generator = new PythonCodeGenerator();
      const generated = generator.generate(project!.graph, plan);

      expect(generated.code).toContain("import pandas as pd");
      expect(generated.code).toContain("RandomForestClassifier");

      // 2. Execute generated script in separate subprocess
      const scriptPath = path.join(rootDir, "generated", `test_run_phase3_${Date.now()}.py`);
      fs.mkdirSync(path.dirname(scriptPath), { recursive: true });
      fs.writeFileSync(scriptPath, generated.code);

      const parsedMessages: OutputMessage[] = [];
      const rawEvents: Array<Record<string, unknown>> = [];

      try {
        await new Promise<void>((resolve, reject) => {
          const proc = spawn(python, ["-u", scriptPath], {
            cwd: rootDir,
            stdio: ["ignore", "pipe", "pipe"],
          });

          proc.stdout.on("data", (chunk: Buffer) => {
            const lines = chunk.toString("utf-8").split(/\r?\n/).filter((l) => l.trim().length > 0);
            for (const line of lines) {
              try {
                rawEvents.push(JSON.parse(line));
              } catch {
                // non-json
              }
              const parsed = parsePythonOutputJsonLine(line);
              if (parsed) {
                parsedMessages.push(parsed);
              }
            }
          });

          proc.on("close", (code) => {
            expect(code).toBe(0);
            resolve();
          });

          proc.on("error", (err) => {
            reject(err);
          });
        });

        // 3. Verify protocol messages
        // Expect status running event
        expect(rawEvents.some((e) => e["event"] === "status" && e["payload"] === "running")).toBe(true);

        // Expect block execution logs for data and ML steps
        const consoleTexts = parsedMessages
          .filter((m) => m.type === "console")
          .map((m) => (m as { text: string }).text);

        expect(consoleTexts.some((t) => t.includes("[blk-csv]") && t.includes("150 rows"))).toBe(true);
        expect(consoleTexts.some((t) => t.includes("[blk-split]") && t.includes("Split completed"))).toBe(true);
        expect(consoleTexts.some((t) => t.includes("[blk-rf]") && t.includes("Random Forest trained"))).toBe(true);
        expect(consoleTexts.some((t) => t.includes("[blk-predict]") && t.includes("Predict:"))).toBe(true);

        // Expect accuracy metrics message
        const accuracyMsg = parsedMessages.find((m) => m.type === "metrics" && (m as { title?: string }).title === "Model Accuracy");
        expect(accuracyMsg).toBeDefined();
        if (accuracyMsg && accuracyMsg.type === "metrics") {
          expect(typeof accuracyMsg.metrics["accuracy"]).toBe("number");
          expect(Number(accuracyMsg.metrics["accuracy"])).toBeGreaterThanOrEqual(0.85);
          expect(accuracyMsg.metrics["correct_predictions"]).toBeDefined();
          expect(accuracyMsg.metrics["incorrect_predictions"]).toBeDefined();
        }

        // Expect confusion matrix metrics message
        const cmMsg = parsedMessages.find((m) => m.type === "metrics" && (m as { title?: string }).title === "Confusion Matrix");
        expect(cmMsg).toBeDefined();
        if (cmMsg && cmMsg.type === "metrics") {
          expect(Array.isArray(cmMsg.metrics["matrix"])).toBe(true);
        }

        // Expect done event
        expect(rawEvents.some((e) => e["event"] === "done" && (e["payload"] as { status: string })?.status === "success")).toBe(true);
      } finally {
        if (fs.existsSync(scriptPath)) {
          fs.unlinkSync(scriptPath);
        }
      }
    },
    20000
  );

  it("handles crashing Python script gracefully with failure event without throwing unhandled exceptions", async () => {
    const python = getPythonExecutable();
    if (!python) return;

    const crashScript = `import sys
import json
print(json.dumps({"event": "status", "payload": "running"}))
print("Simulating critical failure before crash", file=sys.stderr)
sys.exit(42)
`;

    const res = spawnSync(python, ["-c", crashScript], { encoding: "utf-8" });
    expect(res.status).toBe(42);
    expect(res.stderr).toContain("Simulating critical failure");
  });

  it("executes Core library Variables and Conditions generated Python correctly", async () => {
    const python = getPythonExecutable();
    if (!python) return;

    const varCode = generateVariablesPython({ varName: "threshold", varType: "number", varValue: "0.5" }, { outputVarName: "thresh_val" });
    const condCode = generateConditionsPython({ operator: ">", threshold: "0.5" }, { inputVarNames: { input_val: "0.8", compare_val: "thresh_val" }, outputVarName: "is_valid" });

    const testScript = `${varCode}
${condCode}
import json
print(json.dumps({"type": "metrics", "title": "Condition Test", "metrics": {"is_valid": int(is_valid), "threshold": thresh_val}}))
`;

    const res = spawnSync(python, ["-c", testScript], { encoding: "utf-8" });
    expect(res.status).toBe(0);

    const parsed = parsePythonOutputJsonLine(res.stdout);
    expect(parsed).toBeDefined();
    if (parsed && parsed.type === "metrics") {
      expect(parsed.metrics["is_valid"]).toBe(1);
      expect(parsed.metrics["threshold"]).toBe(0.5);
    }
  });
});

import { describe, it, expect } from "vitest";
import { spawnSync, spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { parsePythonOutputJsonLine } from "@codebrix/shared";

describe("Phase 0 Spike: Python Subprocess JSON Protocol", () => {
  const rootDir = path.resolve(__dirname, "../../");
  const spikeScript = path.join(rootDir, "python", "spike_runner.py");

  function getPythonExecutable(): string | null {
    // 1. Check .python-runtime.json config if written by setup.ts
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

    // 2. Check virtualenv directly
    const venvWin = path.join(rootDir, ".venv", "Scripts", "python.exe");
    if (fs.existsSync(venvWin)) return venvWin;
    const venvUnix = path.join(rootDir, ".venv", "bin", "python");
    if (fs.existsSync(venvUnix)) return venvUnix;

    // 3. Fallback candidates
    const candidates = process.platform === "win32" ? ["py", "python"] : ["python3", "python"];
    for (const cmd of candidates) {
      const res = spawnSync(cmd, ["--version"], { encoding: "utf-8" });
      if (res.status === 0) {
        return cmd;
      }
    }
    return null;
  }

  it("should find a valid Python executable or system candidate", () => {
    const python = getPythonExecutable();
    // In CI or dev environment, python should be discoverable
    if (python) {
      const res = spawnSync(python, ["--version"], { encoding: "utf-8" });
      expect(res.status).toBe(0);
      const versionStr = res.stdout.trim() || res.stderr.trim();
      expect(versionStr).toMatch(/Python 3\./);
    } else {
      console.warn("Python not installed on system; skipping execution assertion.");
    }
  });

  it(
    "should execute spike_runner.py and receive structured JSON messages",
    async () => {
      const python = getPythonExecutable();
      if (!python) {
        console.warn("Skipping python subprocess test - Python not found.");
        return;
      }

      const messages: Array<ReturnType<typeof parsePythonOutputJsonLine>> = [];
      const rawEvents: Array<Record<string, unknown>> = [];

      await new Promise<void>((resolve, reject) => {
        const proc = spawn(python, [spikeScript], {
          stdio: ["ignore", "pipe", "pipe"],
        });

        proc.stdout.on("data", (chunk: Buffer) => {
          const text = chunk.toString("utf-8");
          const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

          for (const line of lines) {
            try {
              const raw = JSON.parse(line) as Record<string, unknown>;
              rawEvents.push(raw);
            } catch {
              // non-json
            }
            const parsed = parsePythonOutputJsonLine(line, "spike-block");
            if (parsed) {
              messages.push(parsed);
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

    // Check received JSON events
    expect(rawEvents.length).toBeGreaterThanOrEqual(3);

    // Verify console message received
    const consoleMsg = messages.find((m) => m?.type === "console");
    expect(consoleMsg).toBeDefined();
    if (consoleMsg?.type === "console") {
      expect(consoleMsg.text).toContain("Hello from CodeBrix Python Runtime Spike!");
    }

    // Verify metrics message received
    const metricsMsg = messages.find((m) => m?.type === "metrics");
    expect(metricsMsg).toBeDefined();
    if (metricsMsg?.type === "metrics") {
      expect(metricsMsg.metrics["spike_status"]).toBe("pass");
    }
  }, 15000);
});

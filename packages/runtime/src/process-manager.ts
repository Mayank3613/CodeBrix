import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { nanoid } from "nanoid";

/**
 * Handles spawning and managing a single Python child process session.
 */
export class SubprocessSession {
  private child: ChildProcess | null = null;
  private tempFilePath: string | null = null;
  private isKilled = false;

  constructor(
    private readonly pythonExecutable: string,
    private readonly scriptContent: string,
    private readonly cwd: string = process.cwd(),
    private readonly timeoutMs: number = 60000,
    private readonly extraEnv: Record<string, string> = {}
  ) {}

  /**
   * Spawns the Python process and streams stdout/stderr line-by-line.
   */
  start(
    onLine: (line: string, stream: "stdout" | "stderr") => void
  ): Promise<{ exitCode: number; wasAborted: boolean }> {
    return new Promise((resolve, reject) => {
      // 1. Write script content to a temporary file
      const tempId = nanoid(8);
      const tempFile = path.join(os.tmpdir(), `codebrix_exec_${tempId}.py`);
      try {
        fs.writeFileSync(tempFile, this.scriptContent, "utf-8");
        this.tempFilePath = tempFile;
      } catch (err) {
        return reject(new Error(`Failed to write temp script file: ${String(err)}`));
      }

      // 2. Spawn process with PYTHONUNBUFFERED=1 and cross-platform PYTHONPATH
      const sep = process.platform === "win32" ? ";" : ":";
      const existingPyPath = process.env["PYTHONPATH"] || "";
      const pythonPath = existingPyPath
        ? `${this.cwd}${sep}${existingPyPath}`
        : this.cwd;

      const env = {
        ...process.env,
        PYTHONUNBUFFERED: "1",
        PYTHONPATH: pythonPath,
        ...this.extraEnv,
      };

      const proc = spawn(this.pythonExecutable, ["-u", tempFile], {
        cwd: this.cwd,
        env,
        stdio: ["ignore", "pipe", "pipe"],
      });

      this.child = proc;

      // 3. Set up timeout timer
      const timer = setTimeout(() => {
        this.isKilled = true;
        this.kill();
      }, this.timeoutMs);

      // Line buffer helpers to avoid cutting lines across chunks
      let stdoutBuffer = "";
      let stderrBuffer = "";

      const processBuffer = (
        stream: "stdout" | "stderr",
        chunk: Buffer,
        isEnd = false
      ) => {
        const current = (stream === "stdout" ? stdoutBuffer : stderrBuffer) + chunk.toString("utf-8");
        const lines = current.split(/\r?\n/);

        // Keep last incomplete segment in buffer unless ending
        if (isEnd) {
          if (stream === "stdout") stdoutBuffer = "";
          else stderrBuffer = "";
          for (const line of lines) {
            if (line.trim().length > 0) onLine(line, stream);
          }
        } else {
          const remaining = lines.pop() ?? "";
          if (stream === "stdout") stdoutBuffer = remaining;
          else stderrBuffer = remaining;
          for (const line of lines) {
            if (line.trim().length > 0) onLine(line, stream);
          }
        }
      };

      proc.stdout?.on("data", (chunk: Buffer) => {
        processBuffer("stdout", chunk);
      });

      proc.stderr?.on("data", (chunk: Buffer) => {
        processBuffer("stderr", chunk);
      });

      proc.on("error", (err) => {
        clearTimeout(timer);
        this.cleanup();
        reject(err);
      });

      proc.on("close", (code) => {
        clearTimeout(timer);
        // Flush remaining buffer
        if (stdoutBuffer.trim().length > 0) {
          onLine(stdoutBuffer.trim(), "stdout");
        }
        if (stderrBuffer.trim().length > 0) {
          onLine(stderrBuffer.trim(), "stderr");
        }
        this.cleanup();
        resolve({
          exitCode: code ?? (this.isKilled ? -1 : 0),
          wasAborted: this.isKilled,
        });
      });
    });
  }

  /**
   * Terminate the running child process.
   */
  kill(): void {
    if (this.child && !this.child.killed) {
      this.isKilled = true;
      try {
        if (process.platform === "win32" && this.child.pid) {
          // In Windows, standard kill may not cascade to child python processes
          spawn("taskkill", ["/PID", this.child.pid.toString(), "/T", "/F"]);
        } else {
          this.child.kill("SIGTERM");
          setTimeout(() => {
            if (this.child && !this.child.killed) {
              this.child.kill("SIGKILL");
            }
          }, 1000);
        }
      } catch {
        // Ignored
      }
    }
  }

  private cleanup(): void {
    if (this.tempFilePath && fs.existsSync(this.tempFilePath)) {
      try {
        fs.unlinkSync(this.tempFilePath);
      } catch {
        // Ignored
      }
      this.tempFilePath = null;
    }
  }
}

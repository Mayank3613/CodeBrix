import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { PythonEnvironment } from "./types.js";

/**
 * Searches for a usable Python 3.11+ executable.
 *
 * Check order:
 * 1. .python-runtime.json in cwd or rootDir
 * 2. Virtual environment (.venv/Scripts/python.exe on Windows, .venv/bin/python on Unix)
 * 3. System PATH candidates: py (Windows), python3, python
 */
export class PythonDetector {
  constructor(private readonly searchDir: string = process.cwd()) {}

  /**
   * Find and validate a Python executable.
   *
   * @throws Error if no valid Python 3.11+ executable can be found.
   */
  detect(): PythonEnvironment {
    // 1. Check .python-runtime.json and .venv in searchDir and ancestor directories
    let currentDir = this.searchDir;
    while (currentDir) {
      const configPath = path.join(currentDir, ".python-runtime.json");
      if (fs.existsSync(configPath)) {
        try {
          const raw = fs.readFileSync(configPath, "utf-8");
          const cfg = JSON.parse(raw) as { python?: string };
          if (cfg.python && fs.existsSync(cfg.python)) {
            const version = this.getPythonVersion(cfg.python);
            if (version) {
              return {
                executable: cfg.python,
                version,
                isVenv: true,
                cwd: this.searchDir,
              };
            }
          }
        } catch {
          // Fall through to venv check
        }
      }

      // Check standard .venv directory (Windows and Unix paths)
      const venvWin = path.join(currentDir, ".venv", "Scripts", "python.exe");
      if (fs.existsSync(venvWin)) {
        const version = this.getPythonVersion(venvWin);
        if (version) {
          return {
            executable: venvWin,
            version,
            isVenv: true,
            cwd: this.searchDir,
          };
        }
      }

      const venvUnix = path.join(currentDir, ".venv", "bin", "python");
      if (fs.existsSync(venvUnix)) {
        const version = this.getPythonVersion(venvUnix);
        if (version) {
          return {
            executable: venvUnix,
            version,
            isVenv: true,
            cwd: this.searchDir,
          };
        }
      }

      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) break;
      currentDir = parentDir;
    }

    // 2. Check system candidates (prioritize python over py on Windows)
    const candidates =
      process.platform === "win32"
        ? ["python", "python3", "py"]
        : ["python3", "python"];

    for (const cmd of candidates) {
      const version = this.getPythonVersion(cmd);
      if (version) {
        return {
          executable: cmd,
          version,
          isVenv: false,
          cwd: this.searchDir,
        };
      }
    }

    throw new Error(
      "Python 3.11+ was not found on this system.\n" +
        "Please ensure Python is installed and run `pnpm setup` to configure the virtual environment."
    );
  }

  /**
   * Helper to execute python --version and parse the version string.
   */
  private getPythonVersion(cmd: string): string | null {
    try {
      const res = spawnSync(cmd, ["--version"], {
        encoding: "utf-8",
        shell: process.platform === "win32",
      });

      if (res.status === 0) {
        const raw = (res.stdout.trim() || res.stderr.trim()).replace(/\r?\n/g, " ");
        const match = raw.match(/Python (\d+)\.(\d+)(?:\.(\d+))?/);
        if (match) {
          const major = Number(match[1]);
          const minor = Number(match[2]);
          if (major === 3 && minor >= 11) {
            return match[0].replace("Python ", "");
          }
        }
      }
    } catch {
      // Ignored
    }
    return null;
  }
}

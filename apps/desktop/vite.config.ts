import { defineConfig, type Plugin } from "vite";
import tailwindcss from '@tailwindcss/vite';
import react from "@vitejs/plugin-react";
import path from "node:path";
import fs from "node:fs";
import { spawn, type ChildProcess } from "node:child_process";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

function codebrixPythonRunnerPlugin(): Plugin {
  const rootDir = path.resolve(__dirname, "../../");
  const activeProcesses = new Map<string, ChildProcess>();

  function findPythonExecutable(): string {
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

    const venvWin = path.join(rootDir, ".venv", "Scripts", "python.exe");
    if (fs.existsSync(venvWin)) return venvWin;
    const venvUnix = path.join(rootDir, ".venv", "bin", "python");
    if (fs.existsSync(venvUnix)) return venvUnix;

    return process.platform === "win32" ? "python" : "python3";
  }

  return {
    name: "codebrix-python-runner",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/api/python/run" && req.method === "POST") {
          let body = "";
          req.on("data", (chunk: Buffer) => {
            body += chunk.toString();
          });
          req.on("end", () => {
            try {
              const { script, executionId } = JSON.parse(body) as {
                script: string;
                executionId: string;
              };

              const pyBin = findPythonExecutable();
              const tempDir = path.join(rootDir, "generated");
              fs.mkdirSync(tempDir, { recursive: true });
              const scriptPath = path.join(tempDir, `run_${executionId}.py`);
              fs.writeFileSync(scriptPath, script);

              res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
              });

              res.write(
                `data: ${JSON.stringify({
                  type: "status",
                  message: `Started execution with ${pyBin}`,
                })}\n\n`
              );

              const child = spawn(pyBin, ["-u", scriptPath], {
                cwd: rootDir,
                env: {
                  ...process.env,
                  PYTHONUNBUFFERED: "1",
                  PYTHONPATH: rootDir,
                },
              });

              activeProcesses.set(executionId, child);

              const sendLines = (stream: "stdout" | "stderr", chunk: Buffer) => {
                const text = chunk.toString("utf-8");
                const lines = text.split(/\r?\n/);
                for (const line of lines) {
                  if (!line.trim()) continue;
                  res.write(
                    `data: ${JSON.stringify({
                      type: "output",
                      stream,
                      line,
                    })}\n\n`
                  );
                }
              };

              child.stdout.on("data", (chunk: Buffer) => sendLines("stdout", chunk));
              child.stderr.on("data", (chunk: Buffer) => sendLines("stderr", chunk));

              child.on("close", (code) => {
                activeProcesses.delete(executionId);
                try {
                  if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
                } catch {
                  // ignore
                }
                const exitCode = code ?? 0;
                res.write(
                  `data: ${JSON.stringify({
                    type: "exit",
                    exit_code: exitCode,
                    success: exitCode === 0,
                  })}\n\n`
                );
                res.end();
              });

              child.on("error", (err) => {
                console.error("[PythonRunner] Child error:", err);
                activeProcesses.delete(executionId);
                res.write(
                  `data: ${JSON.stringify({
                    type: "output",
                    stream: "stderr",
                    line: `[Process Error] ${err.message}`,
                  })}\n\n`
                );
                res.write(
                  `data: ${JSON.stringify({
                    type: "exit",
                    exit_code: 1,
                    success: false,
                  })}\n\n`
                );
                res.end();
              });

              res.on("close", () => {
                if (!res.writableEnded && activeProcesses.has(executionId)) {
                  child.kill();
                  activeProcesses.delete(executionId);
                }
              });
            } catch (err) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: String(err) }));
            }
          });
          return;
        }

        if (req.url === "/api/python/stop" && req.method === "POST") {
          let body = "";
          req.on("data", (chunk: Buffer) => {
            body += chunk.toString();
          });
          req.on("end", () => {
            try {
              const { executionId } = JSON.parse(body) as { executionId: string };
              const child = activeProcesses.get(executionId);
              if (child) {
                child.kill();
                activeProcesses.delete(executionId);
              }
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ success: true }));
            } catch {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ success: false }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [
    react(),
    tailwindcss(),
    codebrixPythonRunnerPlugin(),
  ],
  resolve: {
    alias: {
      "@codebrix/types": path.resolve(__dirname, "../../packages/types/src/index.ts"),
      "@codebrix/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
      "@codebrix/graph-engine": path.resolve(__dirname, "../../packages/graph-engine/src/index.ts"),
      "@codebrix/codegen": path.resolve(__dirname, "../../packages/codegen/src/index.ts"),
      "@codebrix/library-core": path.resolve(__dirname, "../../libraries/core/src/index.ts"),
      "@codebrix/library-data": path.resolve(__dirname, "../../libraries/data/src/index.ts"),
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));

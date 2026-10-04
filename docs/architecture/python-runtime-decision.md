# Architecture Decision Record (ADR): Python Execution Engine in Tauri

**Status:** Proposed / Frozen for Phase 0 (Week 2 Decision)  
**Authors:** Developer 2 (ML & Execution) & Developer 1 (Data & Workflow)  
**Context:** CodeBrix Phase 0 - Week 2 Milestone  

---

## 1. Problem Statement

In the original prototype architecture, Node's `execa` / `child_process` library was used in Node environments (like scripts and test runners). However, **CodeBrix runs inside a Tauri webview (frontend: React + Vite)**. 

Webviews inside browser sandboxes **cannot** directly execute native host processes using Node `execa`. Therefore, Python process management must be bridged through native host capabilities.

---

## 2. Options Considered

### Option A: Tauri Rust Command (`tauri::command` + `std::process::Command` / `tokio::process`)
- **How it works:**
  1. React UI invokes Tauri command: `invoke('run_python_script', { scriptPath, executionId })`.
  2. Rust backend spawns the configured Python binary as an asynchronous child process using Tokio/std process.
  3. Rust reads lines from `stdout`/`stderr` and emits Tauri events: `app_handle.emit("python-output", { line, executionId })`.
  4. React UI listens to events via `@tauri-apps/api/event`.
- **Pros:**
  - Zero extra dependencies; native to Tauri.
  - High performance and clean cross-platform process isolation on Windows, macOS, and Linux.
  - Direct control over PID, process termination (`kill`), and stream buffering.
  - Bundles cleanly into single desktop executable without running a rogue local HTTP server.
- **Cons:**
  - Requires writing ~80 lines of Rust in `src-tauri/src/lib.rs` or `src-tauri/src/commands.rs`.

### Option B: Tauri External Binary Sidecar (`tauri-plugin-shell`)
- **How it works:**
  1. Bundle or point to an external binary runner specified in `tauri.conf.json` under `bundle.externalBin`.
  2. Frontend uses `@tauri-apps/plugin-shell` `Command.sidecar('python-runner')`.
- **Pros:**
  - Declarative configuration in Tauri.
- **Cons:**
  - Python installations on user machines are dynamic (paths vary between venv, pyenv, conda, system). Pointing a static externalBin to arbitrary Python binaries on user machines can be restrictive or error-prone.

### Option C: Standalone Node.js Sidecar / Local Hono Server
- **How it works:**
  1. A background Node process runs a localhost HTTP/WebSocket daemon (e.g. Hono/Express).
  2. Webview communicates over localhost HTTP/WebSocket to execute Python via Node's `execa`.
- **Pros:**
  - Can use `execa` in JavaScript/TypeScript directly.
- **Cons:**
  - Requires packaging a full Node runtime inside the desktop bundle.
  - Adds startup overhead, port collision issues, and local firewall warnings.

---

## 3. Decision

We adopt **Option A (Tauri Rust Command / Native Process Runner)** for production desktop execution, paired with an **abstract `PythonRuntime` interface**:

```typescript
export interface PythonRuntime {
  discoverPython(): Promise<{ path: string; version: string }>;
  execute(
    script: string,
    onOutput: (msg: OutputMessage) => void,
    onStatus: (status: ExecutionStatus) => void
  ): Promise<ExecutionResult>;
  stop(executionId: string): Promise<void>;
}
```

### Two Implementations of `PythonRuntime`:
1. **`TauriPythonRuntime` (for Desktop App):**
   Calls Tauri Rust commands `invoke('spawn_python', ...)` and listens to `python-event` streams.
2. **`NodePythonRuntime` / `TestPythonRuntime` (for CI and Vitest):**
   Uses Node `child_process` / `execa` so that unit tests, integration tests, and CI run headlessly on Linux, macOS, and Windows without requiring a Tauri GUI display.

---

## 4. Line Protocol Agreement

The Python runner (`python/runner.py` / `python/spike_runner.py`) communicates with the host over `stdout` using single-line JSON strings:

```json
{"event": "status", "payload": "running", "timestamp": "2026-10-04T12:00:00Z"}
{"type": "console", "stream": "stdout", "text": "Loaded 150 rows", "timestamp": "2026-10-04T12:00:01Z"}
{"type": "metrics", "title": "Accuracy", "metrics": {"accuracy": 0.967}, "timestamp": "2026-10-04T12:00:02Z"}
{"type": "image", "format": "confusion_matrix", "data": "base64_or_json", "timestamp": "2026-10-04T12:00:03Z"}
{"event": "done", "payload": {"exitCode": 0, "status": "success"}, "timestamp": "2026-10-04T12:00:04Z"}
```

This protocol decouples Developer 1's UI output panel from Developer 2's Python execution engine.

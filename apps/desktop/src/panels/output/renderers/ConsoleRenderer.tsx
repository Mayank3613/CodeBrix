import { useState, useRef, useEffect, useCallback } from "react";
import type {
  ConsoleOutputMessage,
  ErrorOutputMessage,
  OutputMessage,
} from "@codebrix/types";
import type { RendererProps } from "../registry";
import { useExecutionStore } from "../../../stores";
import { executeTerminalInteractiveCommand } from "../../../services/tauriPythonRuntime";

const QUICK_COMMANDS = [
  "help",
  "print('Hello from CodeBrix Terminal!')",
  "2 + 2",
  "python --version",
  "pip list",
  "status",
];

export default function ConsoleRenderer({
  messages,
  runState,
  onClear,
}: RendererProps<OutputMessage>) {
  const [commandInput, setCommandInput] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter console & error log messages
  const consoleLogs = messages.filter(
    (m): m is ConsoleOutputMessage | ErrorOutputMessage =>
      m.type === "console" || m.type === "error"
  );

  const errorCount = consoleLogs.filter(
    (l) => l.type === "error" || (l.type === "console" && l.stream === "stderr")
  ).length;

  // Auto-scroll to bottom on new log arrival
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consoleLogs.length, isExecuting]);

  // Handle Clear Console action
  const handleClear = useCallback(() => {
    useExecutionStore.getState().clearConsoleLogs();
    onClear?.();
  }, [onClear]);

  // Execute terminal command
  const handleExecute = useCallback(
    async (cmdToRun?: string) => {
      const command = (cmdToRun ?? commandInput).trim();
      if (!command || isExecuting) return;

      // Update command history
      setHistory((prev) => (prev[prev.length - 1] === command ? prev : [...prev, command]));
      setHistoryIndex(-1);
      setCommandInput("");
      setIsExecuting(true);

      try {
        await executeTerminalInteractiveCommand(command);
      } catch (err) {
        useExecutionStore.getState().addOutput({
          type: "error",
          message: `[Interactive Error] ${String(err)}`,
          timestamp: new Date().toISOString(),
        });
      } finally {
        setIsExecuting(false);
        // Re-focus the input
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [commandInput, isExecuting]
  );

  // Keyboard navigation (Enter, ArrowUp, ArrowDown, Ctrl+L / Cmd+K)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleExecute();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (history.length === 0) return;
        const nextIdx =
          historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIdx);
        setCommandInput(history[nextIdx] ?? "");
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (historyIndex === -1) return;
        const nextIdx = historyIndex + 1;
        if (nextIdx >= history.length) {
          setHistoryIndex(-1);
          setCommandInput("");
        } else {
          setHistoryIndex(nextIdx);
          setCommandInput(history[nextIdx] ?? "");
        }
      } else if ((e.ctrlKey && e.key === "l") || (e.metaKey && e.key === "k")) {
        e.preventDefault();
        handleClear();
      }
    },
    [handleExecute, handleClear, history, historyIndex]
  );

  return (
    <div className="h-full w-full flex-1 flex flex-col font-mono text-xs min-h-0 select-text">
      {/* ── Terminal Card ── */}
      <div className="bg-[#080c16]/95 p-3 rounded-2xl border border-white/10 text-slate-300 flex-1 flex flex-col min-h-0 shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-2.5 border-b border-white/10 text-[11px] font-sans shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1.5 font-semibold text-slate-200">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Interactive Terminal & Output Stream
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400 border border-white/10">
              {consoleLogs.length} entries
            </span>
            {errorCount > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 font-semibold">
                {errorCount} errors
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 hidden sm:inline font-mono">
              Shortcuts: <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10">↑/↓</kbd> history,{" "}
              <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10">Ctrl+L</kbd> clear
            </span>
            {consoleLogs.length > 0 && (
              <button
                onClick={handleClear}
                className="px-2.5 py-1 text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 rounded-lg text-[10px] font-medium transition-all cursor-pointer shadow-sm"
                title="Clear all console messages"
              >
                Clear Console
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Logs Body */}
        <div className="flex-1 overflow-y-auto pr-1 min-h-0 pt-2 space-y-1.5">
          {consoleLogs.length > 0 ? (
            <>
              {consoleLogs.map((log, i) => {
                // User Prompt execution echo
                if (log.type === "console" && log.text.startsWith("❯ ")) {
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 py-1 px-2.5 my-1 rounded-lg bg-cyan-950/25 border border-cyan-500/30 text-cyan-200 font-semibold"
                    >
                      <span className="text-slate-500 select-none text-[10px]">
                        [{log.timestamp ? log.timestamp.slice(11, 19) : "--:--:--"}]
                      </span>
                      <span className="text-cyan-400 font-bold select-none">❯</span>
                      <span className="text-slate-100 font-mono tracking-tight">
                        {log.text.slice(2)}
                      </span>
                    </div>
                  );
                }

                // Error message
                if (log.type === "error") {
                  return (
                    <div
                      key={i}
                      className="flex flex-col gap-1.5 text-rose-300 bg-rose-950/30 p-2.5 rounded-xl border border-rose-900/60 my-1"
                    >
                      <div className="flex items-center gap-2 font-semibold text-rose-400">
                        <span className="text-slate-500 text-[10px] font-mono">
                          [{log.timestamp ? log.timestamp.slice(11, 19) : "--:--:--"}]
                        </span>
                        <span>Error: {log.message}</span>
                      </div>
                      {log.traceback && (
                        <pre className="p-2.5 bg-black/60 rounded-lg border border-rose-950 text-[11px] text-rose-200/90 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
                          {log.traceback}
                        </pre>
                      )}
                    </div>
                  );
                }

                // Console output line
                if (log.type === "console") {
                  // Check if console text is raw JSON error
                  let rawErrorJson: { message?: string; traceback?: string } | null = null;
                  if (log.text.startsWith("{") && log.text.includes('"error"')) {
                    try {
                      const parsed = JSON.parse(log.text);
                      if (parsed.event === "error" || parsed.payload?.traceback) {
                        rawErrorJson = parsed.payload ?? parsed;
                      }
                    } catch {
                      // ignore
                    }
                  }

                  if (rawErrorJson) {
                    return (
                      <div
                        key={i}
                        className="flex flex-col gap-1.5 text-rose-300 bg-rose-950/30 p-2.5 rounded-xl border border-rose-900/60 my-1"
                      >
                        <div className="flex items-center gap-2 font-semibold text-rose-400">
                          <span className="text-slate-500 text-[10px] font-mono">
                            [{log.timestamp ? log.timestamp.slice(11, 19) : "--:--:--"}]
                          </span>
                          <span>{rawErrorJson.message || "Runtime Exception"}</span>
                        </div>
                        {rawErrorJson.traceback && (
                          <pre className="p-2.5 bg-black/60 rounded-lg border border-rose-950 text-[11px] text-rose-200/90 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
                            {rawErrorJson.traceback}
                          </pre>
                        )}
                      </div>
                    );
                  }

                  const isStderr = log.stream === "stderr";
                  return (
                    <div key={i} className="flex gap-2 leading-relaxed items-start py-0.5">
                      <span className="text-slate-600 select-none text-[10px] shrink-0 pt-0.5 font-mono">
                        [{log.timestamp ? log.timestamp.slice(11, 19) : "--:--:--"}]
                      </span>
                      <span
                        className={`whitespace-pre-wrap break-words font-mono ${
                          isStderr ? "text-rose-400" : "text-emerald-300"
                        }`}
                      >
                        {log.text}
                      </span>
                    </div>
                  );
                }

                return null;
              })}

              {runState === "running" && (
                <div className="flex items-center gap-2 text-amber-400 text-[11px] pt-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Streaming live Python output...</span>
                </div>
              )}
            </>
          ) : runState === "running" ? (
            <div className="flex-1 flex items-center justify-center text-amber-400 italic py-10 gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Initializing Python subprocess... streaming logs will appear here.</span>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-10 gap-3">
              <div className="text-center">
                <p className="text-slate-300 font-sans font-semibold text-sm">
                  Interactive Terminal Ready
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Type any Python statement, mathematical expression, or shell command below.
                </p>
              </div>

              {/* Quick sample chips */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                {QUICK_COMMANDS.map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => handleExecute(cmd)}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-500/30 text-slate-400 hover:text-cyan-300 text-[11px] font-mono transition-all cursor-pointer"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Interactive Command Input Prompt Bar ── */}
        <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center gap-2 bg-[#050811]/90 px-3 py-2 rounded-xl border border-white/10 focus-within:border-cyan-500/50 focus-within:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all shrink-0">
          <span className="text-cyan-400 font-bold text-sm select-none pl-0.5">❯</span>
          <input
            ref={inputRef}
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isExecuting}
            placeholder="Type command or Python code (e.g. print('hello'), 2+2, pip list, help)..."
            className="flex-1 bg-transparent text-slate-100 placeholder:text-slate-600 font-mono text-xs focus:outline-none disabled:opacity-50"
          />

          {isExecuting ? (
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-[11px] px-2 py-0.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>Running...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {commandInput.trim() && (
                <button
                  onClick={() => setCommandInput("")}
                  className="text-slate-500 hover:text-slate-300 text-[10px] px-1 py-0.5 rounded cursor-pointer transition-colors"
                  title="Clear input"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => handleExecute()}
                disabled={!commandInput.trim()}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 text-[11px] font-sans font-semibold flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                title="Execute command (Enter)"
              >
                <span>Run</span>
                <span className="text-[10px] opacity-70 font-mono font-normal">↵</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type {
  ConsoleOutputMessage,
  ErrorOutputMessage,
  OutputMessage,
} from "@codebrix/types";
import type { RendererProps } from "../registry";
import { useExecutionStore, useWorkflowStore, useUiStore } from "../../../stores";
import { blockRegistry } from "../../../registry";
import { executeTerminalInteractiveCommand } from "../../../services/tauriPythonRuntime";
import {
  Terminal,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CornerDownLeft,
} from "lucide-react";

const QUICK_COMMANDS = [
  "help",
  "print('Hello from CodeBrix Terminal!')",
  "2 + 2",
  "python --version",
  "pip list",
  "status",
];

function isProtocolJson(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const obj = JSON.parse(trimmed);
      return typeof obj === "object" && obj !== null && ("event" in obj || "type" in obj || "payload" in obj);
    } catch {
      return false;
    }
  }
  return false;
}

function BlockChip({ blockId }: { blockId: string }) {
  const block = useWorkflowStore((s) => s.graph.blocks[blockId]);
  const focusBlock = useUiStore((s) => s.focusBlock);
  const label = block?.label || (block?.definitionId ? blockRegistry.get(block.definitionId)?.name : null) || "Step";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        focusBlock(blockId);
      }}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/50 text-cyan-300 font-mono text-[11px] cursor-pointer transition-colors shadow-xs"
      title={`Focus ${label} on canvas`}
    >
      <span>{label}</span>
    </button>
  );
}

function FormattedLogText({ text, isStderr }: { text: string; isStderr?: boolean }) {
  // Replace internal block IDs (blk-...) with clickable BlockChips
  const parts = text.split(/(blk-[a-zA-Z0-9_-]+)/g);

  return (
    <span
      className={`whitespace-pre-wrap break-words font-mono text-[12px] leading-[20px] ${
        isStderr ? "text-rose-400" : "text-[var(--cb-text-primary)]"
      }`}
    >
      {parts.map((part, idx) => {
        if (part.startsWith("blk-")) {
          return <BlockChip key={idx} blockId={part} />;
        }
        return <span key={idx}>{part}</span>;
      })}
    </span>
  );
}

interface StepGroup {
  id: string;
  stepNum: string;
  totalSteps?: string;
  title: string;
  blockId?: string;
  status: "running" | "success" | "failed";
  duration?: string;
  logs: (ConsoleOutputMessage | ErrorOutputMessage)[];
}

type ConsoleItem =
  | { type: "step"; step: StepGroup }
  | { type: "log"; log: ConsoleOutputMessage | ErrorOutputMessage }
  | { type: "debug"; log: ConsoleOutputMessage | ErrorOutputMessage };

export default function ConsoleRenderer({
  messages,
  runState,
}: RendererProps<OutputMessage>) {
  const [commandInput, setCommandInput] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showDebugLogs, setShowDebugLogs] = useState(false);
  const [collapsedSteps, setCollapsedSteps] = useState<Record<string, boolean>>({});

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const graphBlocks = useWorkflowStore((s) => s.graph.blocks);

  // Filter console & error log messages
  const consoleLogs = useMemo(
    () =>
      messages.filter(
        (m): m is ConsoleOutputMessage | ErrorOutputMessage =>
          m.type === "console" || m.type === "error"
      ),
    [messages]
  );

  const errorCount = useMemo(
    () =>
      consoleLogs.filter(
        (l) => l.type === "error" || (l.type === "console" && l.stream === "stderr")
      ).length,
    [consoleLogs]
  );

  // Group messages into steps, raw logs, and debug events
  const { items, debugCount, stepCount } = useMemo(() => {
    const result: ConsoleItem[] = [];
    let currentStep: StepGroup | null = null;
    let dCount = 0;
    let sCount = 0;

    for (const log of consoleLogs) {
      if (log.type === "console" && isProtocolJson(log.text)) {
        dCount++;
        result.push({ type: "debug", log });
        continue;
      }

      const text = log.type === "console" ? log.text : log.message;

      // Check for step start: "[Step 1/6] Running Load CSV (blk-csv)..." or "Step 1/6: ..."
      const stepStartMatch = text.match(
        /(?:\[Step\s*(\d+)(?:\/(\d+))?\]|Step\s*(\d+)(?:\/(\d+))?:?)\s*(?:Running\s*)?([^(\n]+?)(?:\s*\((blk-[^)]+)\))?(?:\.\.\.|\s*$)/i
      );

      // Check for step completion: "[Step 1/6] ✓ Completed in 45ms"
      const stepDoneMatch = text.match(
        /(?:\[Step\s*(\d+)(?:\/(\d+))?\]|Step\s*(\d+)(?:\/(\d+))?:?)\s*(?:✓|Completed|Finished)\s*(?:in\s*(\d+(?:\.\d+)?(?:ms|s)))?/i
      );

      if (stepStartMatch) {
        if (currentStep) {
          result.push({ type: "step", step: currentStep });
        }
        const sNum = stepStartMatch[1] || stepStartMatch[3] || "1";
        const tNum = stepStartMatch[2] || stepStartMatch[4];
        let rawTitle = stepStartMatch[5]?.trim() || "Step";
        const blockId = stepStartMatch[6];

        // Resolve friendly title from blockRegistry / workflow store if blockId exists
        if (blockId && graphBlocks[blockId]) {
          rawTitle = graphBlocks[blockId].label || blockRegistry.get(graphBlocks[blockId].definitionId)?.name || rawTitle;
        }

        sCount++;
        currentStep = {
          id: `step-${sNum}-${Date.now()}-${sCount}`,
          stepNum: sNum,
          totalSteps: tNum,
          title: rawTitle,
          blockId,
          status: "running",
          logs: [log],
        };
        continue;
      }

      if (stepDoneMatch && currentStep) {
        currentStep.status = "success";
        if (stepDoneMatch[5]) {
          currentStep.duration = stepDoneMatch[5];
        }
        currentStep.logs.push(log);
        result.push({ type: "step", step: currentStep });
        currentStep = null;
        continue;
      }

      if (currentStep) {
        if (log.type === "error" || (log.type === "console" && log.stream === "stderr")) {
          currentStep.status = "failed";
        }
        currentStep.logs.push(log);
      } else {
        result.push({ type: "log", log });
      }
    }

    if (currentStep) {
      if (runState === "idle" && currentStep.status === "running") {
        currentStep.status = "success";
      }
      result.push({ type: "step", step: currentStep });
    }

    return { items: result, debugCount: dCount, stepCount: sCount };
  }, [consoleLogs, graphBlocks, runState]);

  // Auto-scroll to bottom on new log arrival
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consoleLogs.length, isExecuting]);

  // Execute terminal command
  const handleExecute = useCallback(
    async (cmdToRun?: string) => {
      const command = (cmdToRun ?? commandInput).trim();
      if (!command || isExecuting) return;

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
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [commandInput, isExecuting]
  );

  // Keyboard navigation
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
      }
    },
    [handleExecute, history, historyIndex]
  );

  const toggleStepCollapse = (stepId: string) => {
    setCollapsedSteps((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  const allCollapsed = useMemo(() => {
    if (stepCount === 0) return false;
    const stepItems = items.filter((i): i is { type: "step"; step: StepGroup } => i.type === "step");
    return stepItems.every((si) => collapsedSteps[si.step.id]);
  }, [items, stepCount, collapsedSteps]);

  const toggleCollapseAll = () => {
    const nextState = !allCollapsed;
    const updated: Record<string, boolean> = {};
    items.forEach((item) => {
      if (item.type === "step") {
        updated[item.step.id] = nextState;
      }
    });
    setCollapsedSteps(updated);
  };

  return (
    <div className="h-full w-full flex-1 flex flex-col font-mono text-xs min-h-0 select-text">
      {/* ── Subheader Toolbar ── */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--cb-border-subtle)] text-[11px] font-sans shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5 font-medium text-[var(--cb-text-primary)]">
            <Terminal size={13} className="text-cyan-400" />
            Console & Terminal
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] text-[var(--cb-text-muted)] border border-[var(--cb-border-subtle)]">
            {consoleLogs.length} entries
          </span>
          {errorCount > 0 && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 font-medium">
              {errorCount} errors
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {debugCount > 0 && (
            <label className="flex items-center gap-1.5 text-[11px] text-[var(--cb-text-muted)] hover:text-[var(--cb-text-secondary)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showDebugLogs}
                onChange={(e) => setShowDebugLogs(e.target.checked)}
                className="rounded border-[var(--cb-border-subtle)] bg-white/5 text-[var(--cb-accent)] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
              />
              <span>Debug ({debugCount})</span>
            </label>
          )}

          {stepCount > 0 && (
            <button
              onClick={toggleCollapseAll}
              className="text-[11px] text-[var(--cb-text-muted)] hover:text-[var(--cb-text-primary)] transition-colors cursor-pointer"
            >
              {allCollapsed ? "Expand All" : "Collapse All"}
            </button>
          )}
        </div>
      </div>

      {/* ── Scrollable Logs Body ── */}
      <div className="flex-1 overflow-y-auto pr-1 min-h-0 pt-2 space-y-1">
        {consoleLogs.length > 0 ? (
          <>
            {items.map((item, idx) => {
              if (item.type === "debug") {
                if (!showDebugLogs) return null;
                return (
                  <div
                    key={idx}
                    className="flex gap-2 leading-relaxed items-start py-0.5 text-[11px] text-[var(--cb-text-muted)] opacity-60 font-mono"
                  >
                    <span className="select-none text-[10px] shrink-0 pt-0.5">
                      [{item.log.timestamp ? item.log.timestamp.slice(11, 19) : "--:--:--"}]
                    </span>
                    <span className="text-slate-500 font-semibold">[DEBUG]</span>
                    <FormattedLogText text={item.log.type === "console" ? item.log.text : item.log.message} />
                  </div>
                );
              }

              if (item.type === "step") {
                const { step } = item;
                const isCollapsed = collapsedSteps[step.id];

                return (
                  <div
                    key={step.id}
                    className="my-1.5 rounded-[var(--cb-radius-control)] border border-[var(--cb-border-subtle)] bg-white/[0.02] overflow-hidden"
                  >
                    {/* Collapsible Step Header */}
                    <div
                      onClick={() => toggleStepCollapse(step.id)}
                      className="px-2.5 py-1.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.04] transition-colors select-none text-[12px]"
                    >
                      <div className="flex items-center gap-2">
                        {isCollapsed ? (
                          <ChevronRight size={13} className="text-[var(--cb-text-muted)]" />
                        ) : (
                          <ChevronDown size={13} className="text-[var(--cb-text-muted)]" />
                        )}
                        <span className="font-semibold text-cyan-300">
                          Step {step.stepNum}{step.totalSteps ? `/${step.totalSteps}` : ""}:
                        </span>
                        <span className="text-[var(--cb-text-primary)] font-medium">
                          {step.title}
                        </span>
                        {step.blockId && <BlockChip blockId={step.blockId} />}
                      </div>

                      <div className="flex items-center gap-2 text-[11px]">
                        {step.duration && (
                          <span className="text-[var(--cb-text-muted)] font-mono">{step.duration}</span>
                        )}
                        {step.status === "running" ? (
                          <span className="flex items-center gap-1 text-cyan-400 font-medium">
                            <Loader2 size={12} className="animate-spin" />
                            <span>Running</span>
                          </span>
                        ) : step.status === "failed" ? (
                          <span className="flex items-center gap-1 text-rose-400 font-medium">
                            <AlertCircle size={12} />
                            <span>Failed</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-400 font-medium">
                            <CheckCircle2 size={12} />
                            <span>Completed</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Step Body (Logs) */}
                    {!isCollapsed && (
                      <div className="px-3 py-2 border-t border-[var(--cb-border-subtle)] bg-black/20 space-y-1">
                        {step.logs.map((log, lIdx) => (
                          <div key={lIdx} className="flex gap-2 leading-relaxed items-start py-0.5">
                            <span className="text-slate-600 select-none text-[10px] shrink-0 pt-0.5 font-mono">
                              [{log.timestamp ? log.timestamp.slice(11, 19) : "--:--:--"}]
                            </span>
                            <FormattedLogText
                              text={log.type === "console" ? log.text : log.message}
                              isStderr={log.type === "error" || (log.type === "console" && log.stream === "stderr")}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              // Standard Raw Log
              const { log } = item;

              // Interactive prompt echo
              if (log.type === "console" && log.text.startsWith("❯ ")) {
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 py-1 px-2.5 my-1 rounded-[var(--cb-radius-control)] bg-cyan-950/25 border border-cyan-500/30 text-cyan-200 font-semibold"
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

              // Error log
              if (log.type === "error") {
                return (
                  <div
                    key={idx}
                    className="flex flex-col gap-1.5 text-rose-300 bg-rose-950/30 p-2.5 rounded-[var(--cb-radius-control)] border border-rose-900/60 my-1"
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

              // Standard Console line
              const isStderr = log.stream === "stderr";
              return (
                <div key={idx} className="flex gap-2 leading-relaxed items-start py-0.5">
                  <span className="text-slate-600 select-none text-[10px] shrink-0 pt-0.5 font-mono">
                    [{log.timestamp ? log.timestamp.slice(11, 19) : "--:--:--"}]
                  </span>
                  <FormattedLogText text={log.text} isStderr={isStderr} />
                </div>
              );
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
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--cb-text-muted)] py-10 gap-3">
            <div className="text-center">
              <p className="text-[var(--cb-text-primary)] font-sans font-semibold text-sm">
                Interactive Terminal Ready
              </p>
              <p className="text-xs text-[var(--cb-text-muted)] mt-1">
                Type any Python statement, expression, or command below.
              </p>
            </div>

            {/* Quick sample chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              {QUICK_COMMANDS.map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => handleExecute(cmd)}
                  className="px-2.5 py-1 rounded-[var(--cb-radius-control)] bg-white/[0.04] hover:bg-cyan-500/15 border border-[var(--cb-border-subtle)] hover:border-cyan-500/30 text-[var(--cb-text-secondary)] hover:text-cyan-300 text-[11px] font-mono transition-all cursor-pointer"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Interactive Command Input Prompt Bar (32px Standard Height) ── */}
      <div className="mt-2 pt-2 border-t border-[var(--cb-border-subtle)] flex items-center gap-2 bg-black/40 px-3 h-8 rounded-[var(--cb-radius-control)] border border-[var(--cb-border-subtle)] focus-within:border-[var(--cb-accent)] transition-all shrink-0">
        <span className="text-cyan-400 font-bold text-xs select-none pl-0.5">❯</span>
        <input
          ref={inputRef}
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isExecuting}
          placeholder="Type Python code or command (e.g. print('hello'), 2+2, pip list)..."
          className="flex-1 bg-transparent text-[var(--cb-text-primary)] placeholder:text-[var(--cb-text-muted)] font-mono text-[12px] focus:outline-none disabled:opacity-50"
        />

        {isExecuting ? (
          <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[11px] px-2 animate-pulse">
            <Loader2 size={11} className="animate-spin" />
            <span>Running...</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {commandInput.trim() && (
              <button
                onClick={() => setCommandInput("")}
                className="text-[var(--cb-text-muted)] hover:text-white text-[10px] px-1 py-0.5 rounded cursor-pointer transition-colors"
                title="Clear input"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => handleExecute()}
              disabled={!commandInput.trim()}
              className="px-2 py-0.5 rounded-[var(--cb-radius-sm)] bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 text-[11px] font-sans font-medium flex items-center gap-1 cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-xs"
              title="Execute command (Enter)"
            >
              <span>Run</span>
              <CornerDownLeft size={10} className="opacity-70" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

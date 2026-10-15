import { useState, useRef, useEffect } from "react";
import { Play, Square, ChevronDown, Check, AlertCircle, Loader2 } from "lucide-react";
import { useExecutionStore, useWorkflowStore, useUiStore, useValidationStore } from "../../stores";
import { workflowService, stopPythonExecution } from "../../services";
import type { WorkflowGraph } from "@codebrix/types";

export default function RunSplitButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const runState = useExecutionStore((s) => s.runState);
  const latestResult = useExecutionStore((s) => s.latestResult);
  const graph = useWorkflowStore((s) => s.graph);
  const selectedBlockId = useUiStore((s) => s.selectedBlockId);
  const isOutputOpen = useUiStore((s) => s.isOutputOpen);
  const toggleOutput = useUiStore((s) => s.toggleOutput);
  const setActiveOutputTab = useUiStore((s) => s.setActiveOutputTab);
  const setValidationResult = useValidationStore((s) => s.setValidationResult);

  const isRunning = runState === "running" || isValidating;
  const isSuccess = runState === "idle" && latestResult?.status === "success";
  const isFailed = runState === "failed" || (runState === "idle" && latestResult?.status === "failed");

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + Enter to run
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (runState === "running") {
          handleStop();
        } else {
          handleRunAll();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [runState, graph]);

  const runGraph = async (targetGraph: WorkflowGraph) => {
    if (runState === "running" || isValidating) return;

    try {
      setIsValidating(true);
      const valResult = await workflowService.validateGraph(targetGraph);
      setValidationResult(valResult);
      setIsValidating(false);

      if (!valResult.valid) {
        useExecutionStore.getState().setStatusMessage(
          `Validation failed (${valResult.errors.length} issue(s)) - fix errors before running`
        );
        return;
      }

      if (!isOutputOpen) {
        toggleOutput();
      }
      setActiveOutputTab("console");
      await workflowService.executeWorkflow(targetGraph);
    } catch (err) {
      setIsValidating(false);
      console.error("Execution error:", err);
      useExecutionStore.getState().setStatusMessage(`Execution error: ${(err as Error).message}`);
    }
  };

  const handleRunAll = () => {
    setIsOpen(false);
    runGraph(graph);
  };

  const handleRunSelected = () => {
    setIsOpen(false);
    if (!selectedBlockId || !graph.blocks[selectedBlockId]) {
      // If nothing selected, run entire graph
      runGraph(graph);
      return;
    }

    // Collect all ancestor blocks required by the selected block
    const neededBlockIds = new Set<string>([selectedBlockId]);
    const queue = [selectedBlockId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const conn of graph.connections) {
        if (conn.targetBlockId === current && !neededBlockIds.has(conn.sourceBlockId)) {
          neededBlockIds.add(conn.sourceBlockId);
          queue.push(conn.sourceBlockId);
        }
      }
    }

    // Filter blocks and connections for the subgraph
    const subBlocks: Record<string, import("@codebrix/types").BlockInstance> = {};
    for (const id of neededBlockIds) {
      if (graph.blocks[id]) {
        subBlocks[id] = graph.blocks[id]!;
      }
    }

    const subConnections = graph.connections.filter(
      (c) => neededBlockIds.has(c.sourceBlockId) && neededBlockIds.has(c.targetBlockId)
    );

    const subGraph: WorkflowGraph = {
      ...graph,
      id: `${graph.id}-selected-${Date.now()}`,
      blocks: subBlocks,
      connections: subConnections,
    };

    runGraph(subGraph);
  };

  const handleStop = async () => {
    setIsOpen(false);
    try {
      await stopPythonExecution();
    } catch (err) {
      console.error("Failed to stop execution:", err);
    }
  };

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      {isRunning ? (
        // When running: Stop button
        <button
          onClick={handleStop}
          className="h-7 px-2.5 rounded-[var(--cb-radius-control)] bg-rose-600/90 hover:bg-rose-600 text-white text-[12px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-500/60 shadow-sm"
          title="Stop execution"
          aria-label="Stop execution"
        >
          <Square size={13} className="fill-current" />
          <span>Stop</span>
          <Loader2 size={13} className="animate-spin ml-0.5 text-rose-200" />
        </button>
      ) : (
        // Normal split button: Run + Dropdown trigger
        <div className="inline-flex rounded-[var(--cb-radius-control)] shadow-sm bg-[var(--cb-accent)] hover:bg-[var(--cb-accent-hover)] transition-colors overflow-hidden border border-[var(--cb-accent-border)]">
          <button
            onClick={handleRunAll}
            className="h-7 px-2.5 text-white text-[13px] font-medium flex items-center gap-1.5 cursor-pointer hover:bg-black/10 transition-colors"
            title="Run Pipeline (Cmd+Enter or Ctrl+Enter)"
            aria-label="Run pipeline"
          >
            {isSuccess ? (
              <Check size={15} className="text-white stroke-[2.5]" />
            ) : isFailed ? (
              <AlertCircle size={15} className="text-amber-200 stroke-[2.5]" />
            ) : (
              <Play size={14} className="fill-current stroke-[1.5]" />
            )}
            <span>Run</span>
          </button>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="h-7 px-1.5 text-white/90 hover:text-white hover:bg-black/15 transition-colors border-l border-white/20 cursor-pointer flex items-center justify-center"
            title="Execution options"
            aria-label="Execution options menu"
            aria-expanded={isOpen}
          >
            <ChevronDown size={13} className={`transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-48 bg-[var(--cb-elevation-overlay)] border border-[var(--cb-border-strong)] rounded-[var(--cb-radius-control)] shadow-[var(--cb-shadow-overlay)] py-1 z-50 animate-in fade-in zoom-in-95 duration-100 text-[12px]">
          <button
            onClick={handleRunAll}
            className="w-full text-left px-3 py-1.5 text-[var(--cb-text-primary)] hover:bg-white/10 flex items-center justify-between transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Play size={13} className="text-[var(--cb-accent)]" />
              <span>Run all</span>
            </div>
            <span className="text-[10px] font-mono text-[var(--cb-text-muted)]">⌘↵</span>
          </button>

          <button
            onClick={handleRunSelected}
            className="w-full text-left px-3 py-1.5 text-[var(--cb-text-primary)] hover:bg-white/10 flex items-center justify-between transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Play size={13} className="text-cyan-400" />
              <span>Run selected</span>
            </div>
            {selectedBlockId && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">1</span>
            )}
          </button>

          {isRunning && (
            <>
              <div className="my-1 border-t border-[var(--cb-border-subtle)]" />
              <button
                onClick={handleStop}
                className="w-full text-left px-3 py-1.5 text-rose-400 hover:bg-rose-500/15 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Square size={13} className="fill-current" />
                <span>Stop execution</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

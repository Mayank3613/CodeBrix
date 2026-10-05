import { useState, useEffect, useRef } from "react";
import { CONTRACT_VERSION } from "@codebrix/shared";
import { workflowService } from "../../services";
import { stopPythonExecution } from "../../services/tauriPythonRuntime";
import {
  useWorkflowStore,
  useValidationStore,
  useExecutionStore,
  useUiStore,
  useProjectStore,
} from "../../stores";
import { createIrisWorkflowMock } from "@codebrix/shared";
import {
  serializeCbxProject,
  parseCbxProject,
  openProjectFileDialog,
  saveProjectFileDialog,
} from "../../project";
import {
  performAutosave,
  restoreFromRecoverySnapshot,
} from "../../project/autosave";
import { readProjectFile } from "../../project/fileIo";
import {
  PlayIcon,
  StopIcon,
  CheckIcon,
  FolderIcon,
  SaveIcon,
  CodeIcon,
  ChevronDownIcon,
  AlertTriangleIcon,
  SlidersIcon,
  LayersIcon,
  TerminalIcon,
} from "../common/Icons";

export default function Toolbar() {
  const [isValidating, setIsValidating] = useState(false);
  const [isRecentOpen, setIsRecentOpen] = useState(false);
  const recentMenuRef = useRef<HTMLDivElement>(null);

  const graph = useWorkflowStore((s) => s.graph);
  const setGraph = useWorkflowStore((s) => s.setGraph);
  const clearWorkflow = useWorkflowStore((s) => s.clearWorkflow);

  const setValidationResult = useValidationStore((s) => s.setValidationResult);
  const validationResult = useValidationStore((s) => s.validationResult);

  const setRunState = useExecutionStore((s) => s.setRunState);
  const runState = useExecutionStore((s) => s.runState);
  const statusMessage = useExecutionStore((s) => s.statusMessage);

  const isPaletteOpen = useUiStore((s) => s.isPaletteOpen);
  const togglePalette = useUiStore((s) => s.togglePalette);
  const isPropertiesOpen = useUiStore((s) => s.isPropertiesOpen);
  const toggleProperties = useUiStore((s) => s.toggleProperties);
  const isOutputOpen = useUiStore((s) => s.isOutputOpen);
  const toggleOutput = useUiStore((s) => s.toggleOutput);

  const projectName = useProjectStore((s) => s.projectName);
  const setProjectName = useProjectStore((s) => s.setProjectName);
  const currentFilePath = useProjectStore((s) => s.currentFilePath);
  const setCurrentFilePath = useProjectStore((s) => s.setCurrentFilePath);
  const isDirty = useProjectStore((s) => s.isDirty);
  const markDirty = useProjectStore((s) => s.markDirty);
  const resetProject = useProjectStore((s) => s.resetProject);
  const recentProjects = useProjectStore((s) => s.recentProjects);
  const removeRecentProject = useProjectStore((s) => s.removeRecentProject);
  const clearRecentProjects = useProjectStore((s) => s.clearRecentProjects);
  const recoverySnapshot = useProjectStore((s) => s.recoverySnapshot);
  const checkRecovery = useProjectStore((s) => s.checkRecovery);
  const dismissRecovery = useProjectStore((s) => s.dismissRecovery);

  // Check for recovery snapshot on mount and set up 30-second autosave interval
  useEffect(() => {
    checkRecovery();

    const timer = setInterval(() => {
      if (useProjectStore.getState().isDirty) {
        performAutosave();
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [checkRecovery]);

  // Click outside to close recent menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (recentMenuRef.current && !recentMenuRef.current.contains(event.target as Node)) {
        setIsRecentOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNewProject = () => {
    if (isDirty && !window.confirm("You have unsaved changes. Discard and create a new project?")) {
      return;
    }
    clearWorkflow();
    resetProject();
    setValidationResult(null);
    setRunState("idle");
  };

  const handleOpenProject = async () => {
    if (isDirty && !window.confirm("You have unsaved changes. Discard and open another project?")) {
      return;
    }
    const res = await openProjectFileDialog();
    if (!res) return;

    const parsed = parseCbxProject(res.content);
    if (!parsed.success || !parsed.project) {
      alert(`Failed to load .cbx project:\n${parsed.error}`);
      return;
    }

    setGraph(parsed.project.graph);
    setProjectName(parsed.project.graph.name || "Loaded Project");
    setCurrentFilePath(res.path || null);
    markDirty(false);
    setValidationResult(null);
    setRunState("idle");
  };

  const handleOpenRecent = async (path: string) => {
    setIsRecentOpen(false);
    if (isDirty && !window.confirm("You have unsaved changes. Discard and load this project?")) {
      return;
    }

    try {
      const content = await readProjectFile(path);
      const parsed = parseCbxProject(content);
      if (!parsed.success || !parsed.project) {
        alert(`Failed to parse recent project:\n${parsed.error}`);
        return;
      }

      setGraph(parsed.project.graph);
      setProjectName(parsed.project.graph.name || "Recent Project");
      setCurrentFilePath(path);
      markDirty(false);
      setValidationResult(null);
      setRunState("idle");
    } catch (err) {
      alert(`Could not open recent project at '${path}': ${(err as Error).message}`);
      removeRecentProject(path);
    }
  };

  const handleSaveProject = async () => {
    const json = serializeCbxProject(graph);
    const suggested = currentFilePath || `${projectName.toLowerCase().replace(/[^a-z0-9_-]/g, "-")}.cbx`;
    const res = await saveProjectFileDialog(json, suggested);
    if (res.success) {
      if (res.path) setCurrentFilePath(res.path);
      markDirty(false);
    }
  };

  const handleSaveAsProject = async () => {
    const custom = window.prompt("Save project as:", projectName);
    if (!custom) return;

    setProjectName(custom);
    const updatedGraph = { ...graph, name: custom };
    const json = serializeCbxProject(updatedGraph);
    const filename = `${custom.toLowerCase().replace(/[^a-z0-9_-]/g, "-")}.cbx`;
    const res = await saveProjectFileDialog(json, filename);
    if (res.success) {
      if (res.path) setCurrentFilePath(res.path);
      markDirty(false);
    }
  };

  const handleExportPython = async () => {
    try {
      if ("generatePythonScript" in workflowService) {
        const code = await (workflowService as unknown as { generatePythonScript: (g: typeof graph) => Promise<string> }).generatePythonScript(graph);
        const blob = new Blob([code], { type: "text/x-python;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${projectName.toLowerCase().replace(/[^a-z0-9_-]/g, "_")}_pipeline.py`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert(`Export Python error: ${(err as Error).message}`);
    }
  };

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const res = await workflowService.validateGraph(graph);
      setValidationResult(res);
    } catch (err) {
      console.error("Validation error:", err);
    } finally {
      setIsValidating(false);
    }
  };

  const handleRun = async () => {
    if (runState === "running" || isValidating) return;

    try {
      setIsValidating(true);
      const valResult = await workflowService.validateGraph(graph);
      setValidationResult(valResult);
      setIsValidating(false);

      if (!valResult.valid) {
        useExecutionStore.getState().setStatusMessage(
          `Validation failed (${valResult.errors.length} issue(s)) - resolve errors before running`
        );
        return;
      }

      if (!useUiStore.getState().isOutputOpen) {
        useUiStore.getState().toggleOutput();
      }
      useUiStore.getState().setActiveOutputTab("console");
      await workflowService.executeWorkflow(graph);
    } catch (err) {
      setIsValidating(false);
      console.error("Execution error:", err);
      useExecutionStore.getState().setStatusMessage(`Execution error: ${(err as Error).message}`);
    }
  };

  const handleImportProject = async () => {
    const res = await openProjectFileDialog();
    if (!res) return;

    const parsed = parseCbxProject(res.content);
    if (!parsed.success || !parsed.project) {
      alert(`Failed to import .cbx project:\n${parsed.error}`);
      return;
    }

    setGraph(parsed.project.graph);
    setProjectName(parsed.project.graph.name || "Imported Project");
    markDirty(true);
    setValidationResult(null);
    setRunState("idle");
  };

  const handleExportProject = async () => {
    const json = serializeCbxProject(graph);
    const filename = `${projectName.toLowerCase().replace(/[^a-z0-9_-]/g, "-")}-export.cbx`;
    await saveProjectFileDialog(json, filename);
  };

  const handleStop = async () => {
    await stopPythonExecution();
  };

  const handleReset = () => {
    const mock = createIrisWorkflowMock();
    setGraph(mock);
    setValidationResult(null);
    setRunState("idle");
    setProjectName("Iris Classification Acceptance Pipeline");
    markDirty(false);
  };

  const handleRestoreRecovery = () => {
    if (recoverySnapshot) {
      restoreFromRecoverySnapshot(recoverySnapshot);
      dismissRecovery();
    }
  };

  return (
    <>
      {/* Recovery Alert Banner if unsaved session exists */}
      {recoverySnapshot && (
        <div className="bg-amber-950/80 backdrop-blur-md border-b border-amber-600/60 px-4 py-1.5 flex items-center justify-between text-xs text-amber-200 z-50">
          <div className="flex items-center gap-2">
            <AlertTriangleIcon size={14} className="text-amber-400" />
            <span className="font-semibold text-amber-300">Crash Recovery:</span>
            <span>
              Unsaved session detected from {new Date(recoverySnapshot.savedAt).toLocaleTimeString()} ({recoverySnapshot.projectName}).
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestoreRecovery}
              className="px-2.5 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors"
            >
              Restore Session
            </button>
            <button
              onClick={dismissRecovery}
              className="px-2 py-0.5 rounded bg-slate-900/80 hover:bg-slate-800 text-amber-300 text-xs transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Unified IDE Toolbar Header */}
      <header className="cb-toolbar">
        {/* Left: Brand Identity + Project & File Operations */}
        <div className="flex items-center gap-2">
          {/* Studio Brand Mark */}
          <div className="flex items-center gap-2 pr-1">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500 via-indigo-600 to-violet-600 flex items-center justify-center shadow-[0_0_16px_rgba(6,182,212,0.4)] font-mono font-bold text-[11px] text-white tracking-tight border border-cyan-300/30">
              CB
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-white tracking-tight hidden sm:inline">
                CodeBrix
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
                v{CONTRACT_VERSION}
              </span>
            </div>
          </div>

          <div className="cb-toolbar-divider" />

          {/* Active Project Pill */}
          <div
            className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] max-w-[190px] truncate shadow-inner"
            title={currentFilePath || projectName}
          >
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${
                isDirty
                  ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-pulse"
                  : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
              }`}
            />
            <span className="text-slate-200 font-medium truncate">{projectName}</span>
            {isDirty && (
              <span className="text-[10px] text-amber-400 font-mono font-bold">*</span>
            )}
          </div>

          <div className="cb-toolbar-divider" />

          {/* File Operations */}
          <div className="flex items-center gap-0.5 bg-white/[0.03] p-0.5 rounded-lg border border-white/10" ref={recentMenuRef}>
            <button
              onClick={handleNewProject}
              className="cb-toolbar-btn text-[11px]"
              title="Create a new blank project"
            >
              New
            </button>

            <button
              onClick={handleOpenProject}
              className="cb-toolbar-btn text-[11px]"
              title="Open a .cbx project file"
            >
              <FolderIcon size={12} />
              <span>Open</span>
            </button>

            {/* Recent projects dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsRecentOpen(!isRecentOpen)}
                className="cb-toolbar-btn px-1 text-[11px]"
                title="Recent projects"
              >
                <ChevronDownIcon size={10} />
              </button>

              {isRecentOpen && (
                <div className="absolute left-0 top-full mt-2 w-64 bg-slate-900/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl py-1 z-50">
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-cyan-400 uppercase tracking-wider border-b border-white/10 flex items-center justify-between">
                    <span>Recent Projects</span>
                    <span className="text-[9px] font-mono text-slate-500">{recentProjects.length}</span>
                  </div>
                  {recentProjects.length > 0 ? (
                    <>
                      {recentProjects.map((p, i) => (
                        <button
                          key={i}
                          onClick={() => handleOpenRecent(p)}
                          className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-cyan-500/15 font-mono truncate block transition-colors"
                          title={p}
                        >
                          {p.split("/").pop() || p}
                        </button>
                      ))}
                      <div className="border-t border-white/10 mt-1 pt-1 px-3 py-1">
                        <button
                          onClick={clearRecentProjects}
                          className="text-[10px] text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          Clear History
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="px-3 py-2 text-xs text-slate-500 italic">No recent projects</div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleSaveProject}
              className="cb-toolbar-btn text-[11px]"
              title="Save project file (.cbx)"
            >
              <SaveIcon size={12} />
              <span>Save</span>
            </button>

            <button
              onClick={handleSaveAsProject}
              className="cb-toolbar-btn text-[11px]"
              title="Save as a new file"
            >
              Save As
            </button>

            <button
              onClick={handleImportProject}
              className="cb-toolbar-btn text-[11px]"
              title="Import .cbx project"
            >
              Import
            </button>

            <button
              onClick={handleExportProject}
              className="cb-toolbar-btn text-[11px]"
              title="Export project as .cbx"
            >
              Export
            </button>

            <button
              onClick={handleExportPython}
              className="cb-toolbar-btn text-[11px] text-cyan-300 hover:text-cyan-200 hover:bg-cyan-950/40"
              title="Export standalone Python script (.py)"
            >
              <CodeIcon size={12} />
              <span>Export .py</span>
            </button>
          </div>

          <div className="cb-toolbar-divider" />

          {/* Panel View Toggles (Tactile Bento Style) */}
          <div className="flex items-center gap-1 bg-white/[0.03] p-0.5 rounded-lg border border-white/10">
            <button
              onClick={togglePalette}
              className={`cb-toolbar-btn px-2.5 py-1 rounded-md text-[11px] ${
                isPaletteOpen
                  ? "bg-white/[0.12] text-white border border-white/25 shadow-[0_0_12px_rgba(255,255,255,0.12)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Toggle Block Palette"
            >
              <LayersIcon size={12} className={isPaletteOpen ? "text-cyan-300" : "text-slate-400"} />
              <span>Palette</span>
            </button>

            <button
              onClick={toggleProperties}
              className={`cb-toolbar-btn px-2.5 py-1 rounded-md text-[11px] ${
                isPropertiesOpen
                  ? "bg-white/[0.12] text-white border border-white/25 shadow-[0_0_12px_rgba(255,255,255,0.12)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Toggle Properties Panel"
            >
              <SlidersIcon size={12} className={isPropertiesOpen ? "text-cyan-300" : "text-slate-400"} />
              <span>Properties</span>
            </button>

            <button
              onClick={toggleOutput}
              className={`cb-toolbar-btn px-2.5 py-1 rounded-md text-[11px] ${
                isOutputOpen
                  ? "bg-white/[0.12] text-white border border-white/25 shadow-[0_0_12px_rgba(255,255,255,0.12)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Toggle Terminal / Output Panel"
            >
              <TerminalIcon size={12} className={isOutputOpen ? "text-cyan-300" : "text-slate-400"} />
              <span>Terminal</span>
            </button>
          </div>
        </div>

        {/* Center: Graph Stats */}
        <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-slate-400 bg-white/[0.03] px-2.5 py-1 rounded-lg border border-white/5">
          <span className="text-cyan-400 font-semibold">{Object.keys(graph.blocks).length}</span>
          <span>nodes</span>
          <span className="text-slate-600">•</span>
          <span className="text-emerald-400 font-semibold">{graph.connections.length}</span>
          <span>edges</span>
          {statusMessage && (
            <>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300 truncate max-w-xs">{statusMessage}</span>
            </>
          )}
        </div>

        {/* Right: Validation & Execution Controls */}
        <div className="flex items-center gap-2">
          {/* Validation Status Badge */}
          {validationResult && (
            <div
              className={`flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-lg border ${
                validationResult.valid
                  ? "bg-emerald-950/50 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                  : "bg-rose-950/50 text-rose-300 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.2)]"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  validationResult.valid
                    ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]"
                    : "bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.9)]"
                }`}
              />
              <span className="font-medium">
                {validationResult.valid
                  ? "Pipeline Valid"
                  : `${validationResult.errors.length} issue${validationResult.errors.length > 1 ? "s" : ""}`}
              </span>
            </div>
          )}

          {/* Validate Button */}
          <button
            onClick={handleValidate}
            disabled={isValidating}
            className="cb-toolbar-btn border border-white/10 bg-white/[0.04] hover:bg-white/10 text-[11px] px-3 py-1 rounded-lg text-slate-300 hover:text-white"
            title="Validate graph consistency, type contracts, and required parameters"
          >
            <CheckIcon size={12} className="text-cyan-400" />
            <span>{isValidating ? "Validating..." : "Validate"}</span>
          </button>

          {/* Run Pipeline Button (Emerald Glow) */}
          <button
            onClick={handleRun}
            disabled={runState === "running" || isValidating}
            className="cb-toolbar-btn--primary text-[11px] flex items-center gap-1.5 cursor-pointer shadow-lg"
            title={runState === "running" ? "Execution in progress..." : "Run Python Machine Learning Pipeline"}
          >
            <PlayIcon size={12} className="text-white" />
            <span>{isValidating ? "Validating..." : "Run Pipeline"}</span>
          </button>

          {/* Stop Button (Crimson Red Glow) */}
          <button
            onClick={handleStop}
            disabled={runState !== "running"}
            className={
              runState === "running"
                ? "cb-toolbar-btn--danger cursor-pointer animate-pulse text-[11px] flex items-center gap-1"
                : "cb-toolbar-btn text-slate-600 border border-white/5 bg-transparent cursor-not-allowed opacity-40 text-[11px]"
            }
            title="Stop running Python pipeline"
          >
            <StopIcon size={11} />
            <span>Stop</span>
          </button>

          <button
            onClick={handleReset}
            className="cb-toolbar-btn text-slate-500 hover:text-cyan-300 text-[11px] px-2"
            title="Reset to default mock pipeline"
          >
            Reset
          </button>
        </div>
      </header>
    </>
  );
}
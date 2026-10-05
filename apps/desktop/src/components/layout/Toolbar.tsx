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
  LayoutTemplateIcon,
} from "../common/Icons";

export default function Toolbar() {
  const [isValidating, setIsValidating] = useState(false);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const fileMenuRef = useRef<HTMLDivElement>(null);

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

  // Click outside to close file menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node)) {
        setIsFileMenuOpen(false);
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

  const handleFormat = () => {
    useWorkflowStore.getState().autoLayout();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("codebrix:fit-view"));
    }
  };

  const handleReset = () => {
    // Reset all palette and panel dimensions and open states to defaults
    useUiStore.getState().resetUi();

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("codebrix:fit-view"));
    }
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

          {/* Streamlined File Operations Menu */}
          <div className="flex items-center gap-1 bg-white/[0.03] p-0.5 rounded-lg border border-white/10 shrink-0" ref={fileMenuRef}>
            {/* File Menu Dropdown Trigger */}
            <div className="relative">
              <button
                onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
                className={`cb-toolbar-btn text-[11px] px-2.5 py-1 rounded-md transition-all ${
                  isFileMenuOpen ? "bg-white/15 text-white" : "text-slate-300 hover:text-white"
                }`}
                title="File & Project Menu"
              >
                <FolderIcon size={12} className="text-cyan-400" />
                <span>File</span>
                <ChevronDownIcon size={10} className="text-slate-400" />
              </button>

              {isFileMenuOpen && (
                <div className="absolute left-0 top-full mt-2 w-64 bg-[#0d1322]/98 backdrop-blur-2xl border border-white/15 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1 text-[9.5px] font-mono font-bold text-slate-400 uppercase tracking-wider border-b border-white/10">
                    Project Actions
                  </div>

                  <button
                    onClick={() => { setIsFileMenuOpen(false); handleNewProject(); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:text-white hover:bg-cyan-500/15 flex items-center justify-between transition-colors"
                  >
                    <span>New Project</span>
                    <span className="text-[10px] font-mono text-slate-500">Ctrl+N</span>
                  </button>

                  <button
                    onClick={() => { setIsFileMenuOpen(false); handleOpenProject(); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:text-white hover:bg-cyan-500/15 flex items-center justify-between transition-colors"
                  >
                    <span>Open Project...</span>
                    <span className="text-[10px] font-mono text-slate-500">Ctrl+O</span>
                  </button>

                  <button
                    onClick={() => { setIsFileMenuOpen(false); handleSaveProject(); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:text-white hover:bg-cyan-500/15 flex items-center justify-between transition-colors"
                  >
                    <span>Save Project</span>
                    <span className="text-[10px] font-mono text-slate-500">Ctrl+S</span>
                  </button>

                  <button
                    onClick={() => { setIsFileMenuOpen(false); handleSaveAsProject(); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:text-white hover:bg-cyan-500/15 transition-colors"
                  >
                    Save As...
                  </button>

                  <div className="my-1 border-t border-white/10" />

                  <div className="px-3 py-1 text-[9.5px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                    Import & Export
                  </div>

                  <button
                    onClick={() => { setIsFileMenuOpen(false); handleImportProject(); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:text-white hover:bg-cyan-500/15 transition-colors"
                  >
                    Import .cbx Project...
                  </button>

                  <button
                    onClick={() => { setIsFileMenuOpen(false); handleExportProject(); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:text-white hover:bg-cyan-500/15 transition-colors"
                  >
                    Export .cbx Project...
                  </button>

                  <button
                    onClick={() => { setIsFileMenuOpen(false); handleExportPython(); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-cyan-300 hover:text-cyan-100 hover:bg-cyan-950/40 flex items-center gap-1.5 font-mono transition-colors"
                  >
                    <CodeIcon size={12} />
                    <span>Export Python Script (.py)</span>
                  </button>

                  {recentProjects.length > 0 && (
                    <>
                      <div className="my-1 border-t border-white/10" />
                      <div className="px-3 py-1 text-[9.5px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Recent</span>
                        <span className="text-[9px] text-slate-500">{recentProjects.length}</span>
                      </div>
                      {recentProjects.slice(0, 4).map((p, i) => (
                        <button
                          key={i}
                          onClick={() => { setIsFileMenuOpen(false); handleOpenRecent(p); }}
                          className="w-full text-left px-3 py-1 text-[11px] text-slate-400 hover:text-white hover:bg-white/[0.06] font-mono truncate block transition-colors"
                          title={p}
                        >
                          {p.split(/[/\\]/).pop() || p}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Quick 1-Click Save Action */}
            <button
              onClick={handleSaveProject}
              className={`cb-toolbar-btn text-[11px] px-2.5 py-1 rounded-md transition-colors ${
                isDirty
                  ? "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30"
                  : "text-slate-300 hover:text-white"
              }`}
              title={isDirty ? "Unsaved changes! Click to save" : "Project saved"}
            >
              <SaveIcon size={12} className={isDirty ? "text-amber-400" : "text-slate-400"} />
              <span>Save</span>
              {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
            </button>
          </div>

          <div className="cb-toolbar-divider shrink-0" />

          {/* Panel View Toggles (Tactile Bento Style) */}
          <div className="flex items-center gap-1 bg-white/[0.03] p-0.5 rounded-lg border border-white/10 shrink-0">
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
        <div className="hidden xl:flex items-center gap-2 text-[11px] font-mono text-slate-400 bg-white/[0.03] px-2.5 py-1 rounded-lg border border-white/5 shrink truncate max-w-sm">
          <span className="text-cyan-400 font-semibold">{Object.keys(graph.blocks).length}</span>
          <span>nodes</span>
          <span className="text-slate-600">•</span>
          <span className="text-emerald-400 font-semibold">{graph.connections.length}</span>
          <span>edges</span>
          {statusMessage && (
            <>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300 truncate">{statusMessage}</span>
            </>
          )}
        </div>

        {/* Right: Validation & Execution Controls (Always Pinned & Shrink-Proof) */}
        <div className="flex items-center gap-1.5 shrink-0 z-30">
          {/* Validate Button (Turns Green if valid, Red if invalid) */}
          <button
            onClick={handleValidate}
            disabled={isValidating}
            className={`cb-toolbar-btn text-[11px] px-2.5 py-1 rounded-lg shrink-0 cursor-pointer flex items-center gap-1.5 transition-all ${
              validationResult?.valid === true
                ? "bg-emerald-600/30 text-emerald-200 border border-emerald-500/60 hover:bg-emerald-600/40 shadow-[0_0_10px_rgba(16,185,129,0.25)]"
                : validationResult && !validationResult.valid
                ? "bg-rose-600/30 text-rose-200 border border-rose-500/60 hover:bg-rose-600/40 shadow-[0_0_10px_rgba(244,63,94,0.25)]"
                : "border border-white/10 bg-white/[0.04] hover:bg-white/10 text-slate-200 hover:text-white"
            }`}
            title={
              validationResult?.valid === true
                ? "Workflow graph is valid (No errors found)"
                : validationResult && !validationResult.valid
                ? `Validation failed (${validationResult.errors.length} error(s))`
                : "Validate graph consistency, type contracts, and required parameters"
            }
          >
            <CheckIcon
              size={12}
              className={
                validationResult?.valid === true
                  ? "text-emerald-400"
                  : validationResult && !validationResult.valid
                  ? "text-rose-400"
                  : "text-cyan-400"
              }
            />
            <span>
              {isValidating
                ? "Validating..."
                : validationResult?.valid === true
                ? "Valid ✓"
                : validationResult && !validationResult.valid
                ? `Invalid (${validationResult.errors.length})`
                : "Validate"}
            </span>
          </button>

          {/* Download Python Script Button */}
          <button
            onClick={handleExportPython}
            className="cb-toolbar-btn border border-sky-500/30 bg-sky-950/30 hover:bg-sky-900/40 text-sky-200 hover:text-white text-[11px] px-2.5 py-1 rounded-lg shrink-0 cursor-pointer flex items-center gap-1.5 transition-colors"
            title="Download standalone executable Python script (.py)"
          >
            <CodeIcon size={12} className="text-sky-400" />
            <span>Download .py</span>
          </button>

          {/* Run Pipeline Button (Emerald Glow) */}
          <button
            onClick={handleRun}
            disabled={runState === "running" || isValidating}
            className="cb-toolbar-btn--primary text-[11px] px-3 py-1 flex items-center gap-1.5 cursor-pointer shadow-lg shrink-0"
            title={runState === "running" ? "Execution in progress..." : "Run Python Machine Learning Pipeline"}
          >
            <PlayIcon size={12} className="text-white" />
            <span>{isValidating ? "Validating..." : "Run Pipeline"}</span>
          </button>

          {/* Format / Auto-Layout Button */}
          <button
            onClick={handleFormat}
            className="cb-toolbar-btn border border-white/10 bg-white/[0.04] hover:bg-white/10 text-slate-200 hover:text-white text-[11px] px-2 py-1 rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors shrink-0"
            title="Auto-arrange all blocks from left to right as per data flow"
          >
            <LayoutTemplateIcon size={12} className="text-emerald-400" />
            <span>Format</span>
          </button>

          {/* Reset Viewport & Palettes Button */}
          <button
            onClick={handleReset}
            className="cb-toolbar-btn text-slate-400 hover:text-white text-[11px] px-2 py-1 rounded-lg border border-white/5 hover:border-white/10 bg-white/[0.02] hover:bg-white/[0.06] transition-colors shrink-0 cursor-pointer"
            title="Reset size and open state of all palettes and panels to default"
          >
            Reset
          </button>
        </div>
      </header>
    </>
  );
}
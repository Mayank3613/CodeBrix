import { useState, useEffect, useRef } from "react";
import { workflowService } from "../../services";
import { runPythonExecution, stopPythonExecution } from "../../services/tauriPythonRuntime";
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
import { PythonCodeGenerator } from "@codebrix/codegen";

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
        <div className="bg-amber-950/90 border-b border-amber-600/80 px-4 py-2 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-400">⚠️ Crash Recovery:</span>
            <span>
              Unsaved session detected from {new Date(recoverySnapshot.savedAt).toLocaleTimeString()} ({recoverySnapshot.projectName}).
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestoreRecovery}
              className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold transition-all"
            >
              Restore Session
            </button>
            <button
              onClick={dismissRecovery}
              className="px-2 py-1 rounded bg-slate-900/80 hover:bg-slate-800 text-amber-300 transition-all"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="h-12 px-5 bg-slate-900/60 backdrop-blur-md border-b border-slate-800 flex items-center justify-between shrink-0 select-none">
        {/* Left controls: Project operations + View toggles */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-slate-950/60 p-0.5 rounded-lg border border-slate-800 relative" ref={recentMenuRef}>
            <button
              onClick={handleNewProject}
              className="px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Create a new blank project"
            >
              New
            </button>
            <button
              onClick={handleOpenProject}
              className="px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Open a .cbx project file"
            >
              Open
            </button>

            {/* Recent projects dropdown */}
            <button
              onClick={() => setIsRecentOpen(!isRecentOpen)}
              className="px-1.5 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Recent projects"
            >
              ▾
            </button>

            {isRecentOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-slate-900 border border-slate-700/80 rounded-lg shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Recent Projects
                </div>
                {recentProjects.length > 0 ? (
                  <>
                    {recentProjects.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => handleOpenRecent(p)}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-indigo-600/30 font-mono truncate block"
                        title={p}
                      >
                        {p.split("/").pop() || p}
                      </button>
                    ))}
                    <div className="border-t border-slate-800 mt-1 pt-1 px-3 py-1">
                      <button
                        onClick={clearRecentProjects}
                        className="text-[10px] text-slate-500 hover:text-slate-300"
                      >
                        Clear Recent History
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="px-3 py-2 text-xs text-slate-500 italic">No recent projects</div>
                )}
              </div>
            )}

            <button
              onClick={handleSaveProject}
              className="px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors flex items-center gap-1"
              title="Save project file (.cbx)"
            >
              <span>Save</span>
              {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
            </button>
            <button
              onClick={handleSaveAsProject}
              className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
              title="Save project as a new file"
            >
              Save As
            </button>
            <button
              onClick={handleImportProject}
              className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
              title="Import .cbx project"
            >
              Import
            </button>
            <button
              onClick={handleExportProject}
              className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
              title="Export project as .cbx"
            >
              Export
            </button>
            <button
              onClick={handleExportPython}
              className="px-2 py-1 text-xs text-indigo-300 hover:text-indigo-200 hover:bg-indigo-950/60 rounded transition-colors"
              title="Export standalone Python script (.py)"
            >
              Export .py
            </button>
          </div>

          <div className="w-px h-4 bg-slate-800 mx-1" />

          <button
            onClick={togglePalette}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              isPaletteOpen
                ? "bg-slate-800 text-white font-medium"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {isPaletteOpen ? "Hide Palette" : "Show Palette"}
          </button>

          <button
            onClick={toggleProperties}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              isPropertiesOpen
                ? "bg-slate-800 text-white font-medium"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {isPropertiesOpen ? "Hide Properties" : "Show Properties"}
          </button>

          <div className="w-px h-4 bg-slate-800 mx-1" />
          <span className="text-[11px] text-slate-500 font-mono">
            Nodes: {Object.keys(graph.blocks).length} | Edges: {graph.connections.length}
          </span>
        </div>

        {/* Right controls: Validation & Execution */}
        <div className="flex items-center gap-3">
          {/* Status Message */}
          {statusMessage && (
            <span className="text-[11px] font-mono text-indigo-300 truncate max-w-xs">
              {statusMessage}
            </span>
          )}

          {/* Validation Status Indicator */}
          {validationResult && (
            <div
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border ${
                validationResult.valid
                  ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/60"
                  : "bg-rose-950/40 text-rose-300 border-rose-800/60"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  validationResult.valid ? "bg-emerald-400" : "bg-rose-400"
                }`}
              />
              <span>
                {validationResult.valid
                  ? "Graph Valid"
                  : `${validationResult.errors.length} issue(s)`}
              </span>
            </div>
          )}

          <button
            onClick={handleValidate}
            disabled={isValidating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all border border-slate-700/80 rounded-lg disabled:opacity-50"
          >
            <span>✓</span>
            <span>{isValidating ? "Validating..." : "Validate Graph"}</span>
          </button>

          {/* Run Pipeline Button */}
          <button
            onClick={handleRun}
            disabled={runState === "running" || isValidating}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              runState === "running" || isValidating
                ? "bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-50"
                : "text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-95 shadow-md shadow-emerald-600/20 cursor-pointer"
            }`}
            title={runState === "running" ? "Pipeline execution is in progress" : "Execute Python workflow"}
          >
            <span>▶</span>
            <span>{isValidating ? "Validating..." : "Run Pipeline"}</span>
          </button>

          {/* Stop Execution Button */}
          <button
            onClick={handleStop}
            disabled={runState !== "running"}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              runState === "running"
                ? "text-white bg-rose-600 hover:bg-rose-500 active:scale-95 shadow-md shadow-rose-600/30 animate-pulse cursor-pointer"
                : "bg-slate-900/60 text-slate-600 border border-slate-800/80 cursor-not-allowed opacity-40"
            }`}
            title={runState === "running" ? "Stop active Python execution" : "No active execution running"}
          >
            <span>■</span>
            <span>Stop</span>
          </button>

          <button
            onClick={handleReset}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors rounded-lg"
            title="Reset to default Iris mock pipeline"
          >
            Reset
          </button>
        </div>
      </div>
    </>
  );
}
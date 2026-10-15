import { useState, useEffect, useRef } from "react";
import { CONTRACT_VERSION } from "@codebrix/shared";
import { workflowService } from "../../services";
import {
  useWorkflowStore,
  useValidationStore,
  useProjectStore,
  useUiStore,
} from "../../stores";
import { PIPELINE_TEMPLATES, type PipelineTemplate } from "../../templates/pipelineTemplates";
import { autoLayoutGraphLeftToRight } from "../../canvas/layout";
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
import RunSplitButton from "./RunSplitButton";
import Tooltip from "../common/Tooltip";
import {
  Folder,
  Save,
  Download,
  RotateCcw,
  MoreHorizontal,
  ChevronDown,
  AlertCircle,
  FilePlus,
  FileUp,
  FileDown,
  Code,
  ExternalLink,
} from "lucide-react";

export default function Header() {
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const [isExamplesMenuOpen, setIsExamplesMenuOpen] = useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);

  const fileMenuRef = useRef<HTMLDivElement>(null);
  const examplesMenuRef = useRef<HTMLDivElement>(null);
  const overflowMenuRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const graph = useWorkflowStore((s) => s.graph);
  const setGraph = useWorkflowStore((s) => s.setGraph);
  const clearWorkflow = useWorkflowStore((s) => s.clearWorkflow);

  const setValidationResult = useValidationStore((s) => s.setValidationResult);
  const validationResult = useValidationStore((s) => s.validationResult);
  const focusBlock = useUiStore((s) => s.focusBlock);

  const projectName = useProjectStore((s) => s.projectName);
  const setProjectName = useProjectStore((s) => s.setProjectName);
  const currentFilePath = useProjectStore((s) => s.currentFilePath);
  const setCurrentFilePath = useProjectStore((s) => s.setCurrentFilePath);
  const isDirty = useProjectStore((s) => s.isDirty);
  const markDirty = useProjectStore((s) => s.markDirty);
  const resetProject = useProjectStore((s) => s.resetProject);
  const recentProjects = useProjectStore((s) => s.recentProjects);
  const recoverySnapshot = useProjectStore((s) => s.recoverySnapshot);
  const checkRecovery = useProjectStore((s) => s.checkRecovery);
  const dismissRecovery = useProjectStore((s) => s.dismissRecovery);

  const [tempProjectName, setTempProjectName] = useState(projectName);

  const errors = validationResult?.errors || [];

  useEffect(() => {
    setTempProjectName(projectName);
  }, [projectName]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Check recovery snapshot & periodic autosave
  useEffect(() => {
    checkRecovery();
    const timer = setInterval(() => {
      if (useProjectStore.getState().isDirty) {
        performAutosave();
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [checkRecovery]);

  // Click outside to close menus
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (fileMenuRef.current && !fileMenuRef.current.contains(target)) {
        setIsFileMenuOpen(false);
      }
      if (examplesMenuRef.current && !examplesMenuRef.current.contains(target)) {
        setIsExamplesMenuOpen(false);
      }
      if (overflowMenuRef.current && !overflowMenuRef.current.contains(target)) {
        setIsOverflowOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + S to save
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSaveProject();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [graph, projectName, currentFilePath]);

  const handleNameSave = () => {
    const trimmed = tempProjectName.trim();
    if (trimmed && trimmed !== projectName) {
      setProjectName(trimmed);
      markDirty(true);
    } else {
      setTempProjectName(projectName);
    }
    setIsEditingName(false);
  };

  const handleNewProject = () => {
    if (isDirty && !window.confirm("You have unsaved changes. Create a new project anyway?")) {
      return;
    }
    clearWorkflow();
    resetProject();
    setValidationResult(null);
  };

  const handleOpenProject = async () => {
    const res = await openProjectFileDialog();
    if (!res) return;

    const parsed = parseCbxProject(res.content);
    if (!parsed.success || !parsed.project) {
      alert(`Failed to load .cbx project:\n${parsed.error}`);
      return;
    }

    setGraph(parsed.project.graph);
    setProjectName(parsed.project.graph.name || "Untitled Project");
    if (res.path) setCurrentFilePath(res.path);
    markDirty(false);
    setValidationResult(null);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("codebrix:fit-view"));
    }
  };

  const handleSaveProject = async () => {
    const json = serializeCbxProject(graph);
    const defaultFilename = `${projectName.toLowerCase().replace(/[^a-z0-9_-]/g, "-")}.cbx`;
    const res = await saveProjectFileDialog(json, defaultFilename);
    if (res.success) {
      if (res.path) setCurrentFilePath(res.path);
      markDirty(false);
    }
  };

  const handleSaveAsProject = async () => {
    const json = serializeCbxProject(graph);
    const defaultFilename = `${projectName.toLowerCase().replace(/[^a-z0-9_-]/g, "-")}-copy.cbx`;
    const res = await saveProjectFileDialog(json, defaultFilename);
    if (res.success) {
      if (res.path) setCurrentFilePath(res.path);
      markDirty(false);
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
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("codebrix:fit-view"));
    }
  };

  const handleExportProject = async () => {
    const json = serializeCbxProject(graph);
    const defaultFilename = `${projectName.toLowerCase().replace(/[^a-z0-9_-]/g, "-")}.cbx`;
    await saveProjectFileDialog(json, defaultFilename);
  };

  const handleExportPython = async () => {
    try {
      const pyCode = "generatePythonScript" in workflowService
        ? await (workflowService as any).generatePythonScript(graph)
        : "";
      const defaultFilename = `${projectName.toLowerCase().replace(/[^a-z0-9_-]/g, "_")}.py`;
      const res = await saveProjectFileDialog(pyCode, defaultFilename);
      if (res.success) {
        useProjectStore.getState().markDirty(false);
      }
    } catch (err) {
      console.error("Export Python failed:", err);
      alert(`Export Python failed: ${(err as Error).message}`);
    }
  };

  const handleOpenRecent = async (path: string) => {
    try {
      const content = await readProjectFile(path);
      const parsed = parseCbxProject(content);
      if (parsed.success && parsed.project) {
        setGraph(parsed.project.graph);
        setProjectName(parsed.project.graph.name || "Untitled Project");
        setCurrentFilePath(path);
        markDirty(false);
        setValidationResult(null);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("codebrix:fit-view"));
        }
      } else {
        alert("Could not load recent project file.");
      }
    } catch (err) {
      alert(`Error reading project: ${(err as Error).message}`);
    }
  };

  const handleLoadTemplate = (tpl: PipelineTemplate) => {
    if (
      Object.keys(graph.blocks).length > 0 &&
      !window.confirm(`Load "${tpl.title}" template? Current workflow will be replaced.`)
    ) {
      return;
    }
    const normalizedConnections = (tpl.graph.connections || []).map((c: any) => ({
      id: c.id,
      sourceBlockId: c.sourceBlockId ?? c.fromBlockId,
      sourcePortId: c.sourcePortId ?? c.fromPortId,
      targetBlockId: c.targetBlockId ?? c.toBlockId,
      targetPortId: c.targetPortId ?? c.toPortId,
    }));
    const newPositions = autoLayoutGraphLeftToRight({
      ...tpl.graph,
      connections: normalizedConnections,
    });
    const layoutedBlocks = { ...tpl.graph.blocks };
    for (const [id, pos] of Object.entries(newPositions)) {
      if (layoutedBlocks[id]) {
        layoutedBlocks[id] = {
          ...layoutedBlocks[id],
          position: pos,
        };
      }
    }
    setGraph({
      ...tpl.graph,
      blocks: layoutedBlocks,
      connections: normalizedConnections,
    });
    setProjectName(tpl.title);
    markDirty(true);
    setValidationResult(null);
    if (typeof window !== "undefined") {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("codebrix:fit-view"));
      }, 50);
    }
  };

  const handleFocusErrors = () => {
    if (errors.length > 0 && errors[0]?.blockId) {
      focusBlock(errors[0].blockId);
    } else {
      if (!useUiStore.getState().isPropertiesOpen) {
        useUiStore.getState().toggleProperties();
      }
    }
  };

  const handleResetPanels = () => {
    useUiStore.getState().resetUi();
  };

  const handleRestoreRecovery = () => {
    if (!recoverySnapshot) return;
    const restored = restoreFromRecoverySnapshot(recoverySnapshot);
    setGraph(restored.graph);
    setProjectName(restored.graph.name || recoverySnapshot.projectName || "Restored Project");
    if (recoverySnapshot.currentFilePath) {
      setCurrentFilePath(recoverySnapshot.currentFilePath);
    }
    markDirty(true);
    dismissRecovery();
    if (typeof window !== "undefined") {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("codebrix:fit-view"));
      }, 50);
    }
  };

  const handleHeaderDoubleClick = async (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, input, select, a, [data-no-drag]")) {
      return;
    }
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      await win.toggleMaximize();
    } catch (err) {
      console.debug("Tauri toggleMaximize not available:", err);
    }
  };

  const isMac =
    typeof navigator !== "undefined" &&
    (navigator.platform?.toLowerCase().includes("mac") ||
      navigator.userAgent?.toLowerCase().includes("mac"));

  return (
    <>
      {/* Recovery Banner - Floating toast below header so header remains at y=0 */}
      {recoverySnapshot && (
        <div className="fixed top-12 right-4 z-50 px-3 py-1.5 bg-amber-950/95 border border-amber-700/80 rounded-lg shadow-xl text-[11px] text-amber-200 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-amber-400">Unsaved Session:</span>
            <span>Autosave snapshot from {new Date(recoverySnapshot.savedAt).toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleRestoreRecovery}
              className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-semibold text-[10px] cursor-pointer"
            >
              Restore
            </button>
            <button
              onClick={() => dismissRecovery()}
              className="text-amber-400 hover:text-white text-[10px] cursor-pointer px-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ─── Merged 44px Titlebar & Header (True 3-Column Grid) ─── */}
      <header
        data-tauri-drag-region
        onDoubleClick={handleHeaderDoubleClick}
        className="h-[44px] grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-0 bg-[var(--cb-elevation-panel)] border-b border-[var(--cb-border-subtle)] select-none z-40 shrink-0 w-full"
        style={{
          height: "44px",
          gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
        }}
      >
        {/* ── Left Zone: Logo + Menus (68px left padding on macOS for traffic lights) ── */}
        <div className={`flex items-center gap-2 min-w-0 ${isMac ? "pl-[68px]" : "pl-3"}`}>
          {/* CB Brand Icon (20px) */}
          <div
            className="w-5 h-5 rounded-[6px] bg-[var(--cb-accent)] flex items-center justify-center font-mono font-bold text-[10px] text-black tracking-tight shrink-0 shadow-sm"
            title={`CodeBrix v${CONTRACT_VERSION}`}
          >
            CB
          </div>

          {/* File Menu */}
          <div className="relative" ref={fileMenuRef} data-no-drag>
            <button
              onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
              className={`h-7 px-2.5 rounded-[6px] text-[13px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                isFileMenuOpen
                  ? "bg-white/15 text-white"
                  : "text-[var(--cb-text-secondary)] hover:text-white hover:bg-white/10"
              }`}
            >
              <span>File</span>
              <ChevronDown size={12} className="text-[var(--cb-text-muted)]" />
            </button>

            {isFileMenuOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-56 bg-[var(--cb-elevation-overlay)] border border-[var(--cb-border-strong)] rounded-[6px] shadow-[var(--cb-shadow-overlay)] py-1 z-50 text-[12px] animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => { setIsFileMenuOpen(false); handleNewProject(); }}
                  className="w-full text-left px-3 py-1.5 text-[var(--cb-text-primary)] hover:bg-white/10 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FilePlus size={13} className="text-slate-400" />
                    <span>New Project</span>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--cb-text-muted)]">⌘N</span>
                </button>

                <button
                  onClick={() => { setIsFileMenuOpen(false); handleOpenProject(); }}
                  className="w-full text-left px-3 py-1.5 text-[var(--cb-text-primary)] hover:bg-white/10 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Folder size={13} className="text-slate-400" />
                    <span>Open Project...</span>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--cb-text-muted)]">⌘O</span>
                </button>

                <button
                  onClick={() => { setIsFileMenuOpen(false); handleSaveProject(); }}
                  className="w-full text-left px-3 py-1.5 text-[var(--cb-text-primary)] hover:bg-white/10 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Save size={13} className="text-slate-400" />
                    <span>Save Project</span>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--cb-text-muted)]">⌘S</span>
                </button>

                <button
                  onClick={() => { setIsFileMenuOpen(false); handleSaveAsProject(); }}
                  className="w-full text-left px-3 py-1.5 text-[var(--cb-text-primary)] hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                >
                  <Save size={13} className="text-transparent" />
                  <span>Save As...</span>
                </button>

                <div className="my-1 border-t border-[var(--cb-border-subtle)]" />

                <button
                  onClick={() => { setIsFileMenuOpen(false); handleImportProject(); }}
                  className="w-full text-left px-3 py-1.5 text-[var(--cb-text-primary)] hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                >
                  <FileUp size={13} className="text-slate-400" />
                  <span>Import .cbx Project...</span>
                </button>

                <button
                  onClick={() => { setIsFileMenuOpen(false); handleExportProject(); }}
                  className="w-full text-left px-3 py-1.5 text-[var(--cb-text-primary)] hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                >
                  <FileDown size={13} className="text-slate-400" />
                  <span>Export .cbx Project...</span>
                </button>

                <button
                  onClick={() => { setIsFileMenuOpen(false); handleExportPython(); }}
                  className="w-full text-left px-3 py-1.5 text-cyan-300 hover:bg-cyan-500/15 flex items-center gap-2 cursor-pointer"
                >
                  <Code size={13} className="text-cyan-400" />
                  <span>Export Python Script (.py)</span>
                </button>

                {recentProjects.length > 0 && (
                  <>
                    <div className="my-1 border-t border-[var(--cb-border-subtle)]" />
                    <div className="px-3 py-1 text-[10px] font-mono text-[var(--cb-text-muted)] uppercase tracking-wider">
                      Recent Projects
                    </div>
                    {recentProjects.slice(0, 4).map((p, i) => (
                      <button
                        key={i}
                        onClick={() => { setIsFileMenuOpen(false); handleOpenRecent(p); }}
                        className="w-full text-left px-3 py-1 text-[11px] text-[var(--cb-text-secondary)] hover:text-white hover:bg-white/10 font-mono truncate block cursor-pointer"
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

          {/* Examples Menu */}
          <div className="relative" ref={examplesMenuRef} data-no-drag>
            <button
              onClick={() => setIsExamplesMenuOpen(!isExamplesMenuOpen)}
              className={`h-7 px-2.5 rounded-[6px] text-[13px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                isExamplesMenuOpen
                  ? "bg-white/15 text-white"
                  : "text-[var(--cb-text-secondary)] hover:text-white hover:bg-white/10"
              }`}
            >
              <span>Examples</span>
              <ChevronDown size={12} className="text-[var(--cb-text-muted)]" />
            </button>

            {isExamplesMenuOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-[var(--cb-elevation-overlay)] border border-[var(--cb-border-strong)] rounded-[6px] shadow-[var(--cb-shadow-overlay)] py-1.5 z-50 text-[12px] animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[10px] font-mono text-[var(--cb-text-muted)] uppercase tracking-wider">
                  Bundled ML Blueprints
                </div>
                <div className="space-y-0.5">
                  {PIPELINE_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => { setIsExamplesMenuOpen(false); handleLoadTemplate(tpl); }}
                      className="w-full text-left px-3 py-1.5 hover:bg-white/10 transition-colors block cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{tpl.title}</span>
                        <span className="text-[10px] font-mono text-[var(--cb-text-muted)]">
                          {tpl.nodeCount} nodes
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--cb-text-muted)] line-clamp-1">
                        {tpl.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Center Zone: True Center Project Name with Unsaved Dot ── */}
        <div
          data-tauri-drag-region
          className="justify-self-center flex items-center justify-center max-w-[40vw] truncate"
        >
          {isEditingName ? (
            <input
              ref={nameInputRef}
              data-no-drag
              type="text"
              value={tempProjectName}
              onChange={(e) => setTempProjectName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameSave();
                if (e.key === "Escape") {
                  setTempProjectName(projectName);
                  setIsEditingName(false);
                }
              }}
              className="h-7 px-2 bg-black/60 border border-[var(--cb-accent)] rounded-[6px] text-[13px] font-medium text-white outline-none w-44 font-sans text-center"
            />
          ) : (
            <button
              data-no-drag
              onClick={() => setIsEditingName(true)}
              className="h-7 px-2.5 max-w-full truncate rounded-[6px] hover:bg-white/10 text-[13px] font-medium text-[var(--cb-text-primary)] flex items-center gap-2 transition-colors cursor-text group"
              title="Click to rename project"
            >
              <span className="truncate">{projectName}</span>
              {isDirty && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
                  title="Unsaved changes"
                />
              )}
            </button>
          )}
        </div>

        {/* ── Right Zone: Save + Download .py + Run + Overflow ── */}
        <div className="justify-self-end flex items-center gap-2 shrink-0 pr-3" data-no-drag>
          {/* Validation Error Badge (shown ONLY when errors exist) */}
          {errors.length > 0 && (
            <button
              onClick={handleFocusErrors}
              className="h-7 px-2 rounded-[6px] bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[12px] font-medium flex items-center gap-1.5 cursor-pointer hover:bg-rose-500/25 transition-colors"
              title={`${errors.length} validation issues - click to view`}
            >
              <AlertCircle size={14} className="text-rose-400" />
              <span>{errors.length} {errors.length === 1 ? "error" : "errors"}</span>
            </button>
          )}

          {/* Save Ghost Button */}
          <button
            onClick={handleSaveProject}
            className="h-7 px-2.5 rounded-[6px] text-[13px] font-medium text-[var(--cb-text-secondary)] hover:text-white hover:bg-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Save Project (⌘S)"
          >
            <Save size={16} className="text-[var(--cb-text-muted)]" />
            <span className="hidden sm:inline">Save</span>
          </button>

          {/* Download .py Icon Button with Tooltip */}
          <Tooltip content="Export standalone .py script" shortcut="⌥⌘E" side="bottom">
            <button
              onClick={handleExportPython}
              className="h-7 w-7 rounded-[6px] text-[var(--cb-text-secondary)] hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Download Python script"
            >
              <Download size={16} />
            </button>
          </Tooltip>

          {/* Run Split-Button (the ONLY filled button) */}
          <RunSplitButton />

          {/* Overflow Menu ("⋯") */}
          <div className="relative" ref={overflowMenuRef}>
            <button
              onClick={() => setIsOverflowOpen(!isOverflowOpen)}
              className="h-7 w-7 rounded-[6px] text-[var(--cb-text-secondary)] hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
              title="More actions"
              aria-label="More actions"
            >
              <MoreHorizontal size={16} />
            </button>

            {isOverflowOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-[var(--cb-elevation-overlay)] border border-[var(--cb-border-strong)] rounded-[6px] shadow-[var(--cb-shadow-overlay)] py-1 z-50 text-[12px] animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => { setIsOverflowOpen(false); handleExportPython(); }}
                  className="w-full text-left px-3 py-1.5 text-[var(--cb-text-primary)] hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                >
                  <Code size={13} className="text-slate-400" />
                  <span>Download .py</span>
                </button>

                <button
                  onClick={() => { setIsOverflowOpen(false); handleResetPanels(); }}
                  className="w-full text-left px-3 py-1.5 text-[var(--cb-text-primary)] hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw size={13} className="text-slate-400" />
                  <span>Reset Workspace Panels</span>
                </button>

                <div className="my-1 border-t border-[var(--cb-border-subtle)]" />

                <a
                  href="https://github.com/Mayank3613/CodeBrix"
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setIsOverflowOpen(false)}
                  className="w-full text-left px-3 py-1.5 text-[var(--cb-text-secondary)] hover:text-white hover:bg-white/10 flex items-center justify-between"
                >
                  <span>CodeBrix Docs</span>
                  <ExternalLink size={11} className="text-[var(--cb-text-muted)]" />
                </a>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
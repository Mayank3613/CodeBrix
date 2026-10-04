import { useState, useCallback, useEffect, useRef } from "react";
import { useExecutionStore, useUiStore, type OutputTab } from "../../stores";
import { outputRendererRegistry } from "./registry";
import "./renderers"; // Ensure standard renderers are registered

interface TabConfig {
  id: OutputTab;
  label: string;
  rendererType: string;
}

const TABS: TabConfig[] = [
  { id: "metrics", label: "Metrics", rendererType: "metrics" },
  { id: "console", label: "Console", rendererType: "console" },
  { id: "table", label: "Tables", rendererType: "table" },
  { id: "image", label: "Images", rendererType: "image" },
  { id: "plots", label: "Plots", rendererType: "plotly" },
];

export default function OutputPanel() {
  const isOutputOpen = useUiStore((s) => s.isOutputOpen);
  const toggleOutput = useUiStore((s) => s.toggleOutput);
  const activeTab = useUiStore((s) => s.activeOutputTab);
  const setActiveTab = useUiStore((s) => s.setActiveOutputTab);
  const panelHeight = useUiStore((s) => s.outputPanelHeight);
  const setPanelHeight = useUiStore((s) => s.setOutputPanelHeight);

  const runState = useExecutionStore((s) => s.runState);
  const result = useExecutionStore((s) => s.latestResult);
  const statusMessage = useExecutionStore((s) => s.statusMessage);
  const outputs = useExecutionStore((s) => s.outputs);
  const clearOutputs = useExecutionStore((s) => s.clearOutputs);

  const [isMaximized, setIsMaximized] = useState(false);
  const [previousHeight, setPreviousHeight] = useState(panelHeight);
  const [isDragging, setIsDragging] = useState(false);

  const dragStartY = useRef(0);
  const dragStartHeight = useRef(panelHeight);

  // Resize handler on mousedown
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      dragStartY.current = e.clientY;
      dragStartHeight.current = panelHeight;
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
    },
    [panelHeight]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = dragStartY.current - e.clientY;
      const nextHeight = Math.max(
        150,
        Math.min(window.innerHeight - 100, dragStartHeight.current + deltaY)
      );
      setPanelHeight(nextHeight);
      if (isMaximized) setIsMaximized(false);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isMaximized, setPanelHeight]);

  const toggleMaximize = useCallback(() => {
    if (isMaximized) {
      setPanelHeight(previousHeight);
      setIsMaximized(false);
    } else {
      setPreviousHeight(panelHeight);
      setPanelHeight(Math.round(window.innerHeight * 0.65));
      setIsMaximized(true);
    }
  }, [isMaximized, panelHeight, previousHeight, setPanelHeight]);

  if (!isOutputOpen) {
    return (
      <aside
        aria-label="Output Notebook"
        className="h-8 bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-between shrink-0 select-none"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400">Output Notebook</span>
          {runState === "running" && (
            <span className="flex items-center gap-1.5 text-xs text-amber-400 font-mono animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Running...
            </span>
          )}
          {result && (
            <span
              className={`text-xs font-mono ${
                result.status === "success" ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              [{result.status === "success" ? "✓" : "✗"} {result.status}]
            </span>
          )}
        </div>
        <button
          onClick={toggleOutput}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-mono flex items-center gap-1 cursor-pointer"
        >
          <span>▲</span>
          <span>Expand Output</span>
        </button>
      </aside>
    );
  }

  const liveOutputs = outputs.length > 0 ? outputs : result?.outputs || [];

  // Map backward compatible "visuals" tab to "plots"
  const normalizedActiveTab: OutputTab = activeTab === "visuals" ? "plots" : activeTab;

  const currentTabConfig =
    TABS.find((t) => t.id === normalizedActiveTab) || TABS[0]!;

  const RendererComponent = outputRendererRegistry.getRenderer(
    currentTabConfig.rendererType
  );

  const getTabCount = (tab: TabConfig): number => {
    switch (tab.id) {
      case "console":
        return liveOutputs.filter((o) => o.type === "console" || o.type === "error").length;
      case "table":
        return liveOutputs.filter((o) => o.type === "table").length;
      case "metrics":
        return liveOutputs.filter((o) => o.type === "metrics").length;
      case "image":
        return liveOutputs.filter(
          (o) =>
            o.type === "image" &&
            (o.format === "png" || o.format === "svg" || o.format === "base64")
        ).length;
      case "plots":
      case "visuals":
        return liveOutputs.filter(
          (o) =>
            (o.type === "image" &&
              (o.format === "plotly" ||
                o.format === "confusion_matrix" ||
                o.format === "feature_importance")) ||
            (o.type === "metrics" &&
              (Array.isArray(o.metrics["matrix"]) ||
                Array.isArray(o.metrics["confusion_matrix"])))
        ).length;
      default:
        return 0;
     }
  };

  const consoleLogs = liveOutputs.filter((o) => o.type === "console" || o.type === "error");
  const errorCount = consoleLogs.filter(
    (l) => l.type === "error" || (l.type === "console" && l.stream === "stderr")
  ).length;

  return (
    <footer
      aria-label="Output Notebook"
      style={{ height: `${panelHeight}px` }}
      className={`bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex flex-col shrink-0 overflow-hidden relative select-none transition-height ${
        isDragging ? "transition-none" : "duration-75"
      }`}
    >
      {/* Interactive Top Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={toggleMaximize}
        className="h-2 w-full bg-slate-900/80 hover:bg-indigo-500/60 active:bg-indigo-400 cursor-row-resize transition-colors flex items-center justify-center group select-none shrink-0 border-t border-slate-700/60"
        title="Drag up/down to resize output panel. Double-click to maximize."
      >
        <div className="w-14 h-1 bg-slate-600 group-hover:bg-indigo-200 group-active:bg-white rounded-full transition-colors" />
      </div>

      {/* Header Bar */}
      <div className="h-9 px-4 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between shrink-0">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1">
          {TABS.map((tab) => {
            const count = getTabCount(tab);
            const isActive = normalizedActiveTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? "bg-slate-900 text-indigo-300 border-t-2 border-indigo-400 font-semibold shadow-inner"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <span>{tab.label}</span>
                {tab.id === "console" && errorCount > 0 ? (
                  <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-300 text-[10px] rounded-full border border-rose-500/40 font-mono">
                    {errorCount} err
                  </span>
                ) : count > 0 ? (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive
                        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Status, Duration, Exit Code & Actions */}
        <div className="flex items-center gap-3 text-xs font-mono">
          {runState === "running" ? (
            <span className="text-amber-400 flex items-center gap-1.5 animate-pulse truncate max-w-md font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              {statusMessage || "Executing Python subprocess..."}
            </span>
          ) : result ? (
            <div className="flex items-center gap-3 text-slate-400">
              <span
                className={`font-semibold flex items-center gap-1 ${
                  result.status === "success" ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {result.status === "success" ? "✓" : "✗"} {result.status}
              </span>
              {typeof result.durationMs === "number" && (
                <span>{result.durationMs}ms</span>
              )}
              {typeof result.exitCode === "number" && (
                <span className="text-slate-500">exit: {result.exitCode}</span>
              )}
            </div>
          ) : (
            <span className="text-slate-500 italic">No runs executed yet</span>
          )}

          <div className="w-px h-3.5 bg-slate-800 mx-0.5" />

          {liveOutputs.length > 0 && (
            <button
              onClick={clearOutputs}
              className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="Clear all outputs"
            >
              Clear
            </button>
          )}

          {/* Maximize / Restore Button */}
          <button
            onClick={toggleMaximize}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors text-xs cursor-pointer"
            title={isMaximized ? "Restore size" : "Maximize output panel"}
          >
            {isMaximized ? "❐" : "🗖"}
          </button>

          {/* Collapse Button */}
          <button
            onClick={toggleOutput}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors text-xs cursor-pointer"
            title="Collapse output panel"
          >
            ▼
          </button>
        </div>
      </div>

      {/* Content Area Host */}
      <div className="flex-1 p-4 overflow-auto font-mono text-xs select-text">
        {RendererComponent ? (
          <RendererComponent
            messages={liveOutputs}
            latestMessage={liveOutputs[liveOutputs.length - 1]}
            executionResult={result}
            runState={runState}
            statusMessage={statusMessage}
            onClear={clearOutputs}
          />
        ) : (
          <div className="text-slate-500 text-center py-8 font-mono text-xs">
            No renderer registered for channel "{currentTabConfig.rendererType}".
          </div>
        )}
      </div>
    </footer>
  );
}

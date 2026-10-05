import { useState, useCallback } from "react";
import { useExecutionStore, useUiStore, type OutputTab } from "../../stores";
import { outputRendererRegistry } from "./registry";
import "./renderers"; // Ensure standard renderers are registered
import {
  MaximizeIcon,
  MinimizeIcon,
  CloseIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  TerminalIcon,
} from "../../components/common/Icons";

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

  if (!isOutputOpen) return null;

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
      className="w-full h-full flex flex-col overflow-hidden select-none"
    >
      {/* Header Bar */}
      <div className="h-9 px-3 bg-white/[0.02] border-b border-white/10 flex items-center justify-between shrink-0">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 pr-2.5 border-r border-white/10 text-slate-400">
            <TerminalIcon size={12} className="text-cyan-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-200">
              Terminal
            </span>
          </div>

          {TABS.map((tab) => {
            const count = getTabCount(tab);
            const isActive = normalizedActiveTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-1 text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? "bg-white/[0.12] text-white font-semibold border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]"
                }`}
              >
                <span>{tab.label}</span>
                {tab.id === "console" && errorCount > 0 ? (
                  <span className="px-1.5 py-0.2 bg-rose-500/25 text-rose-300 text-[9px] rounded-full border border-rose-500/40 font-mono font-bold shadow-[0_0_6px_rgba(244,63,94,0.3)]">
                    {errorCount}
                  </span>
                ) : count > 0 ? (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                      isActive
                        ? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/40 font-bold"
                        : "bg-white/[0.06] text-slate-400 border border-white/5"
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
        <div className="flex items-center gap-2.5 text-xs font-mono">
          {runState === "running" ? (
            <span className="text-cyan-400 flex items-center gap-1.5 animate-pulse truncate max-w-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.9)] shrink-0" />
              {statusMessage || "Running Python execution..."}
            </span>
          ) : result ? (
            <div className="flex items-center gap-2 text-slate-400 text-[11px]">
              <span
                className={`font-semibold flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${
                  result.status === "success"
                    ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                    : "bg-rose-950/60 text-rose-300 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.2)]"
                }`}
              >
                {result.status === "success" ? (
                  <CheckCircleIcon size={12} className="text-emerald-400" />
                ) : (
                  <AlertCircleIcon size={12} className="text-rose-400" />
                )}
                <span className="capitalize">{result.status}</span>
              </span>
              {typeof result.durationMs === "number" && (
                <span className="text-slate-500">{result.durationMs}ms</span>
              )}
              {typeof result.exitCode === "number" && (
                <span className="text-slate-500">exit:{result.exitCode}</span>
              )}
            </div>
          ) : (
            <span className="text-slate-500 text-[11px] italic">Ready</span>
          )}

          <div className="w-px h-3 bg-white/10 mx-0.5" />

          {liveOutputs.length > 0 && (
            <button
              onClick={clearOutputs}
              className="text-[10px] text-slate-400 hover:text-rose-300 transition-colors px-2 py-0.5 rounded-lg hover:bg-white/10 cursor-pointer"
              title="Clear outputs"
            >
              Clear
            </button>
          )}

          {/* Maximize / Restore Button */}
          <button
            onClick={toggleMaximize}
            className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? <MinimizeIcon size={12} /> : <MaximizeIcon size={12} />}
          </button>

          {/* Collapse Button */}
          <button
            onClick={toggleOutput}
            className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Close Terminal"
          >
            <CloseIcon size={12} />
          </button>
        </div>
      </div>

      {/* Content Area Host */}
      <div className="flex-1 p-3 overflow-auto font-mono text-xs select-text bg-transparent">
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
          <div className="text-slate-500 text-center py-6 font-mono text-xs">
            No renderer registered for channel "{currentTabConfig.rendererType}".
          </div>
        )}
      </div>
    </footer>
  );
}

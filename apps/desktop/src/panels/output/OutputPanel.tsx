import { useState, useCallback } from "react";
import { useExecutionStore, useUiStore, type OutputTab } from "../../stores";
import { outputRendererRegistry } from "./registry";
import "./renderers"; // Ensure standard renderers are registered
import { getPlotsTabCount, getImagesTabCount } from "./outputClassification";
import {
  Terminal,
  Table as TableIcon,
  LineChart,
  Activity,
  Image as ImageIcon,
  Copy,
  Trash2,
  Maximize2,
  Minimize2,
  X,
  Check,
  Loader2,
} from "lucide-react";

interface TabConfig {
  id: OutputTab;
  label: string;
  icon: typeof Terminal;
  rendererType: string;
  emptyIcon: typeof Terminal;
  emptyTitle: string;
  emptyDesc: string;
}

const TABS: TabConfig[] = [
  {
    id: "console",
    label: "Console",
    icon: Terminal,
    rendererType: "console",
    emptyIcon: Terminal,
    emptyTitle: "Console Output Ready",
    emptyDesc: "Standard output, logs, and interactive commands will appear here.",
  },
  {
    id: "table",
    label: "Tables",
    icon: TableIcon,
    rendererType: "table",
    emptyIcon: TableIcon,
    emptyTitle: "No Tabular Data",
    emptyDesc: "Dataframe head/tail tables and CSV outputs will be rendered here.",
  },
  {
    id: "plots",
    label: "Plots",
    icon: LineChart,
    rendererType: "plotly",
    emptyIcon: LineChart,
    emptyTitle: "No Charts Generated",
    emptyDesc: "Interactive Plotly and Matplotlib figures will be displayed here.",
  },
  {
    id: "metrics",
    label: "Metrics",
    icon: Activity,
    rendererType: "metrics",
    emptyIcon: Activity,
    emptyTitle: "No Metrics Computed",
    emptyDesc: "Model accuracy, precision, recall, and loss metrics will show here.",
  },
  {
    id: "image",
    label: "Images",
    icon: ImageIcon,
    rendererType: "image",
    emptyIcon: ImageIcon,
    emptyTitle: "No Rendered Images",
    emptyDesc: "Confusion matrix heatmaps and saved figures will appear here.",
  },
];

function formatRunDuration(result: { durationMs?: number | null; startedAt?: string | number; completedAt?: string | number } | null | undefined): string | null {
  if (!result) return null;
  let ms = result.durationMs;
  if (typeof ms !== "number" || Number.isNaN(ms)) {
    if (result.startedAt && result.completedAt) {
      const start = new Date(result.startedAt).getTime();
      const end = new Date(result.completedAt).getTime();
      if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
        ms = end - start;
      }
    }
  }
  if (typeof ms !== "number" || Number.isNaN(ms) || ms < 0) {
    return null;
  }
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

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
  const [copied, setCopied] = useState(false);

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

  const handleCopyLogs = useCallback(() => {
    const textLogs = outputs
      .map((o) => {
        if (o.type === "console") return o.text;
        if (o.type === "error") return `[ERROR] ${o.message}`;
        return JSON.stringify(o);
      })
      .join("\n");

    navigator.clipboard.writeText(textLogs);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [outputs]);

  if (!isOutputOpen) return null;

  const imageCount = getImagesTabCount(outputs);
  const visibleTabs = TABS.filter((t) => t.id !== "image" || imageCount > 0);

  let normalizedActiveTab: OutputTab = activeTab === "visuals" ? "plots" : activeTab;
  if (normalizedActiveTab === "image" && imageCount === 0) {
    normalizedActiveTab = "plots";
  }

  const currentTabConfig = visibleTabs.find((t) => t.id === normalizedActiveTab) || visibleTabs[0] || TABS[0]!;
  const RendererComponent = outputRendererRegistry.getRenderer(currentTabConfig.rendererType);

  const getTabCount = (tab: TabConfig): number => {
    switch (tab.id) {
      case "console":
        return outputs.filter((o) => o.type === "console" || o.type === "error").length;
      case "table":
        return outputs.filter((o) => o.type === "table").length;
      case "metrics":
        return outputs.filter((o) => o.type === "metrics").length;
      case "image":
        return imageCount;
      case "plots":
        return getPlotsTabCount(outputs);
      default:
        return 0;
    }
  };

  const consoleLogs = outputs.filter((o) => o.type === "console" || o.type === "error");
  const errorCount = consoleLogs.filter(
    (l) => l.type === "error" || (l.type === "console" && l.stream === "stderr")
  ).length;

  const formattedDuration = formatRunDuration(result);

  return (
    <footer
      aria-label="Output Notebook"
      className="w-full h-full flex flex-col bg-[var(--cb-elevation-panel)] border-t border-[var(--cb-border-subtle)] select-none overflow-hidden"
    >
      {/* Header Bar */}
      <div className="h-9 px-3 bg-[var(--cb-elevation-panel)] border-b border-[var(--cb-border-subtle)] flex items-center justify-between shrink-0">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1">
          {visibleTabs.map((tab) => {
            const count = getTabCount(tab);
            const isActive = normalizedActiveTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`h-7 px-2.5 rounded-[var(--cb-radius-control)] text-[12px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? "bg-white/10 text-white font-semibold"
                    : "text-[var(--cb-text-secondary)] hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <Icon size={13} className={isActive ? "text-[var(--cb-accent)]" : "text-[var(--cb-text-muted)]"} />
                <span>{tab.label}</span>
                {tab.id === "console" && errorCount > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-[9px] font-mono border border-rose-500/30 font-bold">
                    {errorCount}
                  </span>
                ) : count > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-white/[0.06] text-[var(--cb-text-muted)] text-[9px] font-mono">
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Status Chip, Copy, Clear & Window Controls */}
        <div className="flex items-center gap-2 text-[11px] font-mono">
          {/* Status Chip ("Ready / Running / Failed / Success") */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-[var(--cb-border-subtle)] text-[11px]">
            {runState === "running" ? (
              <>
                <Loader2 size={11} className="animate-spin text-cyan-400 shrink-0" />
                <span className="text-cyan-300 font-medium">Running</span>
              </>
            ) : result?.status === "success" ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--cb-success)] shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                <span className="text-emerald-300 font-medium">Success</span>
                {formattedDuration && (
                  <span className="text-[var(--cb-text-muted)]">({formattedDuration})</span>
                )}
              </>
            ) : result?.status === "failed" || runState === "failed" ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--cb-error)] shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                <span className="text-rose-300 font-medium">Failed</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <span className="text-[var(--cb-text-muted)]">Ready</span>
              </>
            )}
          </div>

          <div className="w-px h-3 bg-[var(--cb-border-subtle)] mx-0.5" />

          {/* Copy logs */}
          <button
            onClick={handleCopyLogs}
            className="p-1 rounded-[var(--cb-radius-sm)] text-[var(--cb-text-muted)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Copy console logs"
            aria-label="Copy logs"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </button>

          {/* Clear logs */}
          {outputs.length > 0 && (
            <button
              onClick={clearOutputs}
              className="p-1 rounded-[var(--cb-radius-sm)] text-[var(--cb-text-muted)] hover:text-rose-300 hover:bg-white/10 transition-colors cursor-pointer"
              title="Clear outputs"
              aria-label="Clear outputs"
            >
              <Trash2 size={13} />
            </button>
          )}

          {/* Maximize / Restore */}
          <button
            onClick={toggleMaximize}
            className="p-1 rounded-[var(--cb-radius-sm)] text-[var(--cb-text-muted)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title={isMaximized ? "Restore panel size" : "Maximize panel"}
            aria-label="Maximize or restore"
          >
            {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          {/* Close Panel */}
          <button
            onClick={toggleOutput}
            className="p-1 rounded-[var(--cb-radius-sm)] text-[var(--cb-text-muted)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close Terminal (⌥T)"
            aria-label="Close terminal"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Panel Content Area */}
      <div className="flex-1 p-3 overflow-hidden font-mono text-[12px] select-text min-h-0 min-w-0 flex flex-col">
        {RendererComponent ? (
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
            <RendererComponent
              messages={outputs}
              latestMessage={outputs[outputs.length - 1]}
              executionResult={result}
              runState={runState}
              statusMessage={statusMessage}
              onClear={clearOutputs}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[var(--cb-text-muted)] space-y-2">
            <currentTabConfig.emptyIcon size={24} className="text-slate-600" />
            <div className="text-[13px] font-semibold text-[var(--cb-text-primary)]">
              {currentTabConfig.emptyTitle}
            </div>
            <p className="text-[11px] max-w-sm leading-relaxed">
              {currentTabConfig.emptyDesc}
            </p>
          </div>
        )}
      </div>
    </footer>
  );
}

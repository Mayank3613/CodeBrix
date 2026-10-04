import { useState, useCallback, useEffect, useRef } from "react";
import { useExecutionStore, useUiStore, type OutputTab } from "../../stores";

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
      <div className="h-8 bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-between shrink-0 select-none">
        <span className="text-xs font-mono text-slate-400">Output Notebook (Collapsed)</span>
        <button
          onClick={toggleOutput}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-mono flex items-center gap-1 cursor-pointer"
        >
          ▲ Expand
        </button>
      </div>
    );
  }

  const outputs = useExecutionStore((s) => s.outputs);
  const clearOutputs = useExecutionStore((s) => s.clearOutputs);

  const liveOutputs = outputs.length > 0 ? outputs : result?.outputs || [];
  const consoleLogs = liveOutputs.filter((o) => o.type === "console" || o.type === "error");
  const metricsOutputs = liveOutputs.filter((o) => o.type === "metrics");
  const errorCount = consoleLogs.filter(
    (l) => l.type === "error" || (l.type === "console" && l.stream === "stderr")
  ).length;

  const tableMsg = liveOutputs
    .slice()
    .reverse()
    .find((o) => o.type === "table") as import("@codebrix/types").TableOutputMessage | undefined;

  const cmMsg = liveOutputs
    .slice()
    .reverse()
    .find((o) => o.type === "metrics" && Boolean(o.metrics && "matrix" in o.metrics));

  const matrixData =
    cmMsg && cmMsg.type === "metrics" && "matrix" in cmMsg.metrics
      ? (cmMsg.metrics["matrix"] as number[][])
      : null;

  return (
    <footer
      style={{ height: `${panelHeight}px` }}
      className={`bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex flex-col shrink-0 overflow-hidden relative transition-height ${
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

      {/* Header bar */}
      <div className="h-9 px-4 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-1">
          {(["metrics", "console", "table", "visuals"] as OutputTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-medium capitalize rounded-t-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === tab
                  ? "bg-slate-900 text-indigo-300 border-t-2 border-indigo-400 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>{tab}</span>
              {tab === "console" && errorCount > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-300 text-[10px] rounded-full border border-rose-500/40">
                  {errorCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          {runState === "running" ? (
            <span className="text-amber-400 flex items-center gap-1.5 animate-pulse truncate max-w-md">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              {statusMessage || "Running execution..."}
            </span>
          ) : result ? (
            <div className="flex items-center gap-3 text-slate-400">
              <span
                className={`font-semibold flex items-center gap-1 ${
                  result.status === "success" ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {result.status === "success" ? "✓" : "✖"} {result.status}
              </span>
              {typeof result.durationMs === "number" && <span>{result.durationMs}ms</span>}
              {typeof result.exitCode === "number" && <span>exit: {result.exitCode}</span>}
            </div>
          ) : (
            <span className="text-slate-500 italic">No runs yet</span>
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

      {/* Content Area */}
      <div className="flex-1 p-4 overflow-y-auto font-mono text-xs select-text">
        {activeTab === "metrics" && (
          <div className="space-y-3">
            {metricsOutputs.length > 0 ? (
              <div className="grid grid-cols-4 gap-4">
                {metricsOutputs.map((msg, idx) => {
                  if (msg.type !== "metrics") return null;
                  return Object.entries(msg.metrics).map(([k, v]) => (
                    <div
                      key={`${idx}-${k}`}
                      className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-900/50 shadow-lg"
                    >
                      <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-sans">
                        {k.replace(/_/g, " ")}
                      </span>
                      <span className="text-2xl font-bold text-white mt-1 block">
                        {typeof v === "number" && k.toLowerCase().includes("accuracy")
                          ? `${(v * 100).toFixed(1)}%`
                          : String(v)}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-sans mt-1 block">
                        {msg.title ?? "Model Metric"}
                      </span>
                    </div>
                  ));
                })}
              </div>
            ) : (
              <div className="text-slate-500 text-center py-6">
                Click <span className="text-emerald-400 font-semibold font-sans">"Run"</span> on toolbar to execute the workflow.
              </div>
            )}
          </div>
        )}

        {activeTab === "console" && (
          <div className="space-y-2 bg-slate-950/90 p-3 rounded-lg border border-slate-800 text-slate-300">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 text-[10px] text-slate-500 font-sans">
              <span className="flex items-center gap-2">
                <span>Standard Output & Error Stream ({consoleLogs.length} entries)</span>
                {errorCount > 0 && (
                  <span className="text-rose-400 font-semibold">({errorCount} errors detected)</span>
                )}
              </span>
              {consoleLogs.length > 0 && (
                <button
                  onClick={clearOutputs}
                  className="text-slate-400 hover:text-white hover:underline cursor-pointer"
                >
                  Clear Console
                </button>
              )}
            </div>

            {consoleLogs.length > 0 ? (
              <div className="space-y-2">
                {consoleLogs.map((log, i) => {
                  if (log.type === "error") {
                    return (
                      <div
                        key={i}
                        className="text-rose-300 bg-rose-950/30 p-3 rounded-lg border border-rose-900/60 space-y-1.5"
                      >
                        <div className="flex items-center gap-2 text-rose-400 font-semibold">
                          <span className="text-slate-500 text-[10px]">[{log.timestamp.slice(11, 19)}]</span>
                          <span>✖ Error: {log.message}</span>
                        </div>
                        {log.traceback && (
                          <pre className="p-2.5 bg-black/60 rounded border border-rose-950 text-[11px] text-rose-200/90 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
                            {log.traceback}
                          </pre>
                        )}
                      </div>
                    );
                  }

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
                          className="text-rose-300 bg-rose-950/30 p-3 rounded-lg border border-rose-900/60 space-y-1.5"
                        >
                          <div className="flex items-center gap-2 text-rose-400 font-semibold">
                            <span className="text-slate-500 text-[10px]">[{log.timestamp.slice(11, 19)}]</span>
                            <span>✖ {rawErrorJson.message || "Runtime Exception"}</span>
                          </div>
                          {rawErrorJson.traceback && (
                            <pre className="p-2.5 bg-black/60 rounded border border-rose-950 text-[11px] text-rose-200/90 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
                              {rawErrorJson.traceback}
                            </pre>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div key={i} className="flex gap-2 items-start py-0.5">
                        <span className="text-slate-600 select-none text-[10px] shrink-0 pt-0.5">
                          [{log.timestamp.slice(11, 19)}]
                        </span>
                        <span
                          className={`break-words whitespace-pre-wrap ${
                            log.stream === "stderr" ? "text-rose-400" : "text-emerald-300"
                          }`}
                        >
                          {log.text}
                        </span>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            ) : (
              <div className="text-slate-500 italic py-3 text-center">
                No console logs available. Click "Run" to execute pipeline.
              </div>
            )}
          </div>
        )}

        {activeTab === "table" && (
          <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-950/80">
            {tableMsg ? (
              <>
                <div className="px-3 py-2 bg-slate-900/80 border-b border-slate-800 text-xs font-sans text-slate-300 flex justify-between items-center">
                  <span className="font-semibold text-indigo-300">{tableMsg.title ?? "Dataset Preview"}</span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {tableMsg.totalRows ?? tableMsg.rows.length} rows × {tableMsg.columns.length} columns (showing first 10)
                  </span>
                </div>
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900/80 border-b border-slate-800 text-[11px] text-slate-300 uppercase tracking-wider sticky top-0">
                        <th className="p-2 border-r border-slate-800/60 font-mono text-slate-500 w-10">#</th>
                        {tableMsg.columns.map((col, idx) => (
                          <th key={idx} className="p-2 font-mono whitespace-nowrap text-indigo-200">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                      {tableMsg.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-2 border-r border-slate-800/60 text-slate-600 select-none">
                            {rIdx + 1}
                          </td>
                          {row.map((val, cIdx) => (
                            <td key={cIdx} className="p-2 whitespace-nowrap">
                              {String(val ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-slate-500 italic py-8 text-center">
                No dataset preview available. Run workflow to inspect dataset.
              </div>
            )}
          </div>
        )}

        {activeTab === "visuals" && (
          <div className="flex items-center gap-8 justify-center py-4">
            {matrixData && matrixData.length > 0 ? (
              <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 text-center shadow-xl">
                <span className="text-xs font-semibold text-slate-200 block mb-3 font-sans">
                  Confusion Matrix ({matrixData.length} × {matrixData[0]?.length ?? 0})
                </span>
                <div
                  className="grid gap-2 mx-auto font-mono text-xs max-w-sm"
                  style={{ gridTemplateColumns: `repeat(${matrixData[0]?.length || 1}, minmax(0, 1fr))` }}
                >
                  {matrixData.map((row, rIdx) =>
                    row.map((cell, cIdx) => (
                      <div
                        key={`${rIdx}-${cIdx}`}
                        className={`p-3 rounded font-bold border text-center transition-all ${
                          rIdx === cIdx && cell > 0
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-sm shadow-emerald-950"
                            : cell > 0
                            ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                            : "bg-slate-800/30 text-slate-500 border-slate-800/60"
                        }`}
                      >
                        {cell}
                      </div>
                    ))
                  )}
                </div>
                <span className="text-[10px] text-slate-400 block mt-3 font-sans">
                  Diagonal = Correct Predictions, Off-diagonal = Misclassifications
                </span>
              </div>
            ) : (
              <div className="text-slate-500 italic py-8 text-center">
                No visual evaluation available. Connect a Confusion Matrix block and click Run.
              </div>
            )}
          </div>
        )}
      </div>
    </footer>
  );
}

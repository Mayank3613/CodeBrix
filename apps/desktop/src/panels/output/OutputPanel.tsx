import { useExecutionStore, useUiStore, type OutputTab } from "../../stores";
import type { MetricsOutputMessage, TableOutputMessage, ImageOutputMessage } from "@codebrix/types";

function formatMetricValue(key: string, val: number | string | boolean): string {
  if (typeof val === "boolean") return val ? "True" : "False";
  if (typeof val === "string") return val;
  if (typeof val === "number") {
    const lower = key.toLowerCase();
    if (lower.includes("pct") || lower.includes("percent")) {
      return `${val}%`;
    }
    if (
      lower.includes("sample") ||
      lower.includes("count") ||
      lower.includes("total") ||
      Number.isInteger(val)
    ) {
      return val.toLocaleString();
    }
    if (
      val >= 0 &&
      val <= 1 &&
      (lower.includes("acc") ||
        lower.includes("score") ||
        lower.includes("precision") ||
        lower.includes("recall") ||
        lower.includes("f1") ||
        lower.includes("loss"))
    ) {
      return `${(val * 100).toFixed(2)}% (${val.toFixed(4)})`;
    }
    return val.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  return String(val);
}

function formatMetricKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function OutputPanel() {
  const isOutputOpen = useUiStore((s) => s.isOutputOpen);
  const toggleOutput = useUiStore((s) => s.toggleOutput);
  const activeTab = useUiStore((s) => s.activeOutputTab);
  const setActiveTab = useUiStore((s) => s.setActiveOutputTab);

  const runState = useExecutionStore((s) => s.runState);
  const result = useExecutionStore((s) => s.latestResult);
  const statusMessage = useExecutionStore((s) => s.statusMessage);

  if (!isOutputOpen) {
    return (
      <div className="h-8 bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-between shrink-0 select-none">
        <span className="text-xs font-mono text-slate-400">Output Notebook (Collapsed)</span>
        <button
          onClick={toggleOutput}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-mono"
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
  const metricsOutputs = liveOutputs.filter((o): o is MetricsOutputMessage => o.type === "metrics");
  const tableOutputs = liveOutputs.filter((o): o is TableOutputMessage => o.type === "table");
  const latestTable = tableOutputs[tableOutputs.length - 1];
  const imageOutputs = liveOutputs.filter((o): o is ImageOutputMessage => o.type === "image");

  // Extract scalar metrics
  const scalarMetrics: Array<{
    key: string;
    value: number | string | boolean;
    title?: string;
    blockId?: string;
  }> = [];

  for (const msg of metricsOutputs) {
    for (const [k, v] of Object.entries(msg.metrics)) {
      if (Array.isArray(v) || (typeof v === "object" && v !== null)) continue;
      if (k === "accuracy_pct" && "accuracy" in msg.metrics) continue;
      scalarMetrics.push({
        key: k,
        value: v,
        title: msg.title,
        blockId: msg.blockId,
      });
    }
  }

  // Extract confusion matrix if present
  const matrixMsg = metricsOutputs.find(
    (m) => Array.isArray(m.metrics["matrix"]) || Array.isArray(m.metrics["confusion_matrix"])
  );
  const rawMatrix = matrixMsg
    ? (((matrixMsg.metrics["matrix"] || matrixMsg.metrics["confusion_matrix"]) as unknown) as unknown[][])
    : null;

  return (
    <footer className="h-64 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex flex-col shrink-0 overflow-hidden select-none">
      {/* Header bar */}
      <div className="h-9 px-4 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          {(["metrics", "console", "table", "visuals"] as OutputTab[]).map((tab) => {
            const countBadge =
              tab === "console" && consoleLogs.length > 0
                ? ` (${consoleLogs.length})`
                : tab === "metrics" && scalarMetrics.length > 0
                ? ` (${scalarMetrics.length})`
                : tab === "table" && latestTable
                ? " (1)"
                : tab === "visuals" && (rawMatrix || imageOutputs.length > 0)
                ? ` (${(rawMatrix ? 1 : 0) + imageOutputs.length})`
                : "";

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-medium capitalize rounded-t-md transition-all ${
                  activeTab === tab
                    ? "bg-slate-900 text-indigo-300 border-t-2 border-indigo-400"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab}
                {countBadge && (
                  <span className="text-[10px] text-slate-500 font-normal ml-0.5">
                    {countBadge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          {runState === "running" ? (
            <span className="text-amber-400 flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
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
              <span>{result.durationMs}ms</span>
              {result.exitCode !== undefined && <span>exit: {result.exitCode}</span>}
            </div>
          ) : (
            <span className="text-slate-500 italic">No runs executed yet</span>
          )}

          <button
            onClick={toggleOutput}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            title="Collapse output panel"
          >
            ▼
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-4 overflow-auto font-mono text-xs">
        {/* METRICS TAB */}
        {activeTab === "metrics" && (
          <div className="space-y-3">
            {scalarMetrics.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {scalarMetrics.map((item, idx) => {
                  const isErrorKey = item.key.includes("incorrect") || item.key.includes("error");
                  const isCorrectKey = item.key.includes("correct") && !isErrorKey;
                  const numVal = typeof item.value === "number" ? item.value : null;
                  const hasErrors = isErrorKey && numVal !== null && numVal > 0;
                  const cardBorder =
                    hasErrors
                      ? "border-rose-800/60 bg-gradient-to-br from-rose-950/30 to-slate-900"
                      : isCorrectKey
                      ? "border-emerald-800/50 bg-gradient-to-br from-emerald-950/20 to-slate-900"
                      : "border-indigo-900/50 bg-gradient-to-br from-indigo-950/40 to-slate-900";

                  const valColor =
                    hasErrors
                      ? "text-rose-400"
                      : isCorrectKey
                      ? "text-emerald-400"
                      : "text-white";

                  return (
                    <div
                      key={`${idx}-${item.key}`}
                      className={`p-4 rounded-xl border shadow-lg ${cardBorder}`}
                    >
                      <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-sans">
                        {formatMetricKey(item.key)}
                      </span>
                      <span className={`text-2xl font-bold mt-1 block tracking-tight ${valColor}`}>
                        {formatMetricValue(item.key, item.value)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-sans mt-1 block truncate">
                        {item.title || "Evaluation Metric"}
                        {item.blockId ? ` • [${item.blockId}]` : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : result?.status === "failed" ? (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-center space-y-2">
                <p className="text-sm font-semibold text-rose-300">
                  Execution Failed {result.exitCode !== undefined ? `(exit code ${result.exitCode})` : ""}
                </p>
                <p className="text-xs text-slate-400 font-sans">
                  {result.error?.message || "An error occurred during Python subprocess execution."}
                </p>
                <button
                  onClick={() => setActiveTab("console")}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-sans transition-all cursor-pointer"
                >
                  View Console & Traceback
                </button>
              </div>
            ) : runState === "running" ? (
              <div className="text-amber-400 text-center py-8 flex flex-col items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                <span className="font-sans text-xs">
                  Running Python workflow subprocess... Awaiting metrics emission.
                </span>
              </div>
            ) : (
              <div className="text-slate-500 text-center py-8 font-sans">
                No metrics computed yet. Click{" "}
                <span className="text-emerald-400 font-semibold">"Run Pipeline"</span> to execute the Python workflow.
              </div>
            )}
          </div>
        )}

        {/* CONSOLE TAB */}
        {activeTab === "console" && (
          <div className="space-y-2 bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-slate-300">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/60 text-[10px] text-slate-500 font-sans">
              <span>Standard Output & Error Stream ({consoleLogs.length} entries)</span>
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
              <div className="space-y-1">
                {consoleLogs.map((log, i) => {
                  if (log.type === "error") {
                    return (
                      <div
                        key={i}
                        className="flex gap-2 text-rose-400 bg-rose-950/30 p-1.5 rounded border border-rose-900/40"
                      >
                        <span className="text-slate-600 select-none">
                          [{log.timestamp.slice(11, 19)}]
                        </span>
                        <span className="font-semibold whitespace-pre-wrap">{log.message}</span>
                      </div>
                    );
                  }
                  if (log.type === "console") {
                    return (
                      <div key={i} className="flex gap-2">
                        <span className="text-slate-600 select-none">
                          [{log.timestamp.slice(11, 19)}]
                        </span>
                        <span
                          className={`whitespace-pre-wrap ${
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
                {runState === "running" && (
                  <div className="flex items-center gap-2 text-amber-400 text-[11px] pt-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>Streaming live Python output...</span>
                  </div>
                )}
              </div>
            ) : runState === "running" ? (
              <div className="text-amber-400 italic py-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Initializing Python subprocess... streaming logs will appear here.</span>
              </div>
            ) : (
              <div className="text-slate-500 italic py-2">
                No console logs available. Click "Run Pipeline" to execute.
              </div>
            )}
          </div>
        )}

        {/* TABLE TAB */}
        {activeTab === "table" && (
          <div>
            {latestTable ? (
              <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-950/80">
                <div className="px-3 py-2 bg-slate-900/80 border-b border-slate-800 text-xs font-sans text-slate-300 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{latestTable.title || "Dataset Preview"}</span>
                    {latestTable.blockId && (
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-800 text-slate-400 font-mono">
                        {latestTable.blockId}
                      </span>
                    )}
                  </div>
                  <span className="text-slate-500 font-mono text-[11px]">
                    {latestTable.totalRows ?? latestTable.rows.length} rows ×{" "}
                    {latestTable.totalColumns ?? latestTable.columns.length} columns (showing{" "}
                    {latestTable.rows.length} preview rows)
                  </span>
                </div>
                <div className="overflow-x-auto max-h-48">
                  <table className="w-full text-left border-collapse font-mono text-xs">
                    <thead>
                      <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] text-slate-400 sticky top-0">
                        <th className="p-2 border-r border-slate-800/60 w-10 text-center text-slate-500">
                          #
                        </th>
                        {latestTable.columns.map((col, idx) => (
                          <th
                            key={idx}
                            className="p-2 border-r border-slate-800/40 font-semibold text-slate-300 whitespace-nowrap"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {latestTable.rows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-2 border-r border-slate-800/60 text-center text-slate-500 select-none">
                            {rowIdx + 1}
                          </td>
                          {row.map((val, cellIdx) => (
                            <td
                              key={cellIdx}
                              className="p-2 border-r border-slate-800/40 text-slate-300 whitespace-nowrap"
                            >
                              {val === null || val === undefined ? (
                                <span className="text-slate-600 italic">null</span>
                              ) : typeof val === "number" ? (
                                Number.isInteger(val) ? (
                                  val
                                ) : (
                                  val.toFixed(3)
                                )
                              ) : (
                                String(val)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : runState === "running" ? (
              <div className="text-amber-400 text-center py-8 flex flex-col items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                <span className="font-sans text-xs">
                  Loading dataset from Python process... preview will render once loaded.
                </span>
              </div>
            ) : result?.status === "failed" ? (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-center font-sans text-xs text-rose-300">
                Execution failed before dataset could be loaded. Check Console tab for details.
              </div>
            ) : (
              <div className="text-slate-500 text-center py-8 font-sans">
                No tabular dataset loaded yet. Connect a CSV Loader or dataset block and click{" "}
                <span className="text-emerald-400 font-semibold">"Run Pipeline"</span>.
              </div>
            )}
          </div>
        )}

        {/* VISUALS TAB */}
        {activeTab === "visuals" && (
          <div>
            {rawMatrix && rawMatrix.length > 0 ? (
              <div className="flex flex-col items-center justify-center py-2 space-y-3">
                <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 text-center shadow-lg inline-block">
                  <div className="flex items-center justify-between gap-6 mb-3 border-b border-slate-800/80 pb-2">
                    <span className="text-xs font-semibold text-slate-200 font-sans">
                      {matrixMsg?.title || "Confusion Matrix (Live Execution)"}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      {rawMatrix.length} × {(rawMatrix[0] as unknown[])?.length || 0} classes • Real Python Output
                    </span>
                  </div>

                  <div
                    className="grid gap-2 mx-auto font-mono text-xs"
                    style={{
                      gridTemplateColumns: `repeat(${(rawMatrix[0] as unknown[])?.length || 1}, minmax(48px, 1fr))`,
                    }}
                  >
                    {rawMatrix.map((row, rIdx) =>
                      (row as unknown[]).map((val, cIdx) => {
                        const num = Number(val) || 0;
                        const isDiagonal = rIdx === cIdx;
                        const bgClass =
                          isDiagonal && num > 0
                            ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-sm"
                            : num > 0
                            ? "bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40"
                            : "bg-slate-900/60 text-slate-500 border border-slate-800/50";

                        return (
                          <div
                            key={`${rIdx}-${cIdx}`}
                            className={`p-3 rounded flex flex-col items-center justify-center transition-all ${bgClass}`}
                            title={`Actual class ${rIdx}, Predicted class ${cIdx}: ${num} samples`}
                          >
                            <span className="text-base">{num}</span>
                            <span className="text-[9px] opacity-60">[{rIdx},{cIdx}]</span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-6 text-[10px] text-slate-500 mt-3 font-sans">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-emerald-500/40 border border-emerald-500/60" />
                      Correct Predictions (Diagonal)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-rose-500/40 border border-rose-500/60" />
                      Misclassifications
                    </span>
                  </div>
                </div>
              </div>
            ) : imageOutputs.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {imageOutputs.map((img, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-slate-800 bg-slate-950/80">
                    {img.title && (
                      <span className="text-xs font-semibold text-slate-300 block mb-2 font-sans">
                        {img.title}
                      </span>
                    )}
                    {img.format === "svg" ? (
                      <div dangerouslySetInnerHTML={{ __html: img.data }} />
                    ) : (
                      <img
                        src={img.data.startsWith("data:") ? img.data : `data:image/png;base64,${img.data}`}
                        alt={img.title || "Execution Visual"}
                        className="max-h-48 mx-auto rounded"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : runState === "running" ? (
              <div className="text-amber-400 text-center py-8 flex flex-col items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                <span className="font-sans text-xs">
                  Generating model evaluation visuals in Python subprocess...
                </span>
              </div>
            ) : result?.status === "failed" ? (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-center font-sans text-xs text-rose-300">
                Execution failed before visuals could be generated. Check Console tab for details.
              </div>
            ) : (
              <div className="text-slate-500 text-center py-8 font-sans">
                No visual metrics or confusion matrix generated yet. Add a Confusion Matrix block and click{" "}
                <span className="text-emerald-400 font-semibold">"Run Pipeline"</span>.
              </div>
            )}
          </div>
        )}
      </div>
    </footer>
  );
}

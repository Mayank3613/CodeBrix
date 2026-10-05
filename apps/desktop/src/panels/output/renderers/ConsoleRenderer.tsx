import type {
  ConsoleOutputMessage,
  ErrorOutputMessage,
  ImageOutputMessage,
  MetricsOutputMessage,
  OutputMessage,
} from "@codebrix/types";
import type { RendererProps } from "../registry";
import { BarChartIcon } from "../../../components/common/Icons";

export default function ConsoleRenderer({
  messages,
  runState,
  onClear,
}: RendererProps<OutputMessage>) {
  // 1. Console & Error log lines
  const consoleLogs = messages.filter(
    (m): m is ConsoleOutputMessage | ErrorOutputMessage =>
      m.type === "console" || m.type === "error"
  );

  const errorCount = consoleLogs.filter(
    (l) => l.type === "error" || (l.type === "console" && l.stream === "stderr")
  ).length;

  // 2. Metrics & Matrices
  const metricsMsgs = messages.filter(
    (m): m is MetricsOutputMessage => m.type === "metrics"
  );
  const matrixMsg = metricsMsgs.find(
    (m) =>
      Array.isArray(m.metrics["matrix"]) ||
      Array.isArray(m.metrics["confusion_matrix"])
  );
  let rawMatrix: unknown[][] | null = matrixMsg
    ? (((matrixMsg.metrics["matrix"] ||
        matrixMsg.metrics["confusion_matrix"]) as unknown) as unknown[][])
    : null;

  // 3. Visual Image and Plot outputs
  const visualImages = messages.filter(
    (m): m is ImageOutputMessage => m.type === "image"
  );

  // Check if an image message has stringified confusion matrix
  if (!rawMatrix) {
    const cmImage = visualImages.find((img) => img.format === "confusion_matrix");
    if (cmImage) {
      try {
        const parsed = JSON.parse(cmImage.data);
        if (Array.isArray(parsed)) {
          rawMatrix = parsed as unknown[][];
        }
      } catch {
        // ignore
      }
    }
  }

  // Model accuracy if present
  const accuracyMsg = metricsMsgs.find(
    (m) =>
      m.metrics["accuracy"] !== undefined ||
      m.metrics["accuracy_pct"] !== undefined ||
      m.metrics["score"] !== undefined
  );
  const accuracyValue = accuracyMsg
    ? accuracyMsg.metrics["accuracy_pct"] ??
      (typeof accuracyMsg.metrics["accuracy"] === "number"
        ? `${(accuracyMsg.metrics["accuracy"] * 100).toFixed(1)}%`
        : typeof accuracyMsg.metrics["score"] === "number"
        ? `${(accuracyMsg.metrics["score"] * 100).toFixed(1)}%`
        : null)
    : null;

  const hasGraphs = Boolean(rawMatrix && rawMatrix.length > 0) || visualImages.length > 0;

  return (
    <div className="space-y-3 font-mono text-xs">
      {/* ── Visual Graphs & Evaluation Plots Bento Section in Console ── */}
      {hasGraphs && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-3.5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <BarChartIcon size={14} />
              </span>
              <span className="text-xs font-semibold text-slate-200 font-sans">
                Generated Visual Graphs & Evaluation Plots
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                {(rawMatrix ? 1 : 0) + visualImages.filter(img => img.format !== "confusion_matrix" || !rawMatrix).length} visual plot(s)
              </span>
            </div>

            {accuracyValue && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-white/[0.05] border border-white/10 text-emerald-400">
                <span className="text-slate-400 font-sans text-[10px]">Model Accuracy:</span>
                <span className="font-bold">{accuracyValue}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* 1. Confusion Matrix Heatmap Graph */}
            {rawMatrix && rawMatrix.length > 0 && (
              <div className="p-3.5 rounded-xl bg-[#090d18]/90 border border-white/10 shadow-md flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-2.5 pb-1.5 border-b border-white/10">
                  <span className="text-[11px] font-semibold text-slate-200 font-sans">
                    {matrixMsg?.title || "Confusion Matrix Heatmap"}
                  </span>
                  <span className="text-[9.5px] font-mono text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    {rawMatrix.length} × {(rawMatrix[0] as unknown[])?.length || 0} Classes
                  </span>
                </div>

                <div
                  className="grid gap-2 my-2"
                  style={{
                    gridTemplateColumns: `repeat(${
                      (rawMatrix[0] as unknown[])?.length || 1
                    }, minmax(46px, 1fr))`,
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
                          : "bg-slate-900/60 text-slate-500 border border-slate-800/60";

                      return (
                        <div
                          key={`${rIdx}-${cIdx}`}
                          className={`p-2.5 rounded-lg flex flex-col items-center justify-center transition-all ${bgClass}`}
                          title={`Actual class ${rIdx}, Predicted class ${cIdx}: ${num} samples`}
                        >
                          <span className="text-sm font-semibold">{num}</span>
                          <span className="text-[8.5px] opacity-60">
                            [{rIdx},{cIdx}]
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex items-center justify-center gap-4 text-[9.5px] text-slate-400 mt-2 font-sans">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded bg-emerald-500/40 border border-emerald-500/60" />
                    Correct Predictions (Diagonal)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded bg-rose-500/40 border border-rose-500/60" />
                    Misclassifications
                  </span>
                </div>
              </div>
            )}

            {/* 2. Visual Plot Images & SVGs */}
            {visualImages.map((img, idx) => {
              // If it's a confusion matrix already rendered above as interactive grid, skip duplicate raw string
              if (img.format === "confusion_matrix" && rawMatrix) return null;

              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-[#090d18]/90 border border-white/10 shadow-md flex flex-col"
                >
                  <div className="w-full flex items-center justify-between mb-2 pb-1.5 border-b border-white/10">
                    <span className="text-[11px] font-semibold text-slate-200 font-sans">
                      {img.title || "Visual Plot"}
                    </span>
                    <span className="text-[9.5px] font-mono text-cyan-400 uppercase px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                      {img.format}
                    </span>
                  </div>

                  <div className="flex-1 flex items-center justify-center overflow-hidden p-1 min-h-[140px]">
                    {img.format === "svg" ? (
                      <div
                        className="w-full max-h-56 overflow-auto"
                        dangerouslySetInnerHTML={{ __html: img.data }}
                      />
                    ) : img.data.startsWith("{") ? (
                      <pre className="text-[10px] text-indigo-300 font-mono bg-slate-900/80 p-2 rounded max-h-48 overflow-auto w-full">
                        {img.data}
                      </pre>
                    ) : (
                      <img
                        src={
                          img.data.startsWith("data:")
                            ? img.data
                            : `data:image/png;base64,${img.data}`
                        }
                        alt={img.title || "Plot"}
                        className="max-h-56 mx-auto rounded-lg object-contain"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Standard Console Output & Error Logs ── */}
      <div className="bg-[#080c16]/90 p-3 rounded-xl border border-white/10 text-slate-300 space-y-2 shadow-inner">
        <div className="flex items-center justify-between pb-1.5 border-b border-white/10 text-[10px] text-slate-500 font-sans">
          <span className="flex items-center gap-2">
            <span>Standard Output & Error Stream ({consoleLogs.length} entries)</span>
            {errorCount > 0 && (
              <span className="text-rose-400 font-semibold">({errorCount} errors detected)</span>
            )}
          </span>
          {consoleLogs.length > 0 && onClear && (
            <button
              onClick={onClear}
              className="text-slate-400 hover:text-white hover:underline cursor-pointer"
            >
              Clear Console
            </button>
          )}
        </div>

        {consoleLogs.length > 0 ? (
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {consoleLogs.map((log, i) => {
              if (log.type === "error") {
                return (
                  <div
                    key={i}
                    className="flex flex-col gap-1.5 text-rose-300 bg-rose-950/30 p-2.5 rounded-lg border border-rose-900/60"
                  >
                    <div className="flex items-center gap-2 font-semibold text-rose-400">
                      <span className="text-slate-500 text-[10px] font-mono">
                        [{log.timestamp ? log.timestamp.slice(11, 19) : "--:--:--"}]
                      </span>
                      <span>Error: {log.message}</span>
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
                      className="flex flex-col gap-1.5 text-rose-300 bg-rose-950/30 p-2.5 rounded-lg border border-rose-900/60"
                    >
                      <div className="flex items-center gap-2 font-semibold text-rose-400">
                        <span className="text-slate-500 text-[10px] font-mono">
                          [{log.timestamp ? log.timestamp.slice(11, 19) : "--:--:--"}]
                        </span>
                        <span>{rawErrorJson.message || "Runtime Exception"}</span>
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
                  <div key={i} className="flex gap-2 leading-relaxed items-start py-0.5">
                    <span className="text-slate-600 select-none text-[10px] shrink-0 pt-0.5">
                      [{log.timestamp ? log.timestamp.slice(11, 19) : "--:--:--"}]
                    </span>
                    <span
                      className={`whitespace-pre-wrap break-words ${
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
          <div className="text-amber-400 italic py-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Initializing Python subprocess... streaming logs will appear here.</span>
          </div>
        ) : !hasGraphs ? (
          <div className="text-slate-500 italic py-4">
            No console logs or graphs captured yet. Click "Run Pipeline" to execute the Python script.
          </div>
        ) : null}
      </div>
    </div>
  );
}

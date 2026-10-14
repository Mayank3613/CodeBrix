import type { ImageOutputMessage, MetricsOutputMessage, OutputMessage } from "@codebrix/types";
import type { RendererProps } from "../registry";
import { useUiStore } from "../../../stores";
import { ImageIcon } from "../../../components/common/Icons";
import { isPlotOutput, isImageOutput } from "../outputClassification";

export default function PlotlyRenderer({
  messages,
  runState,
  executionResult,
}: RendererProps<OutputMessage>) {
  // Only pick up interactive/analytical chart formats (excluding raw JSON confusion_matrix which is rendered as interactive heatmap)
  const plotImages = messages.filter(
    (m): m is ImageOutputMessage =>
      isPlotOutput(m) && m.type === "image" && m.format !== "confusion_matrix"
  );

  // Check for metrics message containing matrix
  const metricsMsgs = messages.filter((m): m is MetricsOutputMessage => m.type === "metrics");
  const matrixMsg = metricsMsgs.find(
    (m) =>
      Array.isArray(m.metrics["matrix"]) ||
      Array.isArray(m.metrics["confusion_matrix"])
  );
  let rawMatrix = matrixMsg
    ? (((matrixMsg.metrics["matrix"] ||
        matrixMsg.metrics["confusion_matrix"]) as unknown) as unknown[][])
    : null;

  // Fallback: Check if an image message has stringified confusion matrix
  if (!rawMatrix) {
    const cmMsg = messages.find(
      (m): m is ImageOutputMessage => m.type === "image" && m.format === "confusion_matrix"
    );
    if (cmMsg) {
      try {
        const parsed = JSON.parse(cmMsg.data);
        if (Array.isArray(parsed)) {
          rawMatrix = parsed as unknown[][];
        }
      } catch {
        // ignore
      }
    }
  }

  if (!rawMatrix && plotImages.length === 0) {
    if (runState === "running") {
      return (
        <div className="text-amber-400 text-center py-8 flex flex-col items-center gap-2 font-mono text-xs">
          <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
          <span className="font-sans text-xs">
            Computing visual evaluation plots and confusion matrix in Python subprocess...
          </span>
        </div>
      );
    }

    if (executionResult?.status === "failed") {
      return (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-center font-sans text-xs text-rose-300">
          Execution failed before plots could be generated. Check Console tab for details.
        </div>
      );
    }

    const hasImages = messages.some(isImageOutput);
    if (hasImages) {
      return (
        <div className="text-slate-400 text-center py-8 font-sans text-xs flex flex-col items-center gap-3">
          <p className="text-slate-500">
            No analytical plots or charts were generated.
          </p>
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 text-slate-300 flex items-center gap-4 shadow-lg">
            <ImageIcon size={24} className="text-emerald-400" />
            <div className="text-left">
              <p className="text-xs font-semibold text-slate-200">
                Image Assets Available
              </p>
              <p className="text-[11px] text-slate-400">
                Image files and media outputs are rendered under the <strong>Images</strong> tab.
              </p>
            </div>
            <button
              onClick={() => useUiStore.getState().setActiveOutputTab("image")}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs cursor-pointer transition-colors shadow-sm ml-2"
            >
              Open Images Tab →
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="text-slate-500 text-center py-8 font-sans text-xs">
        No visual plots or confusion matrix generated yet. Add a Confusion Matrix or Plotly block and click{" "}
        <span className="text-emerald-400 font-semibold">"Run Pipeline"</span>.
      </div>
    );
  }

  // Calculate statistics if rawMatrix is present
  const nRows = rawMatrix ? rawMatrix.length : 0;
  const nCols = rawMatrix && nRows > 0 ? (rawMatrix[0] as unknown[])?.length || 0 : 0;

  let totalSamples = 0;
  let correctPredictions = 0;
  let maxCellVal = 0;
  const rowSums: number[] = [];

  if (rawMatrix) {
    for (let r = 0; r < nRows; r++) {
      let rSum = 0;
      for (let c = 0; c < nCols; c++) {
        const v = Number(rawMatrix[r]?.[c]) || 0;
        totalSamples += v;
        rSum += v;
        if (r === c) correctPredictions += v;
        if (v > maxCellVal) maxCellVal = v;
      }
      rowSums.push(rSum);
    }
  }

  const accuracyPct = totalSamples > 0 ? (correctPredictions / totalSamples) * 100 : 0;
  const errorCount = totalSamples - correctPredictions;

  // Binary diagnostics (2x2)
  const isBinary = nRows === 2 && nCols === 2;
  const tn = isBinary ? Number(rawMatrix![0]?.[0]) || 0 : 0;
  const fp = isBinary ? Number(rawMatrix![0]?.[1]) || 0 : 0;
  const fn = isBinary ? Number(rawMatrix![1]?.[0]) || 0 : 0;
  const tp = isBinary ? Number(rawMatrix![1]?.[1]) || 0 : 0;

  const precision = tp + fp > 0 ? (tp / (tp + fp)) * 100 : 0;
  const recall = tp + fn > 0 ? (tp / (tp + fn)) * 100 : 0;
  const specificity = tn + fp > 0 ? (tn / (tn + fp)) * 100 : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return (
    <div className="space-y-6 font-mono text-xs pb-4">
      {/* Confusion Matrix Interactive Heatmap */}
      {rawMatrix && nRows > 0 && (
        <div className="flex flex-col items-center justify-center">
          <div className="w-full max-w-2xl p-5 rounded-2xl bg-gradient-to-b from-[#0d1322] to-[#080d18] border border-cyan-500/20 text-center shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            {/* Header: Title & Performance Summary */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                <span className="text-sm font-semibold text-slate-100 font-sans tracking-tight">
                  {matrixMsg?.title || "Confusion Matrix Heatmap"}
                </span>
                <span className="text-[10px] text-cyan-300 font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 font-medium">
                  {nRows} × {nCols} Classes
                </span>
              </div>

              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold shadow-[0_0_8px_rgba(16,185,129,0.15)]">
                  Accuracy: {accuracyPct.toFixed(1)}%
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-300">
                  {totalSamples} Samples
                </span>
                {errorCount > 0 && (
                  <span className="px-2 py-0.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300">
                    {errorCount} Errors
                  </span>
                )}
              </div>
            </div>

            {/* Heatmap with X/Y Axes */}
            <div className="flex flex-col items-center justify-center my-2 select-none">
              {/* Top Axis: Predicted Label */}
              <div className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 mb-1.5 flex items-center gap-1.5 font-sans">
                <span>Predicted Class (Output)</span>
                <span className="text-cyan-500 text-xs">→</span>
              </div>

              {/* Matrix Layout with Left Axis (Actual Label) */}
              <div className="flex items-center">
                {/* Left Axis: Actual Label */}
                <div className="flex items-center justify-center mr-3 -rotate-90 select-none">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 whitespace-nowrap font-sans">
                    Actual Class (Truth)
                  </span>
                </div>

                {/* Grid with Column and Row Headers */}
                <div className="flex flex-col">
                  {/* Column Headers */}
                  <div
                    className="grid gap-2 mb-2 ml-16"
                    style={{
                      gridTemplateColumns: `repeat(${nCols}, minmax(72px, 88px))`,
                    }}
                  >
                    {Array.from({ length: nCols }).map((_, cIdx) => (
                      <div
                        key={`col-${cIdx}`}
                        className="text-[10px] font-mono text-cyan-300/80 font-bold text-center py-1 rounded bg-white/[0.03] border border-white/5"
                      >
                        Pred {cIdx}
                      </div>
                    ))}
                  </div>

                  {/* Rows */}
                  {rawMatrix.map((row, rIdx) => (
                    <div key={`row-${rIdx}`} className="flex items-center gap-2 mb-2">
                      {/* Row Header */}
                      <div className="w-14 text-[10px] font-mono text-cyan-300/80 font-bold text-right pr-2 shrink-0 py-2">
                        Class {rIdx}
                      </div>

                      {/* Cells */}
                      <div
                        className="grid gap-2"
                        style={{
                          gridTemplateColumns: `repeat(${nCols}, minmax(72px, 88px))`,
                        }}
                      >
                        {(row as unknown[]).map((val, cIdx) => {
                          const num = Number(val) || 0;
                          const isDiagonal = rIdx === cIdx;
                          const intensity = maxCellVal > 0 ? num / maxCellVal : 0;
                          const rSum = rowSums[rIdx] || 0;
                          const rowPct = rSum > 0 ? ((num / rSum) * 100).toFixed(1) : "0.0";

                          // Color gradient intensity
                          const bgStyle = isDiagonal
                            ? num > 0
                              ? {
                                  backgroundColor: `rgba(16, 185, 129, ${0.18 + 0.65 * intensity})`,
                                  borderColor: `rgba(52, 211, 153, ${0.35 + 0.5 * intensity})`,
                                  boxShadow: num > 0 ? `0 0 16px rgba(16, 185, 129, ${0.2 * intensity})` : undefined,
                                }
                              : {
                                  backgroundColor: "rgba(15, 23, 42, 0.4)",
                                  borderColor: "rgba(51, 65, 85, 0.3)",
                                }
                            : num > 0
                            ? {
                                backgroundColor: `rgba(244, 63, 94, ${0.18 + 0.65 * intensity})`,
                                borderColor: `rgba(251, 113, 133, ${0.35 + 0.5 * intensity})`,
                                boxShadow: `0 0 16px rgba(244, 63, 94, ${0.2 * intensity})`,
                              }
                            : {
                                backgroundColor: "rgba(15, 23, 42, 0.4)",
                                borderColor: "rgba(51, 65, 85, 0.3)",
                              };

                          const textClass = isDiagonal
                            ? num > 0
                              ? "text-emerald-100 font-bold"
                              : "text-slate-500 font-normal"
                            : num > 0
                            ? "text-rose-100 font-bold"
                            : "text-slate-600 font-normal";

                          return (
                            <div
                              key={`${rIdx}-${cIdx}`}
                              style={bgStyle}
                              className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all duration-200 hover:scale-105 hover:z-10 cursor-default shadow-sm ${textClass}`}
                              title={`Actual Class ${rIdx} → Predicted Class ${cIdx}: ${num} sample(s) (${rowPct}% of actual Class ${rIdx})`}
                            >
                              <span className="text-lg leading-tight font-mono">
                                {num % 1 === 0 ? num : num.toFixed(3)}
                              </span>
                              <div className="flex items-center gap-1 mt-1 text-[9px] opacity-80 font-mono">
                                <span className="font-semibold">{rowPct}%</span>
                                <span className="opacity-40">[{rIdx},{cIdx}]</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Heatmap Legend & Color Scale */}
            <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-4 text-[11px] font-sans text-slate-400">
              <div className="flex items-center gap-5">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500/40 border border-emerald-400/60 shadow-[0_0_6px_rgba(16,185,129,0.3)]" />
                  <span className="text-slate-300 font-medium">Correct Predictions (Diagonal)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-rose-500/40 border border-rose-400/60 shadow-[0_0_6px_rgba(244,63,94,0.3)]" />
                  <span className="text-slate-300 font-medium">Misclassifications</span>
                </span>
              </div>

              {/* Heatmap Intensity Indicator */}
              <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                <span>0</span>
                <div className="w-24 h-2 rounded-full bg-gradient-to-r from-slate-800 via-emerald-600 to-emerald-400 border border-white/10" />
                <span>{maxCellVal}</span>
                <span className="text-slate-500 font-sans ml-1">(Intensity)</span>
              </div>
            </div>

            {/* Binary Diagnostics Strip for 2x2 Classifications */}
            {isBinary && (
              <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-left font-sans">
                <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">True Positives (TP)</div>
                  <div className="text-sm font-bold text-emerald-300 font-mono mt-0.5">{tp}</div>
                  <div className="text-[9.5px] text-slate-500">Class 1 identified</div>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">True Negatives (TN)</div>
                  <div className="text-sm font-bold text-emerald-300 font-mono mt-0.5">{tn}</div>
                  <div className="text-[9.5px] text-slate-500">Class 0 rejected</div>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Precision / PPV</div>
                  <div className="text-sm font-bold text-cyan-300 font-mono mt-0.5">{precision.toFixed(1)}%</div>
                  <div className="text-[9.5px] text-slate-500">TP / (TP + FP)</div>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Recall / Sensitivity</div>
                  <div className="text-sm font-bold text-cyan-300 font-mono mt-0.5">{recall.toFixed(1)}%</div>
                  <div className="text-[9.5px] text-slate-500">TP / (TP + FN)</div>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Specificity (TNR)</div>
                  <div className="text-sm font-bold text-teal-300 font-mono mt-0.5">{specificity.toFixed(1)}%</div>
                  <div className="text-[9.5px] text-slate-500">TN / (TN + FP)</div>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">F1-Score</div>
                  <div className="text-sm font-bold text-indigo-300 font-mono mt-0.5">{f1.toFixed(1)}%</div>
                  <div className="text-[9.5px] text-slate-500">Harmonic Mean</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Other Plotly / Feature Importance Images */}
      {plotImages.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plotImages.map((plot, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl border border-slate-800 bg-[#090d18]/90 flex flex-col shadow-lg"
            >
              {plot.title && (
                <span className="text-xs font-semibold text-slate-200 block mb-2 font-sans border-b border-white/5 pb-1.5">
                  {plot.title}
                </span>
              )}
              <div className="flex-1 flex items-center justify-center overflow-hidden p-2">
                {plot.data.startsWith("{") ? (
                  <pre className="text-[11px] text-indigo-300 font-mono bg-slate-900/80 p-2.5 rounded-xl max-h-48 overflow-auto w-full border border-white/5">
                    {plot.data}
                  </pre>
                ) : plot.format === "svg" || plot.data.startsWith("<svg") ? (
                  <div
                    className="max-h-56 w-full flex items-center justify-center overflow-auto"
                    dangerouslySetInnerHTML={{ __html: plot.data }}
                  />
                ) : (
                  <img
                    src={
                      plot.data.startsWith("data:")
                        ? plot.data
                        : `data:image/png;base64,${plot.data}`
                    }
                    alt={plot.title || "Plot"}
                    className="max-h-56 mx-auto rounded-lg object-contain"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


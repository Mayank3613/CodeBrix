import { useState, useMemo } from "react";
import type { ImageOutputMessage, MetricsOutputMessage, OutputMessage } from "@codebrix/types";
import type { RendererProps } from "../registry";
import { useUiStore, useWorkflowStore } from "../../../stores";
import { blockRegistry } from "../../../registry";
import { ImageIcon } from "../../../components/common/Icons";
import { isPlotOutput, isImageOutput } from "../outputClassification";
import {
  Download,
  Maximize2,
  Minimize2,
  BarChart2,
  Sparkles,
} from "lucide-react";

function BlockChip({ blockId }: { blockId: string }) {
  const block = useWorkflowStore((s) => s.graph.blocks[blockId]);
  const focusBlock = useUiStore((s) => s.focusBlock);
  const label = block?.label || (block?.definitionId ? blockRegistry.get(block.definitionId)?.name : null) || "Plot";

  return (
    <button
      type="button"
      onClick={() => focusBlock(blockId)}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/50 text-cyan-300 font-mono text-[10px] cursor-pointer transition-colors"
      title={`Focus ${label} on canvas`}
    >
      <span>{label}</span>
    </button>
  );
}

export default function PlotlyRenderer({
  messages,
  runState,
  executionResult,
}: RendererProps<OutputMessage>) {
  const [expandedPlotIdx, setExpandedPlotIdx] = useState<number | null>(null);

  // Pick up analytical chart formats
  const plotImages = useMemo(
    () =>
      messages.filter(
        (m): m is ImageOutputMessage =>
          isPlotOutput(m) && m.type === "image" && m.format !== "confusion_matrix"
      ),
    [messages]
  );

  // Check for metrics message containing matrix
  const metricsMsgs = useMemo(
    () => messages.filter((m): m is MetricsOutputMessage => m.type === "metrics"),
    [messages]
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

  // Extract real class labels
  const classLabels: string[] = useMemo(() => {
    if (matrixMsg?.metrics) {
      const customLabels =
        matrixMsg.metrics["labels"] ||
        matrixMsg.metrics["target_names"] ||
        matrixMsg.metrics["classes"];
      if (Array.isArray(customLabels)) {
        return customLabels.map(String);
      }
    }
    const n = rawMatrix ? rawMatrix.length : 0;
    if (n === 3) return ["setosa", "versicolor", "virginica"];
    if (n === 2) return ["Negative (0)", "Positive (1)"];
    return Array.from({ length: n }, (_, i) => `Class ${i}`);
  }, [matrixMsg, rawMatrix]);

  const handleDownloadImage = (dataUrl: string, title: string) => {
    const link = document.createElement("a");
    link.href = dataUrl.startsWith("data:") ? dataUrl : `data:image/png;base64,${dataUrl}`;
    const slug = title.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    link.download = `${slug}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  // Calculate matrix statistics
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
    <div className="pt-4 pb-6 font-mono text-xs space-y-6">
      {/* ── Model Accuracy Breakdown KPI Hero Card ── */}
      {rawMatrix && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-[var(--cb-radius-control)] border border-emerald-500/30 bg-emerald-950/20 shadow-xs">
            <span className="text-[10px] text-emerald-400 font-sans uppercase font-bold tracking-wider">
              Accuracy
            </span>
            <div className="text-2xl font-bold text-white mt-1">
              {accuracyPct.toFixed(1)}%
            </div>
            <span className="text-[10px] text-[var(--cb-text-muted)] font-sans mt-0.5 block">
              {correctPredictions} of {totalSamples} classified
            </span>
          </div>

          <div className="p-3.5 rounded-[var(--cb-radius-control)] border border-[var(--cb-border-subtle)] bg-white/[0.02]">
            <span className="text-[10px] text-[var(--cb-text-muted)] font-sans uppercase font-bold tracking-wider">
              Total Samples
            </span>
            <div className="text-2xl font-bold text-[var(--cb-text-primary)] mt-1">
              {totalSamples}
            </div>
            <span className="text-[10px] text-[var(--cb-text-muted)] font-sans mt-0.5 block">
              Evaluation split
            </span>
          </div>

          <div className="p-3.5 rounded-[var(--cb-radius-control)] border border-[var(--cb-border-subtle)] bg-white/[0.02]">
            <span className="text-[10px] text-[var(--cb-text-muted)] font-sans uppercase font-bold tracking-wider">
              Classes Tested
            </span>
            <div className="text-2xl font-bold text-[var(--cb-text-primary)] mt-1">
              {nRows}
            </div>
            <span className="text-[10px] text-[var(--cb-text-muted)] font-sans mt-0.5 block">
              {classLabels.slice(0, 3).join(", ")}
            </span>
          </div>

          <div className="p-3.5 rounded-[var(--cb-radius-control)] border border-[var(--cb-border-subtle)] bg-white/[0.02]">
            <span className="text-[10px] text-[var(--cb-text-muted)] font-sans uppercase font-bold tracking-wider">
              Misclassifications
            </span>
            <div className={`text-2xl font-bold mt-1 ${errorCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {errorCount}
            </div>
            <span className="text-[10px] text-[var(--cb-text-muted)] font-sans mt-0.5 block">
              {errorCount === 0 ? "Zero errors" : `${errorCount} samples mislabeled`}
            </span>
          </div>
        </div>
      )}

      {/* ── Plots & Charts Responsive Grid (minmax 420px) ── */}
      <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(420px,1fr))]">
        {/* Confusion Matrix Interactive Heatmap */}
        {rawMatrix && nRows > 0 && (
          <div className="p-4 rounded-[var(--cb-radius-control)] bg-black/25 border border-[var(--cb-border-subtle)] flex flex-col">
            {/* Header: Title & Actions */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--cb-border-subtle)] mb-4">
              <div className="flex items-center gap-2">
                <BarChart2 size={15} className="text-cyan-400" />
                <span className="text-sm font-semibold text-white font-sans">
                  {matrixMsg?.title || "Confusion Matrix Heatmap"}
                </span>
                {matrixMsg?.blockId && <BlockChip blockId={matrixMsg.blockId} />}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-[var(--cb-text-muted)]">
                  {nRows}×{nCols} Classes
                </span>
              </div>
            </div>

            {/* Heatmap Layout with Adjacent Labels */}
            <div className="flex-1 flex flex-col items-center justify-center select-none py-2">
              {/* Predicted Axis Label */}
              <div className="text-[11px] font-bold text-cyan-400 mb-2 flex items-center gap-1.5 font-sans">
                <span>Predicted Label →</span>
              </div>

              <div className="flex items-start gap-3">
                {/* Actual Axis Label */}
                <div className="flex items-center pt-8">
                  <span className="text-[11px] font-bold text-cyan-400 font-sans [writing-mode:vertical-lr] rotate-180">
                    Actual Label →
                  </span>
                </div>

                {/* Matrix Grid */}
                <div className="flex flex-col">
                  {/* Column Headers */}
                  <div
                    className="grid gap-2 mb-2 ml-20"
                    style={{
                      gridTemplateColumns: `repeat(${nCols}, minmax(72px, 88px))`,
                    }}
                  >
                    {classLabels.map((label, cIdx) => (
                      <div
                        key={`col-${cIdx}`}
                        className="text-[10px] font-mono text-cyan-300 font-medium text-center py-1 px-1 rounded bg-white/[0.04] border border-white/5 truncate"
                        title={label}
                      >
                        {label}
                      </div>
                    ))}
                  </div>

                  {/* Rows */}
                  {rawMatrix.map((row, rIdx) => {
                    const rowLabel = classLabels[rIdx] || `Class ${rIdx}`;
                    return (
                      <div key={`row-${rIdx}`} className="flex items-center gap-2 mb-2">
                        {/* Row Header */}
                        <div
                          className="w-18 text-[10px] font-mono text-cyan-300 font-medium text-right pr-2 shrink-0 truncate py-2"
                          title={rowLabel}
                        >
                          {rowLabel}
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

                            const bgStyle = isDiagonal
                              ? num > 0
                                ? {
                                    backgroundColor: `rgba(16, 185, 129, ${0.18 + 0.65 * intensity})`,
                                    borderColor: `rgba(52, 211, 153, ${0.35 + 0.5 * intensity})`,
                                    boxShadow: num > 0 ? `0 0 12px rgba(16, 185, 129, ${0.15 * intensity})` : undefined,
                                  }
                                : {
                                    backgroundColor: "rgba(15, 23, 42, 0.4)",
                                    borderColor: "rgba(51, 65, 85, 0.3)",
                                  }
                              : num > 0
                              ? {
                                  backgroundColor: `rgba(244, 63, 94, ${0.18 + 0.65 * intensity})`,
                                  borderColor: `rgba(251, 113, 133, ${0.35 + 0.5 * intensity})`,
                                  boxShadow: `0 0 12px rgba(244, 63, 94, ${0.15 * intensity})`,
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
                                className={`p-2.5 rounded-[var(--cb-radius-control)] border flex flex-col items-center justify-center transition-all duration-150 hover:scale-105 cursor-default ${textClass}`}
                                title={`Actual: ${rowLabel} → Predicted: ${classLabels[cIdx] || cIdx}: ${num} sample(s)`}
                              >
                                <span className="text-base font-mono leading-none">
                                  {num}
                                </span>
                                <span className="text-[9px] opacity-75 mt-1 font-mono">
                                  {rowPct}%
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Heatmap Legend */}
            <div className="mt-3 pt-3 border-t border-[var(--cb-border-subtle)] flex flex-wrap items-center justify-between gap-3 text-[11px] font-sans text-[var(--cb-text-muted)]">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500/60 border border-emerald-400" />
                  <span className="text-[var(--cb-text-secondary)]">Correct</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-rose-500/60 border border-rose-400" />
                  <span className="text-[var(--cb-text-secondary)]">Misclassified</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono">
                <span>0</span>
                <div className="w-16 h-1.5 rounded-full bg-gradient-to-r from-slate-800 to-emerald-400" />
                <span>{maxCellVal}</span>
              </div>
            </div>

            {/* Binary Diagnostics Strip if 2x2 */}
            {isBinary && (
              <div className="mt-3 pt-2.5 border-t border-[var(--cb-border-subtle)] grid grid-cols-2 sm:grid-cols-4 gap-2 text-left font-sans">
                <div className="p-2 rounded bg-white/[0.02] border border-white/5">
                  <div className="text-[9.5px] text-[var(--cb-text-muted)] uppercase">Precision</div>
                  <div className="text-xs font-bold text-cyan-300 font-mono mt-0.5">{precision.toFixed(1)}%</div>
                </div>
                <div className="p-2 rounded bg-white/[0.02] border border-white/5">
                  <div className="text-[9.5px] text-[var(--cb-text-muted)] uppercase">Recall</div>
                  <div className="text-xs font-bold text-cyan-300 font-mono mt-0.5">{recall.toFixed(1)}%</div>
                </div>
                <div className="p-2 rounded bg-white/[0.02] border border-white/5">
                  <div className="text-[9.5px] text-[var(--cb-text-muted)] uppercase">Specificity</div>
                  <div className="text-xs font-bold text-teal-300 font-mono mt-0.5">{specificity.toFixed(1)}%</div>
                </div>
                <div className="p-2 rounded bg-white/[0.02] border border-white/5">
                  <div className="text-[9.5px] text-[var(--cb-text-muted)] uppercase">F1-Score</div>
                  <div className="text-xs font-bold text-indigo-300 font-mono mt-0.5">{f1.toFixed(1)}%</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Other Generated Visual Plots */}
        {plotImages.map((plot, idx) => {
          const isExpanded = expandedPlotIdx === idx;
          const plotTitle = plot.title || "Plot Output";

          return (
            <div
              key={idx}
              className={`p-4 rounded-[var(--cb-radius-control)] bg-black/25 border border-[var(--cb-border-subtle)] flex flex-col ${
                isExpanded ? "fixed inset-8 z-50 bg-[#080c16]/95 border-cyan-500/40 shadow-2xl" : ""
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[var(--cb-border-subtle)] mb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-cyan-400" />
                  <span className="text-xs font-semibold text-white font-sans">
                    {plotTitle}
                  </span>
                  {plot.blockId && <BlockChip blockId={plot.blockId} />}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleDownloadImage(plot.data, plotTitle)}
                    className="p-1 rounded text-[var(--cb-text-muted)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Export PNG"
                  >
                    <Download size={13} />
                  </button>
                  <button
                    onClick={() => setExpandedPlotIdx(isExpanded ? null : idx)}
                    className="p-1 rounded text-[var(--cb-text-muted)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title={isExpanded ? "Minimize" : "Expand"}
                  >
                    {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                  </button>
                </div>
              </div>

              {/* Plot Image/Content */}
              <div className="flex-1 flex items-center justify-center overflow-hidden p-2 min-h-[220px]">
                {plot.format === "svg" || plot.data.startsWith("<svg") ? (
                  <div
                    className="max-h-72 w-full flex items-center justify-center overflow-auto"
                    dangerouslySetInnerHTML={{ __html: plot.data }}
                  />
                ) : (
                  <img
                    src={
                      plot.data.startsWith("data:")
                        ? plot.data
                        : `data:image/png;base64,${plot.data}`
                    }
                    alt={plotTitle}
                    className="max-h-72 w-auto max-w-full rounded object-contain"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

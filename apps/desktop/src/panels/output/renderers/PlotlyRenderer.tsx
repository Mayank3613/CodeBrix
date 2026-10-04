import type { ImageOutputMessage, MetricsOutputMessage, OutputMessage } from "@codebrix/types";
import type { RendererProps } from "../registry";

export default function PlotlyRenderer({
  messages,
  runState,
  executionResult,
}: RendererProps<OutputMessage>) {
  // Check for image with format "confusion_matrix", "plotly", "feature_importance"
  const plotImages = messages.filter(
    (m): m is ImageOutputMessage =>
      m.type === "image" &&
      (m.format === "plotly" ||
        m.format === "confusion_matrix" ||
        m.format === "feature_importance")
  );

  // Check for metrics message containing matrix
  const metricsMsgs = messages.filter((m): m is MetricsOutputMessage => m.type === "metrics");
  const matrixMsg = metricsMsgs.find(
    (m) =>
      Array.isArray(m.metrics["matrix"]) ||
      Array.isArray(m.metrics["confusion_matrix"])
  );
  const rawMatrix = matrixMsg
    ? (((matrixMsg.metrics["matrix"] ||
        matrixMsg.metrics["confusion_matrix"]) as unknown) as unknown[][])
    : null;

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

    return (
      <div className="text-slate-500 text-center py-8 font-sans text-xs">
        No visual plots or confusion matrix generated yet. Add a Confusion Matrix or Plotly block and click{" "}
        <span className="text-emerald-400 font-semibold">"Run Pipeline"</span>.
      </div>
    );
  }

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Confusion Matrix Visualization */}
      {rawMatrix && rawMatrix.length > 0 && (
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
                gridTemplateColumns: `repeat(${
                  (rawMatrix[0] as unknown[])?.length || 1
                }, minmax(48px, 1fr))`,
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
                      <span className="text-[9px] opacity-60">
                        [{rIdx},{cIdx}]
                      </span>
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
      )}

      {/* Plotly / Plot Images */}
      {plotImages.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plotImages.map((plot, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg border border-slate-800 bg-slate-950/80 flex flex-col"
            >
              {plot.title && (
                <span className="text-xs font-semibold text-slate-300 block mb-2 font-sans">
                  {plot.title}
                </span>
              )}
              <div className="flex-1 flex items-center justify-center overflow-hidden p-2">
                {plot.data.startsWith("{") ? (
                  <pre className="text-[11px] text-indigo-300 font-mono bg-slate-900 p-2 rounded max-h-48 overflow-auto w-full">
                    {plot.data}
                  </pre>
                ) : (
                  <img
                    src={
                      plot.data.startsWith("data:")
                        ? plot.data
                        : `data:image/png;base64,${plot.data}`
                    }
                    alt={plot.title || "Plot"}
                    className="max-h-56 mx-auto rounded object-contain"
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

import type { OutputMessage } from "@codebrix/types";
import type { RendererProps } from "../registry";
import { useUiStore } from "../../../stores";
import { BarChartIcon } from "../../../components/common/Icons";
import { isImageOutput, isPlotOutput } from "../outputClassification";

export default function ImageRenderer({
  messages,
  runState,
  executionResult,
}: RendererProps<OutputMessage>) {
  const imageOutputs = messages.filter(isImageOutput);
  const hasPlotOrMatrix = messages.some(isPlotOutput);

  if (imageOutputs.length === 0) {
    if (runState === "running") {
      return (
        <div className="text-amber-400 text-center py-8 flex flex-col items-center gap-2 font-mono text-xs">
          <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
          <span className="font-sans text-xs">
            Generating visual charts in Python subprocess...
          </span>
        </div>
      );
    }

    if (executionResult?.status === "failed") {
      return (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-center font-sans text-xs text-rose-300">
          Execution failed before images could be generated. Check Console tab for details.
        </div>
      );
    }

    if (hasPlotOrMatrix) {
      return (
        <div className="text-slate-400 text-center py-8 font-sans text-xs flex flex-col items-center gap-3">
          <p className="text-slate-500">
            No standalone image files (.png/.svg) were generated.
          </p>
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 text-slate-300 flex items-center gap-4 shadow-lg">
            <BarChartIcon size={24} className="text-indigo-400" />
            <div className="text-left">
              <p className="text-xs font-semibold text-slate-200">
                Analytical Plots Available
              </p>
              <p className="text-[11px] text-slate-400">
                Diagnostic charts, heatmaps, and evaluations are rendered under the <strong>Plots</strong> tab.
              </p>
            </div>
            <button
              onClick={() => useUiStore.getState().setActiveOutputTab("plots")}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs cursor-pointer transition-colors shadow-sm ml-2"
            >
              Open Plots Tab →
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="text-slate-500 text-center py-8 font-sans text-xs">
        No image assets generated yet. Add an image processing or media block and click{" "}
        <span className="text-emerald-400 font-semibold">"Run Pipeline"</span>.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
      {imageOutputs.map((img, idx) => (
        <div key={idx} className="p-3 rounded-lg border border-slate-800 bg-slate-950/80 flex flex-col">
          {img.title && (
            <span className="text-xs font-semibold text-slate-300 block mb-2 font-sans">
              {img.title}
            </span>
          )}
          <div className="flex-1 flex items-center justify-center overflow-hidden p-2">
            {img.format === "svg" ? (
              <div
                className="max-h-56 w-full flex items-center justify-center overflow-auto"
                dangerouslySetInnerHTML={{ __html: img.data }}
              />
            ) : (
              <img
                src={
                  img.data.startsWith("data:")
                    ? img.data
                    : `data:image/png;base64,${img.data}`
                }
                alt={img.title || "Execution Visual"}
                className="max-h-56 mx-auto rounded object-contain"
              />
            )}
          </div>
          {img.caption && (
            <span className="text-[10px] text-slate-400 font-sans mt-2 text-center block">
              {img.caption}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

import type { ImageOutputMessage, OutputMessage } from "@codebrix/types";
import type { RendererProps } from "../registry";

export default function ImageRenderer({
  messages,
  runState,
  executionResult,
}: RendererProps<OutputMessage>) {
  const imageOutputs = messages.filter(
    (m): m is ImageOutputMessage =>
      m.type === "image" &&
      (m.format === "png" || m.format === "svg" || m.format === "base64")
  );

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

    return (
      <div className="text-slate-500 text-center py-8 font-sans text-xs">
        No images generated yet. Add a visualization or plot block and click{" "}
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
                className="max-h-56 overflow-auto"
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

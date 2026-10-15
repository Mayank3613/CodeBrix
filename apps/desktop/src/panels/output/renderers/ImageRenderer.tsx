import type { OutputMessage } from "@codebrix/types";
import type { RendererProps } from "../registry";
import { isImageOutput } from "../outputClassification";
import { ImageIcon } from "lucide-react";

export default function ImageRenderer({
  messages,
  runState,
  executionResult,
}: RendererProps<OutputMessage>) {
  const imageOutputs = messages.filter(isImageOutput);

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
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-[var(--cb-text-muted)] space-y-2">
        <ImageIcon size={28} className="text-slate-600" />
        <div className="text-[13px] font-semibold text-[var(--cb-text-primary)]">
          No Rendered Images
        </div>
        <p className="text-[11px] max-w-sm leading-relaxed">
          Saved figure files, media outputs, and raster images will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs pt-2 pb-6">
      {imageOutputs.map((img, idx) => (
        <div
          key={idx}
          className="p-3.5 rounded-[var(--cb-radius-control)] border border-[var(--cb-border-subtle)] bg-black/25 flex flex-col"
        >
          {img.title && (
            <span className="text-xs font-semibold text-slate-200 block mb-2 font-sans border-b border-[var(--cb-border-subtle)] pb-1.5">
              {img.title}
            </span>
          )}
          <div className="flex-1 flex items-center justify-center overflow-hidden p-2 min-h-[200px]">
            {img.format === "svg" ? (
              <div
                className="max-h-64 w-full flex items-center justify-center overflow-auto"
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
                className="max-h-64 w-auto max-w-full rounded object-contain"
              />
            )}
          </div>
          {img.caption && (
            <span className="text-[10px] text-[var(--cb-text-muted)] font-sans mt-2 text-center block">
              {img.caption}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

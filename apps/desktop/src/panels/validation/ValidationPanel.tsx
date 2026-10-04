import { useState } from "react";
import { useValidationStore, useUiStore, useWorkflowStore } from "../../stores";
import { blockRegistry } from "../../registry";

export default function ValidationPanel() {
  const result = useValidationStore((s) => s.validationResult);
  const clearValidation = useValidationStore((s) => s.clearValidation);
  const focusBlock = useUiStore((s) => s.focusBlock);
  const graph = useWorkflowStore((s) => s.graph);

  const [isExpanded, setIsExpanded] = useState(false);

  if (!result || (result.errors.length === 0 && result.warnings.length === 0)) {
    return null;
  }

  const getBlockName = (blockId?: string): string => {
    if (!blockId) return "Workflow Graph";
    const block = graph.blocks[blockId];
    if (block?.label) return block.label;
    if (block?.definitionId) {
      const def = blockRegistry.get(block.definitionId);
      if (def?.name) return def.name;
    }
    return blockId;
  };

  const totalIssues = result.errors.length + result.warnings.length;

  return (
    <aside aria-label="Validation Issues" className="bg-slate-900/95 backdrop-blur-md border-b border-rose-900/60 transition-all select-none shadow-lg z-30">
      {/* Summary Header Bar */}
      <div className="px-5 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          <div className="flex items-center gap-1.5 font-semibold text-rose-400 shrink-0">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Validation Issues:</span>
          </div>

          {result.errors.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-800 text-rose-300 font-mono text-[11px] shrink-0">
              {result.errors.length} error{result.errors.length > 1 ? "s" : ""}
            </span>
          )}

          {result.warnings.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-800 text-amber-300 font-mono text-[11px] shrink-0">
              {result.warnings.length} warning{result.warnings.length > 1 ? "s" : ""}
            </span>
          )}

          <div className="w-px h-3.5 bg-slate-800 mx-1 shrink-0" />

          {/* Quick list of first 3 issues as clickable buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {result.errors.slice(0, 3).map((err, i) => {
              const name = getBlockName(err.blockId);
              return (
                <button
                  key={`err-${i}`}
                  onClick={() => err.blockId && focusBlock(err.blockId)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/80 text-rose-200 text-[11px] font-mono transition-all hover:scale-[1.02] shrink-0 cursor-pointer"
                  title={`Focus '${name}': ${err.message}`}
                >
                  <span className="font-semibold text-rose-300">[{name}]</span>
                  <span className="truncate max-w-xs">{err.message}</span>
                </button>
              );
            })}

            {result.warnings.slice(0, 2).map((warn, i) => {
              const name = getBlockName(warn.blockId);
              return (
                <button
                  key={`warn-${i}`}
                  onClick={() => warn.blockId && focusBlock(warn.blockId)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/80 text-amber-200 text-[11px] font-mono transition-all hover:scale-[1.02] shrink-0 cursor-pointer"
                  title={`Focus '${name}': ${warn.message}`}
                >
                  <span className="font-semibold text-amber-300">[{name}]</span>
                  <span className="truncate max-w-xs">{warn.message}</span>
                </button>
              );
            })}

            {totalIssues > 5 && (
              <span className="text-[11px] text-slate-500 font-mono shrink-0">
                +{totalIssues - 5} more
              </span>
            )}
          </div>
        </div>

        {/* Right Actions: Expand/Collapse & Dismiss */}
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2 py-0.5 rounded text-[11px] text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isExpanded ? "▲ Collapse List" : "▼ View All Details"}
          </button>
          <button
            onClick={clearValidation}
            className="px-2 py-0.5 rounded text-[11px] text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors cursor-pointer"
            title="Dismiss validation banner"
          >
            Dismiss
          </button>
        </div>
      </div>

      {/* Expanded Details Drawer */}
      {isExpanded && (
        <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950/90 max-h-48 overflow-y-auto space-y-2 text-xs font-mono">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-sans font-semibold">
            All Graph Validation Details (Click any item to focus node on canvas)
          </div>

          <div className="space-y-1.5">
            {result.errors.map((err, idx) => {
              const name = getBlockName(err.blockId);
              return (
                <div
                  key={`detail-err-${idx}`}
                  onClick={() => err.blockId && focusBlock(err.blockId)}
                  className="flex items-start justify-between p-2 rounded-lg bg-rose-950/30 border border-rose-900/50 hover:bg-rose-950/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-rose-400 font-bold">✗</span>
                    <div>
                      <span className="font-semibold text-rose-200 mr-2">
                        [{name}]
                      </span>
                      {err.code && (
                        <span className="text-[10px] uppercase text-rose-400/80 mr-2 px-1 rounded bg-rose-900/40">
                          {err.code}
                        </span>
                      )}
                      <span className="text-slate-300">{err.message}</span>
                    </div>
                  </div>
                  {err.blockId && (
                    <span className="text-[10px] text-indigo-400 hover:underline shrink-0 ml-2">
                      Focus Block →
                    </span>
                  )}
                </div>
              );
            })}

            {result.warnings.map((warn, idx) => {
              const name = getBlockName(warn.blockId);
              return (
                <div
                  key={`detail-warn-${idx}`}
                  onClick={() => warn.blockId && focusBlock(warn.blockId)}
                  className="flex items-start justify-between p-2 rounded-lg bg-amber-950/30 border border-amber-900/50 hover:bg-amber-950/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-amber-400 font-bold">⚠</span>
                    <div>
                      <span className="font-semibold text-amber-200 mr-2">
                        [{name}]
                      </span>
                      {warn.code && (
                        <span className="text-[10px] uppercase text-amber-400/80 mr-2 px-1 rounded bg-amber-900/40">
                          {warn.code}
                        </span>
                      )}
                      <span className="text-slate-300">{warn.message}</span>
                    </div>
                  </div>
                  {warn.blockId && (
                    <span className="text-[10px] text-indigo-400 hover:underline shrink-0 ml-2">
                      Focus Block →
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}

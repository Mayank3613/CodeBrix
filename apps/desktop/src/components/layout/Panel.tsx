import type { BlockInstance } from "@codebrix/types";

interface PanelProps {
  selectedBlock: BlockInstance | null;
  onUpdateConfig: (blockId: string, key: string, value: unknown) => void;
}

export default function Panel({ selectedBlock, onUpdateConfig }: PanelProps) {
  if (!selectedBlock) {
    return (
      <div className="w-80 bg-slate-900/90 border-l border-slate-800 p-5 flex flex-col items-center justify-center text-center text-slate-500 shrink-0">
        <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-lg mb-3 text-slate-400">
          ⚙
        </div>
        <p className="text-xs font-medium text-slate-400">No Block Selected</p>
        <p className="text-[11px] text-slate-600 mt-1 max-w-[200px]">
          Click any block on the canvas to configure its parameters.
        </p>
      </div>
    );
  }

  const entries = Object.entries(selectedBlock.config);

  return (
    <div className="w-80 bg-slate-900/90 border-l border-slate-800 flex flex-col shrink-0 overflow-y-auto">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider">
            {selectedBlock.definitionId}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            {selectedBlock.state}
          </span>
        </div>
        <h3 className="text-sm font-semibold text-white tracking-tight">{selectedBlock.label}</h3>
        <p className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {selectedBlock.id}</p>
      </div>

      <div className="p-4 space-y-4 flex-1">
        <div>
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
            Configuration Schema
          </h4>

          {entries.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No configurable parameters for this block.</p>
          ) : (
            <div className="space-y-3">
              {entries.map(([key, value]) => {
                const isNumber = typeof value === "number";
                return (
                  <div key={key} className="space-y-1">
                    <label className="text-[11px] font-mono text-slate-400 block capitalize">
                      {key.replace(/_/g, " ")}
                    </label>
                    <input
                      type={isNumber ? "number" : "text"}
                      step={isNumber ? "any" : undefined}
                      value={String(value)}
                      onChange={(e) =>
                        onUpdateConfig(
                          selectedBlock.id,
                          key,
                          isNumber ? parseFloat(e.target.value) || 0 : e.target.value
                        )
                      }
                      className="w-full bg-slate-950/90 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-800/80 space-y-2">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Canvas Placement
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-400">
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
              X: {selectedBlock.position.x}px
            </div>
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
              Y: {selectedBlock.position.y}px
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useWorkflowStore, useUiStore } from "../../stores";
import { blockRegistry } from "../../registry";

export default function PropertiesPanel() {
  const isPropertiesOpen = useUiStore((s) => s.isPropertiesOpen);
  const selectedBlockId = useUiStore((s) => s.selectedBlockId);
  const selectBlock = useUiStore((s) => s.selectBlock);

  const block = useWorkflowStore((s) =>
    selectedBlockId ? s.graph.blocks[selectedBlockId] ?? null : null
  );
  const updateBlockConfig = useWorkflowStore((s) => s.updateBlockConfig);
  const removeBlock = useWorkflowStore((s) => s.removeBlock);

  if (!isPropertiesOpen) return null;

  if (!block) {
    return (
      <div className="w-80 bg-slate-900/90 backdrop-blur-md border-l border-slate-800 p-6 flex flex-col items-center justify-center text-center text-slate-500 shrink-0 select-none">
        <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-lg mb-3 text-slate-400">
          ⚙
        </div>
        <p className="text-xs font-medium text-slate-300">No Block Selected</p>
        <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
          Click any block on the canvas or palette to configure parameters and ports.
        </p>
      </div>
    );
  }

  const def = blockRegistry.get(block.definitionId);
  const schema = def?.configSchema || {};
  const schemaEntries = Object.entries(schema);

  const handleDelete = () => {
    removeBlock(block.id);
    selectBlock(null);
  };

  return (
    <div className="w-80 bg-slate-900/95 backdrop-blur-md border-l border-slate-800 flex flex-col shrink-0 overflow-y-auto select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider">
            {def?.category || "block"}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            {block.state ?? "idle"}
          </span>
        </div>
        <h3 className="text-sm font-semibold text-white tracking-tight">{block.label || def?.name}</h3>
        <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">{block.id}</p>
      </div>

      {/* Configuration Form */}
      <div className="p-4 space-y-5 flex-1">
        <div>
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
            Parameters
          </h4>

          {schemaEntries.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No configurable parameters for this block.</p>
          ) : (
            <div className="space-y-3">
              {schemaEntries.map(([key, field]) => {
                const val = block.config[key] ?? field.defaultValue ?? "";

                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-mono text-slate-300 block">
                        {field.label || key}
                      </label>
                      {field.required && (
                        <span className="text-[9px] text-rose-400 font-mono">required</span>
                      )}
                    </div>

                    {field.type === "boolean" ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(val)}
                          onChange={(e) => updateBlockConfig(block.id, key, e.target.checked)}
                          className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
                        />
                        <span className="text-xs text-slate-400">Enabled</span>
                      </label>
                    ) : field.type === "select" ? (
                      <select
                        value={String(val)}
                        onChange={(e) => updateBlockConfig(block.id, key, e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                      >
                        {field.options?.map((opt) => (
                          <option key={String(opt.value)} value={String(opt.value)}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type === "number" || field.type === "slider" ? "number" : "text"}
                        step={field.type === "number" ? "any" : undefined}
                        value={String(val)}
                        placeholder={field.placeholder}
                        onChange={(e) => {
                          const parsed =
                            field.type === "number" || field.type === "slider"
                              ? parseFloat(e.target.value) || 0
                              : e.target.value;
                          updateBlockConfig(block.id, key, parsed);
                        }}
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    )}

                    {field.description && (
                      <p className="text-[10px] text-slate-500">{field.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ports Summary */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Connected Ports
          </h4>
          <div className="space-y-1.5 text-[11px] font-mono">
            <div className="text-slate-400">
              <span className="text-slate-500">Inputs: </span>
              {def?.inputs.map((p) => p.name).join(", ") || "None"}
            </div>
            <div className="text-slate-400">
              <span className="text-slate-500">Outputs: </span>
              {def?.outputs.map((p) => p.name).join(", ") || "None"}
            </div>
          </div>
        </div>

        {/* Delete Block */}
        <div className="pt-4 border-t border-slate-800">
          <button
            onClick={handleDelete}
            className="w-full py-1.5 px-3 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            <span>🗑</span>
            <span>Delete Block</span>
          </button>
        </div>
      </div>
    </div>
  );
}

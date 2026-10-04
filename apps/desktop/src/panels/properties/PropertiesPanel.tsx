import { useState, useEffect } from "react";
import { useWorkflowStore, useUiStore } from "../../stores";
import { blockRegistry } from "../../registry";
import { validatePropertyValue } from "./propertyValidation";

export default function PropertiesPanel() {
  const isPropertiesOpen = useUiStore((s) => s.isPropertiesOpen);
  const selectedBlockId = useUiStore((s) => s.selectedBlockId);
  const selectBlock = useUiStore((s) => s.selectBlock);

  const block = useWorkflowStore((s) =>
    selectedBlockId ? s.graph.blocks[selectedBlockId] ?? null : null
  );
  const updateBlockConfig = useWorkflowStore((s) => s.updateBlockConfig);
  const removeBlock = useWorkflowStore((s) => s.removeBlock);

  // Local draft values & validation errors for live feedback
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  const [localValues, setLocalValues] = useState<Record<string, unknown>>({});

  // Reset local state when block selection changes
  useEffect(() => {
    if (block) {
      setLocalValues({ ...block.config });
      setFieldErrors({});
    }
  }, [block?.id]);

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

  const handleFieldChange = (key: string, value: unknown, fieldSchema: import("@codebrix/types").BlockConfigField) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }));

    const error = validatePropertyValue(value, fieldSchema);
    setFieldErrors((prev) => ({ ...prev, [key]: error }));

    // Only update global workflow state when value satisfies the schema
    if (error === null) {
      updateBlockConfig(block.id, key, value);
    }
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
                const currentVal = localValues[key] ?? block.config[key] ?? field.defaultValue ?? "";
                const hasError = Boolean(fieldErrors[key]);

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
                          checked={Boolean(currentVal)}
                          onChange={(e) => handleFieldChange(key, e.target.checked, field)}
                          className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
                        />
                        <span className="text-xs text-slate-400">Enabled</span>
                      </label>
                    ) : field.type === "select" ? (
                      <select
                        value={String(currentVal)}
                        onChange={(e) => handleFieldChange(key, e.target.value, field)}
                        className={`w-full bg-slate-950 border rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none transition-colors ${
                          hasError
                            ? "border-rose-500 focus:border-rose-400"
                            : "border-slate-700/80 focus:border-indigo-500"
                        }`}
                      >
                        {field.options?.map((opt) => (
                          <option key={String(opt.value)} value={String(opt.value)}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "file" ? (
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={String(currentVal)}
                          placeholder={field.placeholder || "Select or enter file path..."}
                          onChange={(e) => handleFieldChange(key, e.target.value, field)}
                          className={`flex-1 bg-slate-950 border rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none transition-colors ${
                            hasError
                              ? "border-rose-500 focus:border-rose-400"
                              : "border-slate-700/80 focus:border-indigo-500"
                          }`}
                        />
                        <label className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono cursor-pointer border border-slate-700 flex items-center shrink-0">
                          Browse
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFieldChange(key, file.name, field);
                              }
                            }}
                          />
                        </label>
                      </div>
                    ) : (
                      <input
                        type={field.type === "number" || field.type === "slider" ? "number" : "text"}
                        step={field.type === "number" || field.type === "slider" ? field.step ?? "any" : undefined}
                        min={field.min}
                        max={field.max}
                        value={String(currentVal)}
                        placeholder={field.placeholder}
                        onChange={(e) => {
                          const val =
                            field.type === "number" || field.type === "slider"
                              ? e.target.value === ""
                                ? ""
                                : Number(e.target.value)
                              : e.target.value;
                          handleFieldChange(key, val, field);
                        }}
                        className={`w-full bg-slate-950 border rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none transition-colors ${
                          hasError
                            ? "border-rose-500 focus:border-rose-400"
                            : "border-slate-700/80 focus:border-indigo-500"
                        }`}
                      />
                    )}

                    {/* Inline error feedback */}
                    {hasError && (
                      <p className="text-[10px] text-rose-400 font-mono mt-0.5">
                        ⚠ {fieldErrors[key]}
                      </p>
                    )}

                    {field.description && !hasError && (
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

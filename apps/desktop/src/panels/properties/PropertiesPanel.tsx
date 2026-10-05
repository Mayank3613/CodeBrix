import { useState, useEffect } from "react";
import { useWorkflowStore, useUiStore } from "../../stores";
import { blockRegistry } from "../../registry";
import { validatePropertyValue } from "./propertyValidation";
import {
  SlidersIcon,
  TrashIcon,
  AlertTriangleIcon,
} from "../../components/common/Icons";

export default function PropertiesPanel() {
  const isPropertiesOpen = useUiStore((s) => s.isPropertiesOpen);
  const selectedBlockId = useUiStore((s) => s.selectedBlockId);
  const selectBlock = useUiStore((s) => s.selectBlock);

  const block = useWorkflowStore((s) =>
    selectedBlockId ? s.graph.blocks[selectedBlockId] ?? null : null
  );
  const updateBlockConfig = useWorkflowStore((s) => s.updateBlockConfig);
  const updateBlockLabel = useWorkflowStore((s) => s.updateBlockLabel);
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
      <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 select-none">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-300 mb-3 shadow-lg">
          <SlidersIcon size={20} />
        </div>
        <p className="text-xs font-semibold text-slate-200">No Block Selected</p>
        <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] leading-relaxed">
          Select any block on the canvas to configure hyperparameters, rename, or inspect ports.
        </p>
      </div>
    );
  }

  const def = blockRegistry.get(block.definitionId);
  const schema = def?.configSchema || {};
  const schemaEntries = Object.entries(schema);

  // Detect dataset loaded in this block
  const rawPath = (localValues.filePath || localValues.filepath || localValues.file || localValues.path || localValues.dataset || localValues.csvPath || block.config.filePath || block.config.filepath || block.config.file || block.config.dataset || "") as string;
  const datasetName = typeof rawPath === "string" && rawPath.trim()
    ? rawPath.split(/[/\\]/).pop()?.replace(/^["']+|["']+$/g, "")
    : null;

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
    <div className="w-full h-full flex flex-col overflow-y-auto select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-white/10 bg-white/[0.02] shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/25">
            {def?.category || "block"}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span>{block.state ?? "idle"}</span>
          </span>
        </div>

        {/* Editable Block Name */}
        <div className="space-y-1">
          <label className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span>Block Display Name:</span>
            <span className="text-[9px] text-cyan-400">Click to rename</span>
          </label>
          <input
            type="text"
            value={block.label || def?.name || ""}
            onChange={(e) => updateBlockLabel(block.id, e.target.value)}
            placeholder="Enter custom block name..."
            className="cb-input text-xs font-semibold text-white !py-1 !px-2.5"
          />
        </div>

        {/* Active Dataset Banner */}
        {datasetName && (
          <div className="mt-2.5 p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2 truncate">
              <span className="text-cyan-400 text-xs">📊</span>
              <div className="truncate">
                <div className="text-[9px] text-cyan-400 font-mono uppercase font-semibold">Active Dataset</div>
                <div className="text-xs font-semibold text-white truncate font-mono">{datasetName}</div>
              </div>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-200 font-mono border border-cyan-500/30 font-bold shrink-0">
              loaded
            </span>
          </div>
        )}
      </div>

      {/* Configuration Form */}
      <div className="p-3.5 space-y-4 flex-1">
        <div>
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
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
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-mono text-slate-300 block truncate">
                        {field.label || key}
                      </label>
                      {field.required && (
                        <span className="text-[9px] text-rose-400 font-mono">required</span>
                      )}
                    </div>

                    {field.type === "boolean" ? (
                      /* Tactile Bento Toggle Switch inspired by reference */
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-xs text-slate-400 font-mono">
                          {Boolean(currentVal) ? "Enabled" : "Disabled"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleFieldChange(key, !Boolean(currentVal), field)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none ${
                            Boolean(currentVal)
                              ? "bg-emerald-500/90 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                              : "bg-white/[0.08] border-white/15"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out mt-0.5 ${
                              Boolean(currentVal) ? "translate-x-5" : "translate-x-0.5 bg-slate-400"
                            }`}
                          />
                        </button>
                      </div>
                    ) : field.type === "select" ? (
                      <select
                        value={String(currentVal)}
                        onChange={(e) => handleFieldChange(key, e.target.value, field)}
                        className={`w-full bg-white/[0.04] border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none transition-all ${
                          hasError
                            ? "border-rose-500 focus:border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                            : "border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                        }`}
                      >
                        {field.options?.map((opt) => (
                          <option key={String(opt.value)} value={String(opt.value)} className="bg-slate-900 text-white">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "file" ? (
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={String(currentVal)}
                          onChange={(e) => {
                            const cleaned = e.target.value.trim().replace(/^["']+|["']+$/g, "");
                            handleFieldChange(key, cleaned, field);
                          }}
                          className={`flex-1 bg-white/[0.04] border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none transition-all ${
                            hasError
                              ? "border-rose-500 focus:border-rose-400"
                              : "border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                          }`}
                        />
                        <label className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.12] text-cyan-300 hover:text-white rounded-lg text-xs font-mono cursor-pointer border border-white/10 flex items-center shrink-0 transition-colors">
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
                    ) : key === "customCode" || key === "code" || String(currentVal).includes("\n") ? (
                      <textarea
                        rows={6}
                        value={String(currentVal)}
                        placeholder={field.placeholder || "Enter Python code..."}
                        onChange={(e) => handleFieldChange(key, e.target.value, field)}
                        className={`w-full bg-black/40 border rounded-lg px-3 py-2 text-xs text-emerald-300 font-mono focus:outline-none transition-all ${
                          hasError
                            ? "border-rose-500 focus:border-rose-400"
                            : "border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                        }`}
                        spellCheck={false}
                      />
                    ) : field.type === "slider" ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={field.min ?? 0}
                            max={field.max ?? 100}
                            step={field.step ?? 1}
                            value={Number(currentVal) || 0}
                            onChange={(e) => handleFieldChange(key, Number(e.target.value), field)}
                            className="cb-range flex-1"
                          />
                          <span className="text-[11px] font-mono text-cyan-300 w-12 text-right">
                            {String(currentVal)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <input
                        type={field.type === "number" ? "number" : "text"}
                        step={field.type === "number" ? field.step ?? "any" : undefined}
                        min={field.min}
                        max={field.max}
                        value={String(currentVal)}
                        placeholder={field.placeholder}
                        onChange={(e) => {
                          const val =
                            field.type === "number"
                              ? e.target.value === ""
                                ? ""
                                : Number(e.target.value)
                              : e.target.value;
                          handleFieldChange(key, val, field);
                        }}
                        className={`w-full bg-white/[0.04] border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none transition-all ${
                          hasError
                            ? "border-rose-500 focus:border-rose-400"
                            : "border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                        }`}
                      />
                    )}

                    {/* Inline error feedback */}
                    {hasError && (
                      <div className="flex items-center gap-1 text-[10px] text-rose-400 font-mono mt-0.5">
                        <AlertTriangleIcon size={10} className="shrink-0" />
                        <span>{fieldErrors[key]}</span>
                      </div>
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

        {/* Ports Summary (Bento Sub-Card) */}
        <div className="pt-3 border-t border-white/10 space-y-2">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Connected Ports
          </h4>
          <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 space-y-1.5 text-[10px] font-mono">
            <div className="text-slate-300 truncate flex items-center gap-1.5">
              <span className="text-slate-500">Inputs:</span>
              <span className="text-cyan-300">{def?.inputs.map((p) => p.name).join(", ") || "None"}</span>
            </div>
            <div className="text-slate-300 truncate flex items-center gap-1.5">
              <span className="text-slate-500">Outputs:</span>
              <span className="text-purple-300">{def?.outputs.map((p) => p.name).join(", ") || "None"}</span>
            </div>
          </div>
        </div>

        {/* Delete Block */}
        <div className="pt-3 border-t border-white/10">
          <button
            onClick={handleDelete}
            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-rose-950/60 to-red-950/60 hover:from-rose-900/80 hover:to-red-900/80 border border-rose-500/40 hover:border-rose-400 text-rose-200 hover:text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-[0_2px_12px_rgba(244,63,94,0.25)] cursor-pointer"
          >
            <TrashIcon size={12} />
            <span>Delete Block</span>
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useWorkflowStore, useUiStore, useValidationStore, useProjectStore } from "../../stores";
import { blockRegistry } from "../../registry";
import { validatePropertyValue } from "./propertyValidation";
import {
  Trash2,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Layers,
  X,
} from "lucide-react";

export default function PropertiesPanel() {
  const isPropertiesOpen = useUiStore((s) => s.isPropertiesOpen);
  const toggleProperties = useUiStore((s) => s.toggleProperties);
  const selectedBlockId = useUiStore((s) => s.selectedBlockId);
  const selectBlock = useUiStore((s) => s.selectBlock);
  const focusBlock = useUiStore((s) => s.focusBlock);

  const graph = useWorkflowStore((s) => s.graph);
  const block = useWorkflowStore((s) =>
    selectedBlockId ? s.graph.blocks[selectedBlockId] ?? null : null
  );
  const updateBlockConfig = useWorkflowStore((s) => s.updateBlockConfig);
  const updateBlockLabel = useWorkflowStore((s) => s.updateBlockLabel);
  const removeBlock = useWorkflowStore((s) => s.removeBlock);

  const validationResult = useValidationStore((s) => s.validationResult);
  const projectName = useProjectStore((s) => s.projectName);
  const isDirty = useProjectStore((s) => s.isDirty);

  // Local draft values & validation errors for live feedback
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  const [localValues, setLocalValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (block) {
      setLocalValues({ ...block.config });
      setFieldErrors({});
    }
  }, [block?.id]);

  if (!isPropertiesOpen) return null;

  // ─────────────────────────────────────────────────────────────────
  // STATE 1: NO BLOCK SELECTED → PIPELINE OVERVIEW
  // ─────────────────────────────────────────────────────────────────
  if (!block) {
    const blockCount = Object.keys(graph.blocks).length;
    const connectionCount = graph.connections.length;
    const errors = validationResult?.errors || [];
    const warnings = validationResult?.warnings || [];
    const hasIssues = errors.length > 0 || warnings.length > 0;

    return (
      <div className="w-full h-full flex flex-col bg-[var(--cb-elevation-panel)] select-none overflow-hidden text-[12px]">
        {/* Header */}
        <div className="h-9 px-3 border-b border-[var(--cb-border-subtle)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <Layers size={13} className="text-[var(--cb-accent)]" />
            <span className="font-semibold text-[var(--cb-text-primary)]">Pipeline Overview</span>
          </div>
          <button
            onClick={toggleProperties}
            className="p-1 text-[var(--cb-text-muted)] hover:text-white rounded-[var(--cb-radius-sm)] hover:bg-white/10 transition-colors cursor-pointer"
            title="Collapse properties panel"
            aria-label="Collapse panel"
          >
            <X size={12} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Project Details Card */}
          <div className="p-3 rounded-[var(--cb-radius-control)] bg-[var(--cb-elevation-raised)] border border-[var(--cb-border-subtle)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-[var(--cb-text-muted)] uppercase tracking-wider">
                Project
              </span>
              {isDirty && (
                <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  modified
                </span>
              )}
            </div>
            <div className="font-semibold text-[13px] text-white truncate">{projectName}</div>
            <p className="text-[11px] text-[var(--cb-text-secondary)] leading-relaxed">
              Visual Machine Learning pipeline DAG workflow. Select any block on the canvas to inspect its parameters.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-[var(--cb-radius-control)] bg-white/[0.02] border border-[var(--cb-border-subtle)]">
              <div className="text-[10px] font-mono text-[var(--cb-text-muted)] uppercase">Blocks</div>
              <div className="text-[16px] font-bold font-mono text-cyan-300 mt-0.5">{blockCount}</div>
            </div>
            <div className="p-2.5 rounded-[var(--cb-radius-control)] bg-white/[0.02] border border-[var(--cb-border-subtle)]">
              <div className="text-[10px] font-mono text-[var(--cb-text-muted)] uppercase">Connections</div>
              <div className="text-[16px] font-bold font-mono text-emerald-300 mt-0.5">{connectionCount}</div>
            </div>
          </div>

          {/* Validation Issues with Click-to-Focus Block Navigation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-[var(--cb-text-muted)] uppercase tracking-wider">
                Validation Status
              </span>
              {!hasIssues && validationResult?.valid && (
                <span className="text-[10.5px] text-emerald-300 font-medium flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  Valid
                </span>
              )}
            </div>

            {hasIssues ? (
              <div className="space-y-1.5">
                {errors.map((err, idx) => {
                  const targetBlock = err.blockId ? graph.blocks[err.blockId] : null;
                  return (
                    <button
                      key={idx}
                      onClick={() => err.blockId && focusBlock(err.blockId)}
                      className="w-full text-left p-2.5 rounded-[var(--cb-radius-control)] bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/60 transition-colors flex items-start gap-2 cursor-pointer group"
                      title="Click to focus block on canvas"
                    >
                      <AlertCircle size={13} className="text-rose-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        {targetBlock && (
                          <div className="text-[10px] font-mono text-rose-300 font-semibold group-hover:underline">
                            {targetBlock.label || targetBlock.definitionId}
                          </div>
                        )}
                        <p className="text-[11px] text-rose-200 leading-tight">{err.message}</p>
                      </div>
                    </button>
                  );
                })}

                {warnings.map((warn, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-[var(--cb-radius-control)] bg-amber-950/30 border border-amber-800/50 text-[11px] text-amber-200 flex items-start gap-2"
                  >
                    <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                    <p className="leading-tight">{warn.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-[var(--cb-radius-control)] bg-white/[0.02] border border-[var(--cb-border-subtle)] text-center text-slate-400 space-y-1">
                <CheckCircle2 size={18} className="mx-auto text-emerald-400" />
                <p className="text-[11px]">No validation issues found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // STATE 2: BLOCK SELECTED → INSPECTOR
  // ─────────────────────────────────────────────────────────────────
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
    if (error === null) {
      updateBlockConfig(block.id, key, value);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[var(--cb-elevation-panel)] select-none overflow-hidden text-[12px]">
      {/* Header with Block Name + Category Chip + Close */}
      <div className="h-9 px-3 border-b border-[var(--cb-border-subtle)] flex items-center justify-between shrink-0 bg-[var(--cb-elevation-raised)]">
        <div className="flex items-center gap-2 truncate mr-2">
          <span className="text-[9.5px] font-mono uppercase px-1.5 py-0.2 rounded bg-white/10 text-cyan-300 font-semibold border border-white/5">
            {def?.category || "block"}
          </span>
          <span className="font-semibold text-white truncate text-[12px]">
            {block.label || def?.name || block.id}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleDelete}
            className="p-1 text-[var(--cb-text-muted)] hover:text-rose-400 hover:bg-rose-950/40 rounded-[var(--cb-radius-sm)] transition-colors cursor-pointer"
            title="Delete block (Del)"
            aria-label="Delete block"
          >
            <Trash2 size={12} />
          </button>
          <button
            onClick={() => selectBlock(null)}
            className="p-1 text-[var(--cb-text-muted)] hover:text-white rounded-[var(--cb-radius-sm)] hover:bg-white/10 transition-colors cursor-pointer"
            title="Deselect block"
            aria-label="Close inspector"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Block Display Name Editable Field */}
        <div className="space-y-1">
          <label className="text-[10px] font-mono text-[var(--cb-text-muted)] uppercase tracking-wider">
            Block Label
          </label>
          <input
            type="text"
            value={block.label || def?.name || ""}
            onChange={(e) => updateBlockLabel(block.id, e.target.value)}
            className="w-full h-7 px-2.5 bg-[var(--cb-elevation-raised)] border border-[var(--cb-border-subtle)] focus:border-[var(--cb-accent)] rounded-[var(--cb-radius-control)] text-white text-[12px] font-medium outline-none transition-colors"
          />
        </div>

        {/* Section 1: Parameters */}
        <div className="space-y-3">
          <div className="text-[10.5px] font-mono text-[var(--cb-text-muted)] uppercase tracking-wider border-b border-[var(--cb-border-subtle)] pb-1">
            Parameters
          </div>

          {schemaEntries.length === 0 ? (
            <p className="text-[11px] text-[var(--cb-text-muted)] italic">No configurable parameters.</p>
          ) : (
            <div className="space-y-2.5">
              {schemaEntries.map(([key, field]) => {
                const currentVal = localValues[key] ?? block.config[key] ?? field.defaultValue ?? "";
                const hasError = Boolean(fieldErrors[key]);

                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-mono text-[var(--cb-text-secondary)] truncate">
                        {field.label || key}
                      </label>
                      {field.required && (
                        <span className="text-[9px] text-rose-400 font-mono">req</span>
                      )}
                    </div>

                    {field.type === "boolean" ? (
                      <button
                        type="button"
                        onClick={() => handleFieldChange(key, !Boolean(currentVal), field)}
                        className={`w-full h-7 px-2.5 rounded-[var(--cb-radius-control)] border text-[11px] font-mono flex items-center justify-between transition-colors cursor-pointer ${
                          Boolean(currentVal)
                            ? "bg-[var(--cb-accent-subtle)] border-[var(--cb-accent-border)] text-emerald-300"
                            : "bg-white/[0.02] border-[var(--cb-border-subtle)] text-[var(--cb-text-muted)]"
                        }`}
                      >
                        <span>{Boolean(currentVal) ? "True" : "False"}</span>
                        <span className={`w-2 h-2 rounded-full ${Boolean(currentVal) ? "bg-[var(--cb-accent)]" : "bg-slate-600"}`} />
                      </button>
                    ) : field.type === "select" ? (
                      <select
                        value={String(currentVal)}
                        onChange={(e) => handleFieldChange(key, e.target.value, field)}
                        className="w-full h-7 px-2 bg-[var(--cb-elevation-raised)] border border-[var(--cb-border-subtle)] focus:border-[var(--cb-accent)] rounded-[var(--cb-radius-control)] text-white text-[11px] font-mono outline-none"
                      >
                        {field.options?.map((opt) => (
                          <option key={String(opt.value)} value={String(opt.value)} className="bg-[var(--cb-elevation-overlay)]">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "slider" ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={field.min ?? 0}
                          max={field.max ?? 100}
                          step={field.step ?? 1}
                          value={Number(currentVal) || 0}
                          onChange={(e) => handleFieldChange(key, Number(e.target.value), field)}
                          className="flex-1 accent-[var(--cb-accent)]"
                        />
                        <span className="text-[11px] font-mono text-cyan-300 w-10 text-right">
                          {String(currentVal)}
                        </span>
                      </div>
                    ) : field.type === "file" ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={String(currentVal)}
                          onChange={(e) => handleFieldChange(key, e.target.value, field)}
                          className="flex-1 h-7 px-2 bg-[var(--cb-elevation-raised)] border border-[var(--cb-border-subtle)] focus:border-[var(--cb-accent)] rounded-[var(--cb-radius-control)] text-white text-[11px] font-mono outline-none"
                        />
                        <label className="h-7 px-2.5 bg-white/10 hover:bg-white/15 text-white rounded-[var(--cb-radius-control)] text-[11px] font-medium flex items-center cursor-pointer transition-colors">
                          Browse
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleFieldChange(key, f.name, field);
                            }}
                          />
                        </label>
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
                          const val = field.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value;
                          handleFieldChange(key, val, field);
                        }}
                        className="w-full h-7 px-2 bg-[var(--cb-elevation-raised)] border border-[var(--cb-border-subtle)] focus:border-[var(--cb-accent)] rounded-[var(--cb-radius-control)] text-white text-[11px] font-mono outline-none"
                      />
                    )}

                    {hasError && (
                      <span className="text-[10px] text-rose-400 font-mono block">{fieldErrors[key]}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 2: Ports */}
        <div className="space-y-2 pt-2 border-t border-[var(--cb-border-subtle)]">
          <div className="text-[10.5px] font-mono text-[var(--cb-text-muted)] uppercase tracking-wider">
            Ports Contract
          </div>

          <div className="p-2.5 rounded-[var(--cb-radius-control)] bg-[var(--cb-elevation-raised)] border border-[var(--cb-border-subtle)] space-y-2 text-[11px] font-mono">
            <div>
              <span className="text-[10px] text-[var(--cb-text-muted)] uppercase tracking-wider block mb-1">
                Inputs ({def?.inputs.length || 0}):
              </span>
              <div className="flex flex-wrap gap-1">
                {def?.inputs.map((p) => (
                  <span key={p.id} className="px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-cyan-300">
                    {p.name} ({p.type})
                  </span>
                ))}
                {def?.inputs.length === 0 && <span className="text-slate-500 italic">None</span>}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-[var(--cb-text-muted)] uppercase tracking-wider block mb-1">
                Outputs ({def?.outputs.length || 0}):
              </span>
              <div className="flex flex-wrap gap-1">
                {def?.outputs.map((p) => (
                  <span key={p.id} className="px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-emerald-300">
                    {p.name} ({p.type})
                  </span>
                ))}
                {def?.outputs.length === 0 && <span className="text-slate-500 italic">None</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Notes & Documentation */}
        <div className="space-y-1.5 pt-2 border-t border-[var(--cb-border-subtle)]">
          <div className="text-[10.5px] font-mono text-[var(--cb-text-muted)] uppercase tracking-wider">
            Documentation & Notes
          </div>
          <p className="text-[11px] text-[var(--cb-text-secondary)] leading-relaxed">
            {def?.description || "No documentation available for this block."}
          </p>
          <div className="text-[10px] font-mono text-[var(--cb-text-muted)] pt-1">
            ID: <span className="text-slate-400">{def?.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect, memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { BlockNodeData } from "./adapter";
import { blockRegistry } from "../registry";
import { useValidationStore, useExecutionStore, useWorkflowStore } from "../stores";
import type { PortType } from "@codebrix/types";
import {
  Database,
  SlidersHorizontal,
  Brain,
  BarChart2,
  LineChart,
  Layers,
  Edit2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import Tooltip from "../components/common/Tooltip";

// Port type color mapping and shape descriptions
const PORT_THEMES: Record<
  PortType,
  { color: string; bg: string; text: string; shape: string; typeName: string }
> = {
  dataframe: {
    color: "#06b6d4",
    bg: "bg-cyan-500",
    text: "text-cyan-400",
    shape: "tabular dataset",
    typeName: "DataFrame",
  },
  dataset: {
    color: "#06b6d4",
    bg: "bg-cyan-500",
    text: "text-cyan-400",
    shape: "tabular dataset",
    typeName: "DataFrame",
  },
  series: {
    color: "#06b6d4",
    bg: "bg-cyan-500",
    text: "text-cyan-400",
    shape: "1D series",
    typeName: "Series",
  },
  array: {
    color: "#14b8a6",
    bg: "bg-teal-500",
    text: "text-teal-400",
    shape: "array/vector",
    typeName: "Array",
  },
  model: {
    color: "#8b5cf6",
    bg: "bg-purple-500",
    text: "text-purple-400",
    shape: "estimator",
    typeName: "Model",
  },
  scalar: {
    color: "#10b981",
    bg: "bg-emerald-500",
    text: "text-emerald-400",
    shape: "scalar value",
    typeName: "Scalar",
  },
  number: {
    color: "#10b981",
    bg: "bg-emerald-500",
    text: "text-emerald-400",
    shape: "numeric",
    typeName: "Number",
  },
  figure: {
    color: "#ec4899",
    bg: "bg-pink-500",
    text: "text-pink-400",
    shape: "visual plot",
    typeName: "Figure",
  },
  file: {
    color: "#0ea5e9",
    bg: "bg-sky-500",
    text: "text-sky-400",
    shape: "file path",
    typeName: "File",
  },
  dict: {
    color: "#a855f7",
    bg: "bg-violet-500",
    text: "text-violet-400",
    shape: "key-value dict",
    typeName: "Dict",
  },
  boolean: {
    color: "#f43f5e",
    bg: "bg-rose-500",
    text: "text-rose-400",
    shape: "bool flag",
    typeName: "Boolean",
  },
  string: {
    color: "#94a3b8",
    bg: "bg-slate-400",
    text: "text-slate-300",
    shape: "text string",
    typeName: "String",
  },
  any: {
    color: "#94a3b8",
    bg: "bg-slate-400",
    text: "text-slate-400",
    shape: "generic",
    typeName: "Any",
  },
};

const CATEGORY_ICONS: Record<string, typeof Database> = {
  data: Database,
  preprocessing: SlidersHorizontal,
  ml: Brain,
  evaluation: BarChart2,
  visualization: LineChart,
  core: Layers,
};

const CATEGORY_COLORS: Record<string, string> = {
  data: "var(--cb-cat-data)",
  preprocessing: "var(--cb-cat-prep)",
  ml: "var(--cb-cat-ml)",
  evaluation: "var(--cb-cat-eval)",
  visualization: "var(--cb-cat-viz)",
  core: "var(--cb-accent)",
};

const EMPTY_ERRORS: import("@codebrix/types").ValidationError[] = [];

function BlockNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as BlockNodeData;
  const def = blockRegistry.get(nodeData.definitionId);

  const errors = useValidationStore((s) => s.errorMapByBlockId[id] || EMPTY_ERRORS);
  const blockStatus = useExecutionStore((s) => s.blockStatuses[id] || nodeData.state || "idle");
  const latestResult = useExecutionStore((s) => s.latestResult);

  const blockInstance = useWorkflowStore((s) => s.graph.blocks[id]);
  const updateBlockLabel = useWorkflowStore((s) => s.updateBlockLabel);

  const inputs = def?.inputs || [];
  const outputs = def?.outputs || [];

  const hasError = errors.length > 0;
  const isRunning = blockStatus === "running";
  const isSuccess = blockStatus === "success";
  const isFailed = blockStatus === "failed";

  const category = (def?.category || "core") as string;
  const CategoryIcon = CATEGORY_ICONS[category] || Layers;
  const categoryColor = CATEGORY_COLORS[category] || "var(--cb-accent)";

  // Block execution duration if available
  const blockResult = latestResult?.blockResults?.[id];
  const blockDurationMs = blockResult?.durationMs;
  const durationLabel =
    typeof blockDurationMs === "number" && !Number.isNaN(blockDurationMs)
      ? blockDurationMs >= 1000
        ? `${(blockDurationMs / 1000).toFixed(1)}s`
        : `${Math.round(blockDurationMs)}ms`
      : null;

  // Loaded dataset name detection
  const config = blockInstance?.config || (nodeData as unknown as { config?: Record<string, unknown> }).config || {};
  const rawPath = (config.filePath || config.filepath || config.file || config.path || config.dataset || config.csvPath || "") as string;
  const datasetName = typeof rawPath === "string" && rawPath.trim()
    ? rawPath.split(/[/\\]/).pop()?.replace(/^["']+|["']+$/g, "")
    : null;

  // Inline renaming
  const currentLabel = blockInstance?.label || nodeData.label || def?.name || nodeData.definitionId;
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(currentLabel);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(currentLabel);
  }, [currentLabel]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSaveLabel = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== currentLabel) {
      updateBlockLabel(id, trimmed);
    }
    setIsEditing(false);
  };

  // Node outline classes
  let outlineClass = "border-[var(--cb-border-default)] hover:border-[var(--cb-border-strong)]";
  if (selected) {
    outlineClass = "border-[var(--cb-accent)] ring-2 ring-[var(--cb-accent-ring)] shadow-[0_0_16px_rgba(16,185,129,0.25)]";
  } else if (hasError) {
    outlineClass = "border-rose-500/80 ring-1 ring-rose-500/40";
  } else if (isRunning) {
    outlineClass = "border-cyan-400 ring-2 ring-cyan-400/40 animate-pulse";
  }

  // Parameter summary preview
  const paramEntries = Object.entries(config).filter(([k, v]) => {
    if (k === "filePath" || k === "filepath" || k === "path" || k === "file" || k === "customCode") return false;
    return v !== undefined && v !== "" && typeof v !== "object";
  });

  return (
    <div
      className={`w-[280px] rounded-[var(--cb-radius-panel)] bg-[var(--cb-elevation-panel)] border text-[12px] select-none shadow-[var(--cb-shadow-tooltip)] relative transition-all duration-150 ${outlineClass}`}
      style={{ borderTopColor: categoryColor, borderTopWidth: "3px" }}
    >
      {/* ── Node Header: Category Chip + Full Title + Run Status / Duration ── */}
      <div className="h-10 px-3 border-b border-[var(--cb-border-subtle)] bg-[var(--cb-elevation-raised)] rounded-t-[calc(var(--cb-radius-panel)-2px)] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
          {/* Category Icon Chip Tinted by Category Hue */}
          <div
            className="w-6 h-6 rounded-[var(--cb-radius-sm)] flex items-center justify-center shrink-0"
            style={{
              backgroundColor: `color-mix(in srgb, ${categoryColor} 18%, transparent)`,
              color: categoryColor,
            }}
            title={`Category: ${def?.category || "block"}`}
          >
            <CategoryIcon size={14} />
          </div>

          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSaveLabel}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") handleSaveLabel();
                if (e.key === "Escape") {
                  setEditValue(currentLabel);
                  setIsEditing(false);
                }
              }}
              className="bg-black/80 border border-[var(--cb-accent)] rounded px-1.5 py-0.5 text-[12px] text-white font-medium outline-none w-36"
            />
          ) : (
            <Tooltip content={`${currentLabel} • ${def?.category || "block"}`} side="top">
              <div
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="flex items-center gap-1 truncate cursor-text group/title min-w-0"
              >
                <span className="font-semibold text-[var(--cb-text-primary)] text-[13px] truncate">
                  {currentLabel}
                </span>
                <Edit2 size={10} className="text-slate-400 opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0" />
              </div>
            </Tooltip>
          )}
        </div>

        {/* Right: Run Duration or Status Dot */}
        <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
          {isRunning ? (
            <Loader2 size={12} className="animate-spin text-cyan-400" />
          ) : isSuccess ? (
            <div className="flex items-center gap-1">
              {durationLabel && (
                <span className="text-[10px] text-[var(--cb-text-muted)] font-mono">{durationLabel}</span>
              )}
              <span className="w-2 h-2 rounded-full bg-[var(--cb-success)] shadow-[0_0_6px_rgba(16,185,129,0.7)]" />
            </div>
          ) : isFailed || hasError ? (
            <span className="w-2 h-2 rounded-full bg-[var(--cb-error)] shadow-[0_0_6px_rgba(239,68,68,0.7)]" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-slate-500/60" />
          )}
        </div>
      </div>

      {/* ── Node Body ── */}
      <div className="p-3 space-y-2">
        {/* Dataset badge if loaded */}
        {datasetName && (
          <div className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 font-mono text-[10px] truncate">
            📄 {datasetName}
          </div>
        )}

        {/* Parameter summary pill list */}
        {paramEntries.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {paramEntries.slice(0, 2).map(([k, v]) => (
              <span
                key={k}
                className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-white/[0.04] text-[var(--cb-text-secondary)] border border-white/5 truncate max-w-[110px]"
                title={`${k}: ${String(v)}`}
              >
                {k}={String(v)}
              </span>
            ))}
            {paramEntries.length > 2 && (
              <span className="text-[9px] font-mono text-[var(--cb-text-muted)] self-center">
                +{paramEntries.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Error Callout */}
        {hasError && (
          <div className="p-1.5 rounded bg-rose-950/60 border border-rose-800/80 text-[10.5px] text-rose-300 flex items-start gap-1 leading-tight">
            <AlertTriangle size={12} className="shrink-0 text-rose-400 mt-0.5" />
            <span className="truncate">{errors[0]?.message}</span>
          </div>
        )}

        {/* ── Input & Output Ports with Type-based Palette & Tooltip ── */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* Inputs */}
          <div className="space-y-1.5">
            {inputs.map((port) => {
              const theme = PORT_THEMES[port.type] || PORT_THEMES.any;
              const tooltipText = `${theme.typeName} • ${theme.shape}`;
              return (
                <div key={port.id} className="relative flex items-center gap-1.5">
                  <Tooltip content={tooltipText} side="left">
                    <Handle
                      type="target"
                      position={Position.Left}
                      id={port.id}
                      className={`!w-2.5 !h-2.5 !-left-4.5 ${theme.bg} !border-2 !border-[var(--cb-elevation-panel)] transition-transform hover:scale-125`}
                    />
                  </Tooltip>
                  <Tooltip content={tooltipText} side="top">
                    <span className={`text-[11px] font-mono truncate cursor-default ${theme.text}`}>
                      {port.name}
                    </span>
                  </Tooltip>
                </div>
              );
            })}
          </div>

          {/* Outputs */}
          <div className="space-y-1.5 text-right">
            {outputs.map((port) => {
              const theme = PORT_THEMES[port.type] || PORT_THEMES.any;
              const tooltipText = `${theme.typeName} • ${theme.shape}`;
              return (
                <div key={port.id} className="relative flex items-center justify-end gap-1.5">
                  <Tooltip content={tooltipText} side="top">
                    <span className={`text-[11px] font-mono truncate cursor-default ${theme.text}`}>
                      {port.name}
                    </span>
                  </Tooltip>
                  <Tooltip content={tooltipText} side="right">
                    <Handle
                      type="source"
                      position={Position.Right}
                      id={port.id}
                      className={`!w-2.5 !h-2.5 !-right-4.5 ${theme.bg} !border-2 !border-[var(--cb-elevation-panel)] transition-transform hover:scale-125`}
                    />
                  </Tooltip>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export const BlockNode = memo(BlockNodeComponent);

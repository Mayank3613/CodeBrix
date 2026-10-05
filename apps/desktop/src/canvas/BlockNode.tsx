import { useState, useRef, useEffect, memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { BlockNodeData } from "./adapter";
import { blockRegistry } from "../registry";
import { useValidationStore, useExecutionStore, useWorkflowStore } from "../stores";
import type { PortType } from "@codebrix/types";
import { CheckIcon, CloseIcon, AlertTriangleIcon } from "../components/common/Icons";

// Port type color mapping
const PORT_COLORS: Record<PortType, { bg: string; border: string; text: string }> = {
  dataframe: { bg: "bg-cyan-500", border: "border-cyan-300", text: "text-cyan-300" },
  dataset: { bg: "bg-blue-500", border: "border-blue-300", text: "text-blue-300" },
  series: { bg: "bg-indigo-500", border: "border-indigo-300", text: "text-indigo-300" },
  model: { bg: "bg-purple-500", border: "border-purple-300", text: "text-purple-300" },
  scalar: { bg: "bg-emerald-500", border: "border-emerald-300", text: "text-emerald-300" },
  number: { bg: "bg-emerald-500", border: "border-emerald-300", text: "text-emerald-300" },
  string: { bg: "bg-slate-300", border: "border-slate-100", text: "text-slate-200" },
  boolean: { bg: "bg-rose-500", border: "border-rose-300", text: "text-rose-300" },
  array: { bg: "bg-teal-500", border: "border-teal-300", text: "text-teal-300" },
  file: { bg: "bg-sky-500", border: "border-sky-300", text: "text-sky-300" },
  figure: { bg: "bg-pink-500", border: "border-pink-300", text: "text-pink-300" },
  dict: { bg: "bg-violet-500", border: "border-violet-300", text: "text-violet-300" },
  any: { bg: "bg-slate-400", border: "border-slate-200", text: "text-slate-200" },
};

const EMPTY_ERRORS: import("@codebrix/types").ValidationError[] = [];

function BlockNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as BlockNodeData;
  const def = blockRegistry.get(nodeData.definitionId);

  const errors = useValidationStore((s) => s.errorMapByBlockId[id] || EMPTY_ERRORS);
  const blockStatus = useExecutionStore((s) => s.blockStatuses[id] || nodeData.state || "idle");

  const blockInstance = useWorkflowStore((s) => s.graph.blocks[id]);
  const updateBlockLabel = useWorkflowStore((s) => s.updateBlockLabel);

  const inputs = def?.inputs || [];
  const outputs = def?.outputs || [];

  const hasError = errors.length > 0;
  const isRunning = blockStatus === "running";
  const isSuccess = blockStatus === "success";
  const isFailed = blockStatus === "failed";

  // Loaded dataset name detection
  const config = blockInstance?.config || (nodeData as unknown as { config?: Record<string, unknown> }).config || {};
  const rawPath = (config.filePath || config.filepath || config.file || config.path || config.dataset || config.csvPath || "") as string;
  const datasetName = typeof rawPath === "string" && rawPath.trim()
    ? rawPath.split(/[/\\]/).pop()?.replace(/^["']+|["']+$/g, "")
    : null;

  // Inline renaming in playground
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

  // Dynamic visual styling combining selection, execution status, and validation issues
  let borderAndRingClass = "border-white/15 hover:border-white/30";
  if (hasError) {
    borderAndRingClass = "border-rose-500/80 ring-2 ring-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.3)]";
  } else if (isRunning) {
    borderAndRingClass = "border-cyan-400 ring-2 ring-cyan-400/50 shadow-[0_0_24px_rgba(6,182,212,0.4)] animate-pulse";
  } else if (isSuccess) {
    borderAndRingClass = "border-emerald-500/80 ring-1 ring-emerald-500/40 shadow-[0_0_16px_rgba(16,185,129,0.25)]";
  } else if (isFailed) {
    borderAndRingClass = "border-rose-500 ring-2 ring-rose-500/60 shadow-[0_0_24px_rgba(244,63,94,0.4)]";
  }

  const selectionClass = selected
    ? "ring-2 ring-cyan-400 shadow-[0_0_24px_rgba(6,182,212,0.4)] border-cyan-400"
    : "";

  // Extract brief parameter summary entries for quick overview
  const schema = def?.configSchema || {};
  const paramEntries = Object.entries(config).filter(([k, v]) => {
    if (k === "filePath" || k === "filepath" || k === "path" || k === "file") return false;
    return v !== undefined && v !== "" && typeof v !== "object";
  });

  return (
    <div
      className={`min-w-[245px] rounded-2xl backdrop-blur-2xl bg-[#0c1224]/95 border transition-all text-xs select-none shadow-[0_18px_38px_-6px_rgba(0,0,0,0.75),inset_0_1px_1.5px_0_rgba(255,255,255,0.22)] relative ${borderAndRingClass} ${selectionClass}`}
    >
      {/* Node Header */}
      <div className="px-3.5 py-2.5 border-b border-white/15 bg-gradient-to-r from-white/[0.10] to-transparent rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-2 truncate">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              isRunning
                ? "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.9)] animate-ping"
                : isSuccess
                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                : isFailed
                ? "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]"
                : hasError
                ? "bg-rose-500"
                : "bg-slate-400"
            }`}
          />

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
              className="bg-black/90 border border-cyan-400 rounded px-2 py-0.5 text-xs text-white font-semibold outline-none w-36 shadow-inner"
            />
          ) : (
            <div
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="flex items-center gap-1.5 group/label cursor-text truncate max-w-[155px]"
              title="Double-click to rename this block"
            >
              <span className="font-semibold text-white text-[13px] tracking-tight truncate">
                {currentLabel}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="opacity-0 group-hover/label:opacity-100 text-slate-300 hover:text-cyan-300 transition-opacity p-0.5 cursor-pointer"
                title="Rename block"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono font-medium uppercase px-2 py-0.5 rounded-full bg-white/[0.08] text-slate-200 border border-white/15">
            {def?.category || "block"}
          </span>
        </div>
      </div>

      {/* Node Content & Ports */}
      <div className="p-3.5 space-y-2.5">
        {/* Status bar slot - Shows dataset name or clean description */}
        <div className="flex items-center justify-between text-[11px] font-mono border-b border-white/10 pb-1.5">
          {datasetName ? (
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 font-mono text-[10px] truncate max-w-[140px] shadow-sm font-medium"
              title={`Loaded dataset: ${datasetName}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
              <span className="truncate font-semibold">{datasetName}</span>
            </div>
          ) : (
            <span className="text-slate-300 font-medium truncate max-w-[130px] text-[11px]" title={def?.name || "Block"}>
              {def?.name || "Block"}
            </span>
          )}

          <div className="flex items-center gap-1.5 font-medium text-[11px]">
            {isRunning ? (
              <span className="text-cyan-300 flex items-center gap-1">
                <svg
                  className="animate-spin h-3 w-3 text-cyan-300"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                <span>Running</span>
              </span>
            ) : isSuccess ? (
              <span className="text-emerald-300 flex items-center gap-1">
                <CheckIcon size={12} />
                <span>Completed</span>
              </span>
            ) : isFailed ? (
              <span className="text-rose-300 flex items-center gap-1">
                <CloseIcon size={11} />
                <span>Failed</span>
              </span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <span>Idle</span>
              </span>
            )}
          </div>
        </div>

        {/* Compact Parameter Badges visible directly on block */}
        {paramEntries.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-hidden flex-wrap pt-0.5">
            {paramEntries.slice(0, 3).map(([k, v]) => (
              <span
                key={k}
                className="text-[9.5px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-slate-200 border border-white/15 truncate max-w-[100px] font-medium"
                title={`${k}: ${String(v)}`}
              >
                {k}: {String(v)}
              </span>
            ))}
            {paramEntries.length > 3 && (
              <span className="text-[9px] font-mono text-slate-400 font-medium">
                +{paramEntries.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Validation Error banner if present */}
        {hasError && (
          <div className="p-2 rounded-lg bg-rose-950/80 border border-rose-800 text-[10.5px] text-rose-200 leading-tight flex items-start gap-1.5">
            <AlertTriangleIcon size={13} className="shrink-0 text-rose-400 mt-0.5" />
            <div>
              <span className="font-medium">{errors[0]?.message}</span>
              {errors.length > 1 && (
                <span className="text-rose-300 font-mono ml-1 text-[9.5px]">
                  (+{errors.length - 1} more)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Input & Output Ports */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Inputs */}
          <div className="space-y-2">
            {inputs.map((port) => {
              const theme = PORT_COLORS[port.type] || PORT_COLORS.any;
              return (
                <div key={port.id} className="relative flex items-center gap-2">
                  <Handle
                    type="target"
                    position={Position.Left}
                    id={port.id}
                    className={`!w-3 !h-3 !-left-5 ${theme.bg} !border-2 ${theme.border} transition-transform hover:scale-125 shadow-sm`}
                  />
                  <span className={`text-[11px] font-mono font-medium truncate ${theme.text}`}>
                    {port.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Outputs */}
          <div className="space-y-2 text-right">
            {outputs.map((port) => {
              const theme = PORT_COLORS[port.type] || PORT_COLORS.any;
              return (
                <div key={port.id} className="relative flex items-center justify-end gap-2">
                  <span className={`text-[11px] font-mono font-medium truncate ${theme.text}`}>
                    {port.name}
                  </span>
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={port.id}
                    className={`!w-3 !h-3 !-right-5 ${theme.bg} !border-2 ${theme.border} transition-transform hover:scale-125 shadow-sm`}
                  />
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

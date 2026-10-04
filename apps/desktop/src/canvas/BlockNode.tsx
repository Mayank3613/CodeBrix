import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { BlockNodeData } from "./adapter";
import { blockRegistry } from "../registry";
import { useValidationStore, useExecutionStore } from "../stores";
import type { PortType } from "@codebrix/types";

// Port type color mapping
const PORT_COLORS: Record<PortType, { bg: string; border: string; text: string }> = {
  dataframe: { bg: "bg-cyan-500", border: "border-cyan-300", text: "text-cyan-300" },
  dataset: { bg: "bg-blue-500", border: "border-blue-300", text: "text-blue-300" },
  series: { bg: "bg-indigo-500", border: "border-indigo-300", text: "text-indigo-300" },
  model: { bg: "bg-purple-500", border: "border-purple-300", text: "text-purple-300" },
  scalar: { bg: "bg-emerald-500", border: "border-emerald-300", text: "text-emerald-300" },
  number: { bg: "bg-emerald-500", border: "border-emerald-300", text: "text-emerald-300" },
  string: { bg: "bg-amber-500", border: "border-amber-300", text: "text-amber-300" },
  boolean: { bg: "bg-rose-500", border: "border-rose-300", text: "text-rose-300" },
  array: { bg: "bg-teal-500", border: "border-teal-300", text: "text-teal-300" },
  file: { bg: "bg-yellow-500", border: "border-yellow-300", text: "text-yellow-300" },
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

  const inputs = def?.inputs || [];
  const outputs = def?.outputs || [];

  const hasError = errors.length > 0;
  const isRunning = blockStatus === "running";
  const isSuccess = blockStatus === "success";
  const isFailed = blockStatus === "failed";

  // Dynamic visual styling combining selection, execution status, and validation issues
  let borderAndRingClass = "border-slate-800 hover:border-slate-600";
  if (hasError) {
    borderAndRingClass = "border-rose-500 ring-2 ring-rose-500/40 shadow-lg shadow-rose-500/20";
  } else if (isRunning) {
    borderAndRingClass = "border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/25 animate-pulse";
  } else if (isSuccess) {
    borderAndRingClass = "border-emerald-500/90 ring-1 ring-emerald-500/40 shadow-emerald-500/10";
  } else if (isFailed) {
    borderAndRingClass = "border-rose-500 ring-2 ring-rose-500/60 shadow-lg shadow-rose-500/30";
  }

  const selectionClass = selected
    ? "outline-2 outline-indigo-400 outline-offset-2 shadow-indigo-500/30 shadow-xl"
    : "";

  return (
    <div
      className={`min-w-[220px] rounded-xl backdrop-blur-md bg-slate-900/95 border transition-all text-xs select-none shadow-xl ${borderAndRingClass} ${selectionClass}`}
    >
      {/* Node Header */}
      <div className="px-3 py-2 border-b border-slate-800/80 bg-gradient-to-r from-slate-800/80 to-slate-900/60 rounded-t-xl flex items-center justify-between">
        <div className="flex items-center gap-2 truncate">
          <span
            className={`w-2 h-2 rounded-full ${
              isRunning
                ? "bg-amber-400 animate-ping"
                : isSuccess
                ? "bg-emerald-400"
                : isFailed
                ? "bg-rose-400"
                : hasError
                ? "bg-rose-500"
                : "bg-indigo-400"
            }`}
          />
          <span className="font-semibold text-white tracking-tight truncate">
            {nodeData.label || def?.name || nodeData.definitionId}
          </span>
        </div>
        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-950/80 text-slate-400 border border-slate-800">
          {def?.category || "block"}
        </span>
      </div>

      {/* Node Content & Ports */}
      <div className="p-3 space-y-2">
        {/* Status bar slot */}
        <div className="flex items-center justify-between text-[10px] font-mono border-b border-slate-800/50 pb-1.5">
          <span className="text-slate-500 truncate max-w-[110px]" title={id}>
            {id}
          </span>

          <div className="flex items-center gap-1.5 font-semibold">
            {isRunning ? (
              <span className="text-amber-400 flex items-center gap-1">
                <svg
                  className="animate-spin h-2.5 w-2.5 text-amber-400"
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
              <span className="text-emerald-400 flex items-center gap-1">
                <span>✓</span>
                <span>Completed</span>
              </span>
            ) : isFailed ? (
              <span className="text-rose-400 flex items-center gap-1">
                <span>✗</span>
                <span>Failed</span>
              </span>
            ) : (
              <span className="text-slate-500 flex items-center gap-1 font-normal">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                <span>Idle</span>
              </span>
            )}
          </div>
        </div>

        {/* Validation Error banner if present */}
        {hasError && (
          <div className="p-1.5 rounded bg-rose-950/70 border border-rose-800/90 text-[10px] text-rose-300 leading-tight">
            <span className="font-bold mr-1">⚠</span>
            <span>{errors[0]?.message}</span>
            {errors.length > 1 && (
              <span className="text-rose-400 font-mono ml-1 text-[9px]">
                (+{errors.length - 1} more)
              </span>
            )}
          </div>
        )}

        {/* Input & Output Ports */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* Inputs */}
          <div className="space-y-2">
            {inputs.map((port) => {
              const theme = PORT_COLORS[port.type] || PORT_COLORS.any;
              return (
                <div key={port.id} className="relative flex items-center gap-1.5">
                  <Handle
                    type="target"
                    position={Position.Left}
                    id={port.id}
                    className={`!w-2.5 !h-2.5 !-left-4.5 ${theme.bg} !border-2 ${theme.border} transition-transform hover:scale-125`}
                  />
                  <span className={`text-[10px] font-mono truncate ${theme.text}`}>
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
                <div key={port.id} className="relative flex items-center justify-end gap-1.5">
                  <span className={`text-[10px] font-mono truncate ${theme.text}`}>
                    {port.name}
                  </span>
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={port.id}
                    className={`!w-2.5 !h-2.5 !-right-4.5 ${theme.bg} !border-2 ${theme.border} transition-transform hover:scale-125`}
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

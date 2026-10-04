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

function BlockNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as BlockNodeData;
  const def = blockRegistry.get(nodeData.definitionId);

  const errors = useValidationStore((s) => s.errorMapByBlockId[id] || []);
  const blockStatus = useExecutionStore((s) => s.blockStatuses[id] || nodeData.state || "idle");

  const inputs = def?.inputs || [];
  const outputs = def?.outputs || [];

  const hasError = errors.length > 0;
  const isRunning = blockStatus === "running";
  const isSuccess = blockStatus === "success";
  const isFailed = blockStatus === "failed";

  return (
    <div
      className={`min-w-[220px] rounded-xl backdrop-blur-md bg-slate-900/95 border transition-all text-xs select-none shadow-xl ${
        selected
          ? "border-indigo-400 ring-2 ring-indigo-500/30 shadow-indigo-500/20"
          : hasError
          ? "border-rose-500 ring-2 ring-rose-500/30"
          : isRunning
          ? "border-amber-400 ring-2 ring-amber-500/40 animate-pulse"
          : isSuccess
          ? "border-emerald-500/80"
          : isFailed
          ? "border-rose-500"
          : "border-slate-800 hover:border-slate-600"
      }`}
    >
      {/* Node Header */}
      <div className="px-3 py-2 border-b border-slate-800/80 bg-gradient-to-r from-slate-800/80 to-slate-900/60 rounded-t-xl flex items-center justify-between">
        <div className="flex items-center gap-2 truncate">
          <span className="w-2 h-2 rounded-full bg-indigo-400" />
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
        {/* Status bar */}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span className="text-slate-500 truncate max-w-[120px]">{id}</span>
          <span
            className={`capitalize font-semibold ${
              isRunning
                ? "text-amber-400"
                : isSuccess
                ? "text-emerald-400"
                : isFailed
                ? "text-rose-400"
                : "text-slate-400"
            }`}
          >
            {blockStatus}
          </span>
        </div>

        {/* Validation Error banner if present */}
        {hasError && (
          <div className="p-1.5 rounded bg-rose-950/60 border border-rose-800/80 text-[10px] text-rose-300">
            ⚠ {errors[0]?.message}
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

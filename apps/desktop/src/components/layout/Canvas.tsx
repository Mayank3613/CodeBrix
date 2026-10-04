import type { WorkflowGraph } from "@codebrix/types";

interface CanvasProps {
  graph: WorkflowGraph;
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string) => void;
  executingBlockId?: string | null;
}

export default function Canvas({
  graph,
  selectedBlockId,
  onSelectBlock,
  executingBlockId,
}: CanvasProps) {
  const blocks = Object.values(graph.blocks);

  // Helper to get block category color
  const getCategoryTheme = (definitionId: string) => {
    if (definitionId.startsWith("data.")) return { bg: "from-blue-500/20 to-cyan-500/10", border: "border-blue-500/40", text: "text-blue-300" };
    if (definitionId.startsWith("ml.")) return { bg: "from-purple-500/20 to-pink-500/10", border: "border-purple-500/40", text: "text-purple-300" };
    if (definitionId.startsWith("eval.")) return { bg: "from-emerald-500/20 to-teal-500/10", border: "border-emerald-500/40", text: "text-emerald-300" };
    return { bg: "from-slate-500/20 to-zinc-500/10", border: "border-slate-500/40", text: "text-slate-300" };
  };

  return (
    <div className="flex-1 bg-slate-950 relative overflow-auto p-8 select-none">
      {/* Background dot grid pattern */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* SVG Canvas for Connections */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <defs>
          <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        {graph.connections.map((conn) => {
          const source = graph.blocks[conn.sourceBlockId];
          const target = graph.blocks[conn.targetBlockId];
          if (!source || !target) return null;

          const sx = source.position.x + 200;
          const sy = source.position.y + 40;
          const tx = target.position.x;
          const ty = target.position.y + 40;
          const dx = Math.abs(tx - sx) * 0.5;

          return (
            <g key={conn.id}>
              <path
                d={`M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`}
                fill="none"
                stroke="url(#edge-gradient)"
                strokeWidth="2.5"
                className="opacity-70 hover:opacity-100 transition-opacity"
              />
              <circle cx={sx} cy={sy} r="3" fill="#38bdf8" />
              <circle cx={tx} cy={ty} r="3" fill="#818cf8" />
            </g>
          );
        })}
      </svg>

      {/* Block Nodes */}
      <div className="relative z-10 w-[1200px] h-[500px]">
        {blocks.map((block) => {
          const isSelected = selectedBlockId === block.id;
          const isExecuting = executingBlockId === block.id;
          const theme = getCategoryTheme(block.definitionId);

          return (
            <div
              key={block.id}
              onClick={() => onSelectBlock(block.id)}
              style={{
                transform: `translate(${block.position.x}px, ${block.position.y}px)`,
                width: "200px",
              }}
              className={`absolute rounded-xl backdrop-blur-md bg-slate-900/90 border transition-all cursor-pointer shadow-xl ${
                isSelected
                  ? "border-indigo-400 ring-2 ring-indigo-500/30 scale-105 z-20 shadow-indigo-500/20"
                  : isExecuting
                  ? "border-amber-400 ring-2 ring-amber-500/40 animate-pulse"
                  : `${theme.border} hover:border-slate-500`
              }`}
            >
              {/* Header */}
              <div className={`px-3 py-2 border-b border-slate-800/80 bg-gradient-to-r ${theme.bg} rounded-t-xl flex items-center justify-between`}>
                <span className="text-xs font-semibold text-white tracking-tight truncate">
                  {block.label}
                </span>
                <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${theme.text} bg-slate-950/60`}>
                  {block.definitionId.split(".")[0]}
                </span>
              </div>

              {/* Body */}
              <div className="p-3 text-[11px] text-slate-400 space-y-1.5">
                <div className="flex items-center justify-between font-mono text-[10px] text-slate-500">
                  <span>ID: {block.id}</span>
                  <span className="capitalize text-emerald-400">{block.state}</span>
                </div>
                {Object.keys(block.config).length > 0 && (
                  <div className="text-[10px] bg-slate-950/60 p-1.5 rounded border border-slate-800/50 font-mono text-slate-300 truncate">
                    {Object.entries(block.config)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(", ")}
                  </div>
                )}
              </div>

              {/* Connection handle badges */}
              <div className="px-3 pb-2 pt-0 flex justify-between text-[9px] font-mono text-slate-500">
                <span>● In</span>
                <span>Out ●</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
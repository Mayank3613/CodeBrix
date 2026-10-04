import { useState, useMemo } from "react";
import { blockRegistry } from "../registry";
import { useWorkflowStore, useUiStore } from "../stores";
import type { BlockDefinition, BlockCategory } from "@codebrix/types";

const CATEGORY_LABELS: Record<BlockCategory, { title: string; color: string }> = {
  data: { title: "Data Loaders", color: "text-cyan-400" },
  preprocessing: { title: "Preprocessing", color: "text-blue-400" },
  ml: { title: "Machine Learning", color: "text-purple-400" },
  evaluation: { title: "Evaluation", color: "text-emerald-400" },
  visualization: { title: "Visualization", color: "text-pink-400" },
  core: { title: "Core Logic", color: "text-amber-400" },
  custom: { title: "Custom Blocks", color: "text-slate-400" },
};

export default function Palette() {
  const [search, setSearch] = useState("");
  const isPaletteOpen = useUiStore((s) => s.isPaletteOpen);
  const addBlock = useWorkflowStore((s) => s.addBlock);

  const blocks = useMemo(() => {
    return blockRegistry.search(search);
  }, [search]);

  const grouped = useMemo(() => {
    const map = new Map<BlockCategory, BlockDefinition[]>();
    for (const block of blocks) {
      if (!map.has(block.category)) {
        map.set(block.category, []);
      }
      map.get(block.category)!.push(block);
    }
    return map;
  }, [blocks]);

  if (!isPaletteOpen) return null;

  const handleAdd = (def: BlockDefinition) => {
    // Spawn near center
    const x = 300 + Math.random() * 80;
    const y = 200 + Math.random() * 80;
    addBlock(def, { x, y });
  };

  return (
    <div className="w-64 bg-slate-900/90 backdrop-blur-md border-r border-slate-800 flex flex-col shrink-0 overflow-hidden select-none">
      {/* Palette Header */}
      <div className="p-3 border-b border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Block Palette
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {blocks.length} blocks
          </span>
        </div>
        <input
          type="text"
          placeholder="Filter blocks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-950/80 border border-slate-700/70 rounded-md px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Palette Categories & List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {Array.from(grouped.entries()).map(([cat, catBlocks]) => {
          const catInfo = CATEGORY_LABELS[cat] || { title: cat, color: "text-slate-400" };
          return (
            <div key={cat} className="space-y-1">
              <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                <span className={catInfo.color}>{catInfo.title}</span>
                <span className="text-[10px] font-mono text-slate-600">{catBlocks.length}</span>
              </div>

              <div className="space-y-1">
                {catBlocks.map((block) => (
                  <div
                    key={block.id}
                    onClick={() => handleAdd(block)}
                    className="group p-2 rounded-lg bg-slate-950/50 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="truncate mr-2">
                      <div className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                        {block.name}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {block.description}
                      </div>
                    </div>
                    <button
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white transition-all shrink-0"
                      title="Add to canvas"
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

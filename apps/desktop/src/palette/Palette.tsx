import { useState, useMemo } from "react";
import { blockRegistry } from "../registry";
import { useWorkflowStore, useUiStore } from "../stores";
import { useLibraryStore } from "../stores/libraryStore";
import type { BlockDefinition, BlockCategory } from "@codebrix/types";
import ImportLibraryDialog from "../panels/library/ImportLibraryDialog";

const CATEGORY_LABELS: Record<BlockCategory, { title: string; color: string; badgeBg: string }> = {
  data: { title: "Data Loaders", color: "text-cyan-400", badgeBg: "bg-cyan-950/60 border-cyan-800/60" },
  preprocessing: { title: "Preprocessing", color: "text-blue-400", badgeBg: "bg-blue-950/60 border-blue-800/60" },
  ml: { title: "Machine Learning", color: "text-purple-400", badgeBg: "bg-purple-950/60 border-purple-800/60" },
  evaluation: { title: "Evaluation", color: "text-emerald-400", badgeBg: "bg-emerald-950/60 border-emerald-800/60" },
  visualization: { title: "Visualization", color: "text-pink-400", badgeBg: "bg-pink-950/60 border-pink-800/60" },
  core: { title: "Core Logic", color: "text-amber-400", badgeBg: "bg-amber-950/60 border-amber-800/60" },
  custom: { title: "Custom Blocks", color: "text-slate-400", badgeBg: "bg-slate-900 border-slate-700" },
};

export default function Palette() {
  const [search, setSearch] = useState("");
  const [selectedLibrary, setSelectedLibrary] = useState<string>("all");
  const [isImportOpen, setIsImportOpen] = useState(false);

  const isPaletteOpen = useUiStore((s) => s.isPaletteOpen);
  const addBlock = useWorkflowStore((s) => s.addBlock);

  const libraries = useLibraryStore((s) => s.libraries);
  const warnings = useLibraryStore((s) => s.warnings);
  const dismissWarning = useLibraryStore((s) => s.dismissWarning);

  // Dynamic library tabs derived from installed/imported libraries
  const libraryTabs = useMemo(() => {
    const list: Array<{ id: string; label: string }> = [{ id: "all", label: "All" }];
    const labelMap: Record<string, string> = {
      data: "Data",
      core: "Core",
      "scikit-learn": "ML",
      visualization: "Viz",
    };
    for (const lib of libraries) {
      if (lib.enabled !== false && !list.some((item) => item.id === lib.manifest.name)) {
        list.push({
          id: lib.manifest.name,
          label: labelMap[lib.manifest.name] ?? lib.manifest.name,
        });
      }
    }
    return list;
  }, [libraries]);

  // Filter blocks by search and library
  const blocks = useMemo(() => {
    let result = blockRegistry.search(search);

    if (selectedLibrary !== "all") {
      const activeLib = libraries.find((l) => l.manifest.name === selectedLibrary);
      result = result.filter((block) => {
        if (activeLib && activeLib.blockIds.length > 0 && activeLib.blockIds.includes(block.id)) {
          return true;
        }
        if (selectedLibrary === "core") return block.id.startsWith("core.") || block.category === "core";
        if (selectedLibrary === "data") return block.id.startsWith("data.") || block.category === "data";
        if (selectedLibrary === "scikit-learn") return block.id.startsWith("ml.") || block.id.startsWith("sklearn.");
        if (selectedLibrary === "visualization") return block.id.startsWith("eval.") || block.category === "visualization";
        return block.tags?.includes(selectedLibrary) ?? false;
      });
    }

    return result;
  }, [search, selectedLibrary, libraries]);

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
    // Spawn near center of canvas
    const x = 280 + Math.random() * 80;
    const y = 180 + Math.random() * 80;
    addBlock(def, { x, y });
  };

  const handleDragStart = (e: React.DragEvent, block: BlockDefinition) => {
    e.dataTransfer.setData("application/codebrix-block-id", block.id);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <>
      <div className="w-72 bg-slate-900/95 backdrop-blur-md border-r border-slate-800 flex flex-col shrink-0 overflow-hidden select-none">
        {/* Palette Header */}
        <div className="p-3 border-b border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              Block Palette
            </span>
            <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded">
              {blocks.length} blocks
            </span>
          </div>

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search blocks, tags, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/70 rounded-md pl-7 pr-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
            />
            <span className="absolute left-2.5 top-2 text-slate-500 text-xs">🔍</span>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1.5 text-slate-500 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Library Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] scrollbar-none">
            {libraryTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedLibrary(tab.id)}
                className={`px-2 py-0.5 rounded-full font-medium whitespace-nowrap transition-all ${
                  selectedLibrary === tab.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Warning Banners for invalid libraries */}
        {warnings.length > 0 && (
          <div className="bg-amber-950/40 border-b border-amber-900/60 p-2 space-y-1">
            {warnings.map((warn, idx) => (
              <div
                key={idx}
                className="text-[10px] text-amber-300 font-mono flex items-start justify-between gap-1 leading-tight"
              >
                <span>⚠️ {warn}</span>
                <button
                  onClick={() => dismissWarning(idx)}
                  className="text-amber-400 hover:text-white shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Block Categories & Drag-and-drop Items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {Array.from(grouped.entries()).map(([cat, catBlocks]) => {
            const catInfo = CATEGORY_LABELS[cat] || {
              title: cat,
              color: "text-slate-400",
              badgeBg: "bg-slate-900 border-slate-700",
            };
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
                      draggable
                      onDragStart={(e) => handleDragStart(e, block)}
                      onClick={() => handleAdd(block)}
                      className="group p-2 rounded-lg bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-600 cursor-grab active:cursor-grabbing transition-all flex items-center justify-between"
                      title="Drag to canvas or click to add"
                    >
                      <div className="truncate mr-2 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                            {block.name}
                          </span>
                          {block.id.startsWith("core.") && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950/80 text-amber-400 border border-amber-800/60 font-mono">
                              core
                            </span>
                          )}
                          {block.id.startsWith("data.") && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 font-mono">
                              data
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                          {block.description}
                        </div>
                      </div>

                      <button
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0"
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

          {blocks.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-500 space-y-1">
              <div>No blocks found matching filter.</div>
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedLibrary("all");
                }}
                className="text-indigo-400 hover:underline text-[11px]"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>

        {/* Palette Footer with Import Library Button */}
        <div className="p-2 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            onClick={() => setIsImportOpen(true)}
            className="w-full py-1.5 px-3 rounded-lg border border-slate-700/80 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-medium transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>📦</span>
            <span>Import Library...</span>
          </button>
        </div>
      </div>

      {/* Import Library Dialog Modal */}
      <ImportLibraryDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />
    </>
  );
}

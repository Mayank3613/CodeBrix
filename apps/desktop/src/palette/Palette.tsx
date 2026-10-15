import { useState, useMemo, useEffect, useRef } from "react";
import { blockRegistry } from "../registry";
import { useWorkflowStore, useUiStore, useProjectStore } from "../stores";
import { useCustomBlockStore } from "../stores/customBlockStore";
import type { BlockDefinition, BlockCategory } from "@codebrix/types";
import { PIPELINE_TEMPLATES, type PipelineTemplate } from "../templates/pipelineTemplates";
import { autoLayoutGraphLeftToRight } from "../canvas/layout";
import ImportLibraryDialog from "../panels/library/ImportLibraryDialog";
import CustomBlockModal from "./CustomBlockModal";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Database,
  SlidersHorizontal,
  Brain,
  BarChart2,
  LineChart,
  Layers,
  GripVertical,
  Plus,
  Trash2,
  FileUp,
  Sparkles,
  Compass,
  Code2,
  X,
} from "lucide-react";

// Category metadata
interface CategoryConfig {
  id: BlockCategory;
  name: string;
  icon: typeof Database;
  colorVar: string;
  badgeClass: string;
}

const CATEGORIES: CategoryConfig[] = [
  { id: "data", name: "Data Ingestion & Sinks", icon: Database, colorVar: "var(--cb-cat-data)", badgeClass: "text-cyan-300 bg-cyan-950/40 border-cyan-800/60" },
  { id: "preprocessing", name: "Data Preprocessing", icon: SlidersHorizontal, colorVar: "var(--cb-cat-prep)", badgeClass: "text-blue-300 bg-blue-950/40 border-blue-800/60" },
  { id: "ml", name: "Machine Learning", icon: Brain, colorVar: "var(--cb-cat-ml)", badgeClass: "text-purple-300 bg-purple-950/40 border-purple-800/60" },
  { id: "evaluation", name: "Evaluation & Metrics", icon: BarChart2, colorVar: "var(--cb-cat-eval)", badgeClass: "text-amber-300 bg-amber-950/40 border-amber-800/60" },
  { id: "visualization", name: "Visualizations & Plots", icon: LineChart, colorVar: "var(--cb-cat-viz)", badgeClass: "text-pink-300 bg-pink-950/40 border-pink-800/60" },
  { id: "core", name: "Core & Utility", icon: Layers, colorVar: "var(--cb-accent)", badgeClass: "text-emerald-300 bg-emerald-950/40 border-emerald-800/60" },
];

export default function Palette() {
  const activeSection = useUiStore((s) => s.activePaletteSection);
  const setActiveSection = useUiStore((s) => s.setActivePaletteSection);
  const selectedBlockId = useUiStore((s) => s.selectedBlockId);
  const selectBlock = useUiStore((s) => s.selectBlock);

  const graph = useWorkflowStore((s) => s.graph);
  const setGraph = useWorkflowStore((s) => s.setGraph);
  const addBlock = useWorkflowStore((s) => s.addBlock);
  const removeBlock = useWorkflowStore((s) => s.removeBlock);
  const setProjectName = useProjectStore((s) => s.setProjectName);
  const markDirty = useProjectStore((s) => s.markDirty);

  const customBlocks = useCustomBlockStore((s) => s.customBlocks);
  const deleteCustomBlock = useCustomBlockStore((s) => s.deleteCustomBlock);

  const [search, setSearch] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");
  const [openCategories, setOpenCategories] = useState<Set<string>>(() => new Set(["data"])); // First open by default
  const [hoveredBlock, setHoveredBlock] = useState<{ block: BlockDefinition; rect: DOMRect } | null>(null);

  const isCustomBlockModalOpen = useUiStore((s) => s.isCustomBlockModalOpen);
  const editCustomBlockId = useUiStore((s) => s.editCustomBlockId);
  const openCustomBlockModal = useUiStore((s) => s.openCustomBlockModal);
  const closeCustomBlockModal = useUiStore((s) => s.closeCustomBlockModal);
  const [isImportLibraryOpen, setIsImportLibraryOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  // Global "/" keyboard shortcut to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setActiveSection("library");
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setActiveSection]);

  // Listen to switch palette section custom events
  useEffect(() => {
    const handleSwitch = (e: CustomEvent<{ section: import("../stores").PaletteSection }>) => {
      if (e.detail?.section) {
        setActiveSection(e.detail.section);
      }
    };
    window.addEventListener("codebrix:switch-palette-section" as any, handleSwitch);
    return () => window.removeEventListener("codebrix:switch-palette-section" as any, handleSwitch);
  }, [setActiveSection]);

  const allBlocks = useMemo(() => {
    return blockRegistry.list();
  }, []);

  const searchedBlocks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allBlocks.filter((b) => {
      if (activeCategoryFilter !== "all" && b.category !== activeCategoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.tags?.some((t) => t.toLowerCase().includes(q)) ||
        b.inputs.some((p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q)) ||
        b.outputs.some((p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q))
      );
    });
  }, [allBlocks, search, activeCategoryFilter]);

  const toggleCategory = (catId: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, block: BlockDefinition) => {
    e.dataTransfer.setData("application/codebrix-block-id", block.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleMouseEnterBlock = (e: React.MouseEvent, block: BlockDefinition) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    hoverTimeoutRef.current = window.setTimeout(() => {
      setHoveredBlock({ block, rect });
    }, 200);
  };

  const handleMouseLeaveBlock = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = window.setTimeout(() => {
      setHoveredBlock(null);
    }, 150);
  };

  const handleLoadTemplate = (tpl: PipelineTemplate) => {
    if (
      Object.keys(graph.blocks).length > 0 &&
      !window.confirm(`Load "${tpl.title}" template? Current canvas workflow will be replaced.`)
    ) {
      return;
    }
    const normalizedConnections = (tpl.graph.connections || []).map((c: any) => ({
      id: c.id,
      sourceBlockId: c.sourceBlockId ?? c.fromBlockId,
      sourcePortId: c.sourcePortId ?? c.fromPortId,
      targetBlockId: c.targetBlockId ?? c.toBlockId,
      targetPortId: c.targetPortId ?? c.toPortId,
    }));
    const newPositions = autoLayoutGraphLeftToRight({
      ...tpl.graph,
      connections: normalizedConnections,
    });
    const layoutedBlocks = { ...tpl.graph.blocks };
    for (const [id, pos] of Object.entries(newPositions)) {
      if (layoutedBlocks[id]) {
        layoutedBlocks[id] = {
          ...layoutedBlocks[id],
          position: pos,
        };
      }
    }
    setGraph({
      ...tpl.graph,
      blocks: layoutedBlocks,
      connections: normalizedConnections,
    });
    setProjectName(tpl.title);
    markDirty(true);
    if (typeof window !== "undefined") {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("codebrix:fit-view"));
      }, 50);
    }
  };

  const canvasBlocks = Object.values(graph.blocks);

  return (
    <aside aria-label="Block Palette" className="w-full h-full flex flex-col bg-[var(--cb-elevation-panel)] select-none overflow-hidden relative">
      {/* ─────────────────────────────────────────────────────────────
          SECTION: BLOCKS LIBRARY (Primary)
         ───────────────────────────────────────────────────────────── */}
      {activeSection === "library" && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Single-line Header: "Blocks (49)" */}
          <div className="h-9 px-3 flex items-center justify-between border-b border-[var(--cb-border-subtle)] shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-semibold text-[var(--cb-text-primary)]">Blocks</span>
              <span className="text-[11px] font-mono text-[var(--cb-text-muted)]">
                ({searchedBlocks.length})
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setOpenCategories(new Set(CATEGORIES.map((c) => c.id)))}
                className="text-[10px] text-[var(--cb-text-muted)] hover:text-white px-1.5 py-0.5 rounded-[var(--cb-radius-sm)] hover:bg-white/10 transition-colors cursor-pointer"
              >
                Expand
              </button>
              <button
                onClick={() => setOpenCategories(new Set())}
                className="text-[10px] text-[var(--cb-text-muted)] hover:text-white px-1.5 py-0.5 rounded-[var(--cb-radius-sm)] hover:bg-white/10 transition-colors cursor-pointer"
              >
                Collapse
              </button>
            </div>
          </div>

          {/* Search Box with "/" Shortcut Badge */}
          <div className="p-2 border-b border-[var(--cb-border-subtle)] shrink-0 space-y-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--cb-text-muted)] pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search blocks, algorithms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-7 pl-8 pr-12 text-[12px] bg-[var(--cb-elevation-raised)] border border-[var(--cb-border-subtle)] focus:border-[var(--cb-accent)] rounded-[var(--cb-radius-control)] text-[var(--cb-text-primary)] placeholder-[var(--cb-text-muted)] outline-none transition-colors"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {search ? (
                  <button
                    onClick={() => setSearch("")}
                    className="p-0.5 text-[var(--cb-text-muted)] hover:text-white cursor-pointer"
                  >
                    <X size={11} />
                  </button>
                ) : (
                  <kbd className="px-1 py-0.2 rounded bg-white/10 font-mono text-[9px] text-[var(--cb-text-muted)] border border-white/10">
                    /
                  </kbd>
                )}
              </div>
            </div>

            {/* Horizontally Scrollable Category Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none">
              {[
                { id: "all", label: "All" },
                { id: "data", label: "Data" },
                { id: "preprocessing", label: "Prep" },
                { id: "ml", label: "ML" },
                { id: "evaluation", label: "Eval" },
                { id: "visualization", label: "Viz" },
              ].map((chip) => {
                const isActive = activeCategoryFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    onClick={() => setActiveCategoryFilter(chip.id)}
                    className={`h-5 px-2 rounded-full text-[10.5px] font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center shrink-0 border ${
                      isActive
                        ? "bg-[var(--cb-accent-subtle)] text-emerald-300 border-[var(--cb-accent-border)] font-semibold"
                        : "bg-white/[0.03] text-[var(--cb-text-secondary)] hover:text-white hover:bg-white/[0.08] border-transparent"
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Flat Tree Categories & Compact Block Rows */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            {CATEGORIES.map((cat) => {
              const blocksInCat = searchedBlocks.filter((b) => b.category === cat.id);
              if (blocksInCat.length === 0) return null;

              const isOpen = openCategories.has(cat.id) || search.trim().length > 0;
              const Icon = cat.icon;

              return (
                <div key={cat.id} className="rounded-[var(--cb-radius-control)] overflow-hidden">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className="w-full h-7 px-2 flex items-center justify-between text-left hover:bg-white/[0.06] rounded-[var(--cb-radius-sm)] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-[var(--cb-text-muted)] group-hover:text-white">
                        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </span>
                      <Icon size={13} style={{ color: cat.colorVar }} className="shrink-0" />
                      <span className="text-[12px] font-semibold text-[var(--cb-text-primary)] truncate">
                        {cat.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-[var(--cb-text-muted)] px-1.5 py-0.2 rounded bg-white/[0.05]">
                      {blocksInCat.length}
                    </span>
                  </button>

                  {/* Compact Block Rows */}
                  {isOpen && (
                    <div className="pl-3.5 pr-0.5 py-0.5 space-y-0.5 border-l border-[var(--cb-border-subtle)] ml-3">
                      {blocksInCat.map((block) => (
                        <div
                          key={block.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, block)}
                          onMouseEnter={(e) => handleMouseEnterBlock(e, block)}
                          onMouseLeave={handleMouseLeaveBlock}
                          onClick={() => {
                            // Quick click to add to center of canvas
                            addBlock(block, { x: 300 + Math.random() * 80, y: 180 + Math.random() * 80 });
                          }}
                          className="h-7 px-2 rounded-[var(--cb-radius-sm)] hover:bg-white/[0.08] flex items-center justify-between cursor-grab active:cursor-grabbing transition-colors group"
                          title="Click to add or drag onto canvas"
                        >
                          <div className="flex items-center gap-2 truncate flex-1 mr-1">
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: cat.colorVar }}
                            />
                            <span className="text-[12px] text-[var(--cb-text-secondary)] group-hover:text-white font-medium truncate">
                              {block.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <GripVertical size={12} className="text-[var(--cb-text-muted)]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {searchedBlocks.length === 0 && (
              <div className="py-8 text-center text-xs text-[var(--cb-text-muted)]">
                No blocks match "{search}"
              </div>
            )}
          </div>

          {/* Footer: Subtle Text Button "Import Library Manifest..." */}
          <div className="p-2 border-t border-[var(--cb-border-subtle)] shrink-0">
            <button
              onClick={() => setIsImportLibraryOpen(true)}
              className="w-full h-7 px-2 rounded-[var(--cb-radius-control)] hover:bg-white/[0.06] text-[11px] text-[var(--cb-text-muted)] hover:text-[var(--cb-text-primary)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-transparent hover:border-[var(--cb-border-subtle)]"
            >
              <FileUp size={12} />
              <span>Import Library Manifest...</span>
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION: PIPELINE OUTLINE
         ───────────────────────────────────────────────────────────── */}
      {activeSection === "playground" && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="h-9 px-3 flex items-center justify-between border-b border-[var(--cb-border-subtle)] shrink-0">
            <div className="flex items-center gap-1.5">
              <Compass size={13} className="text-[var(--cb-accent)]" />
              <span className="text-[12px] font-semibold text-[var(--cb-text-primary)]">Pipeline Outline</span>
            </div>
            <span className="text-[10px] font-mono text-[var(--cb-text-muted)] px-1.5 py-0.2 rounded bg-white/[0.05]">
              {canvasBlocks.length} nodes
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {canvasBlocks.length === 0 ? (
              <div className="py-12 text-center text-xs text-[var(--cb-text-muted)] space-y-2">
                <Compass size={24} className="mx-auto text-slate-600" />
                <p>No blocks on canvas yet.</p>
                <button
                  onClick={() => setActiveSection("library")}
                  className="px-2.5 py-1 rounded-[var(--cb-radius-control)] bg-[var(--cb-accent)] hover:bg-[var(--cb-accent-hover)] text-white text-[11px] font-medium transition-colors cursor-pointer"
                >
                  Browse Blocks
                </button>
              </div>
            ) : (
              canvasBlocks.map((blk) => {
                const def = blockRegistry.get(blk.definitionId);
                const isSelected = selectedBlockId === blk.id;
                return (
                  <div
                    key={blk.id}
                    onClick={() => selectBlock(blk.id)}
                    className={`px-2.5 py-1.5 rounded-[var(--cb-radius-control)] border transition-all cursor-pointer flex items-center justify-between group ${
                      isSelected
                        ? "bg-[var(--cb-accent-subtle)] border-[var(--cb-accent-border)] text-white"
                        : "bg-white/[0.02] hover:bg-white/[0.06] border-[var(--cb-border-subtle)] text-[var(--cb-text-secondary)]"
                    }`}
                  >
                    <div className="truncate mr-2 flex-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            blk.state === "running"
                              ? "bg-cyan-400 animate-pulse"
                              : blk.state === "success"
                              ? "bg-emerald-400"
                              : blk.state === "failed"
                              ? "bg-rose-400"
                              : "bg-slate-500"
                          }`}
                        />
                        <span className="text-[12px] font-medium text-white truncate">
                          {blk.label || def?.name || blk.id}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-[var(--cb-text-muted)] mt-0.5">
                        {def?.category || "block"}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeBlock(blk.id);
                        if (selectedBlockId === blk.id) selectBlock(null);
                      }}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Delete block"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION: CUSTOM BLOCKS STUDIO
         ───────────────────────────────────────────────────────────── */}
      {activeSection === "custom" && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="h-9 px-3 flex items-center justify-between border-b border-[var(--cb-border-subtle)] shrink-0">
            <div className="flex items-center gap-1.5">
              <Code2 size={13} className="text-cyan-400" />
              <span className="text-[12px] font-semibold text-[var(--cb-text-primary)]">Custom Blocks</span>
            </div>
            <button
              onClick={() => openCustomBlockModal(null)}
              className="h-6 px-2 rounded-[var(--cb-radius-sm)] bg-[var(--cb-accent)] hover:bg-[var(--cb-accent-hover)] text-white text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus size={11} />
              <span>New</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {customBlocks.length === 0 ? (
              <div className="py-12 text-center text-xs text-[var(--cb-text-muted)] space-y-2">
                <Code2 size={24} className="mx-auto text-slate-600" />
                <p>No custom blocks created yet.</p>
                <button
                  onClick={() => openCustomBlockModal(null)}
                  className="px-2.5 py-1 rounded-[var(--cb-radius-control)] bg-white/10 hover:bg-white/15 text-white text-[11px] font-medium transition-colors cursor-pointer"
                >
                  Create Custom Block
                </button>
              </div>
            ) : (
              customBlocks.map((blk) => (
                <div
                  key={blk.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, blk)}
                  className="p-2 rounded-[var(--cb-radius-control)] bg-white/[0.03] hover:bg-white/[0.07] border border-[var(--cb-border-subtle)] flex items-center justify-between cursor-grab transition-colors group"
                >
                  <div className="truncate flex-1 mr-2">
                    <span className="text-[12px] font-medium text-white">{blk.name}</span>
                    <p className="text-[10px] text-[var(--cb-text-muted)] truncate">{blk.description}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openCustomBlockModal(blk.id)}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                      title="Edit custom block"
                    >
                      <Code2 size={11} />
                    </button>
                    <button
                      onClick={() => deleteCustomBlock(blk.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 cursor-pointer"
                      title="Delete custom block"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION: BLUEPRINT TEMPLATES
         ───────────────────────────────────────────────────────────── */}
      {activeSection === "templates" && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="h-9 px-3 flex items-center justify-between border-b border-[var(--cb-border-subtle)] shrink-0">
            <div className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-400" />
              <span className="text-[12px] font-semibold text-[var(--cb-text-primary)]">Blueprints</span>
            </div>
            <span className="text-[10px] font-mono text-[var(--cb-text-muted)] px-1.5 py-0.2 rounded bg-white/[0.05]">
              {PIPELINE_TEMPLATES.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {PIPELINE_TEMPLATES.map((tpl) => (
              <div
                key={tpl.id}
                onClick={() => handleLoadTemplate(tpl)}
                className="p-2.5 rounded-[var(--cb-radius-control)] bg-white/[0.03] hover:bg-white/[0.08] border border-[var(--cb-border-subtle)] hover:border-[var(--cb-accent-border)] transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-semibold text-white group-hover:text-[var(--cb-accent)] transition-colors">
                    {tpl.title}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--cb-text-muted)]">
                    {tpl.nodeCount} nodes
                  </span>
                </div>
                <p className="text-[11px] text-[var(--cb-text-muted)] line-clamp-2">
                  {tpl.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Hover Preview Popover ─── */}
      {hoveredBlock && (
        <div
          style={{
            top: Math.max(8, Math.min(window.innerHeight - 240, hoveredBlock.rect.top)),
            left: hoveredBlock.rect.right + 12,
          }}
          className="fixed z-50 w-64 p-3 bg-[var(--cb-elevation-overlay)] border border-[var(--cb-border-strong)] rounded-[var(--cb-radius-panel)] shadow-[var(--cb-shadow-overlay)] text-[12px] pointer-events-none animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-white text-[13px]">{hoveredBlock.block.name}</span>
            <span className="text-[9.5px] uppercase font-mono px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
              {hoveredBlock.block.category}
            </span>
          </div>

          <p className="text-[11px] text-[var(--cb-text-secondary)] leading-relaxed mb-2.5">
            {hoveredBlock.block.description || "No description provided."}
          </p>

          <div className="space-y-1.5 pt-1 border-t border-[var(--cb-border-subtle)] text-[10.5px]">
            {hoveredBlock.block.inputs.length > 0 && (
              <div>
                <span className="text-[var(--cb-text-muted)] uppercase tracking-wider text-[9px] font-mono">Inputs:</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {hoveredBlock.block.inputs.map((inp) => (
                    <span key={inp.id} className="px-1.5 py-0.2 rounded bg-white/5 border border-white/10 font-mono text-[9.5px] text-cyan-300">
                      {inp.name} ({inp.type})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {hoveredBlock.block.outputs.length > 0 && (
              <div>
                <span className="text-[var(--cb-text-muted)] uppercase tracking-wider text-[9px] font-mono">Outputs:</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {hoveredBlock.block.outputs.map((out) => (
                    <span key={out.id} className="px-1.5 py-0.2 rounded bg-white/5 border border-white/10 font-mono text-[9.5px] text-emerald-300">
                      {out.name} ({out.type})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-2 text-[9.5px] font-mono text-[var(--cb-text-muted)] italic">
            Drag to canvas or click to insert
          </div>
        </div>
      )}

      {/* Dialog Modals */}
      {isImportLibraryOpen && (
        <ImportLibraryDialog
          isOpen={isImportLibraryOpen}
          onClose={() => setIsImportLibraryOpen(false)}
        />
      )}

      {isCustomBlockModalOpen && (
        <CustomBlockModal
          isOpen={isCustomBlockModalOpen}
          onClose={closeCustomBlockModal}
          editBlockId={editCustomBlockId}
        />
      )}
    </aside>
  );
}

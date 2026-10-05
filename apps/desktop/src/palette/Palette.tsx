import { useState, useMemo, useEffect, useRef } from "react";
import { blockRegistry } from "../registry";
import { useWorkflowStore, useUiStore } from "../stores";
import { useLibraryStore } from "../stores/libraryStore";
import { useCustomBlockStore } from "../stores/customBlockStore";
import type { BlockDefinition, BlockCategory, PortType } from "@codebrix/types";
import ImportLibraryDialog from "../panels/library/ImportLibraryDialog";
import CustomBlockModal from "./CustomBlockModal";
import {
  SearchIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
  CloseIcon,
  AlertTriangleIcon,
  EditIcon,
  TrashIcon,
  ShareIcon,
  LayersIcon,
  SparklesIcon,
  CodeIcon,
} from "../components/common/Icons";

// ─── TREE STRUCTURE DEFINITIONS ──────────────────────────────────────

interface TreeGroup {
  id: string;
  title: string;
  code: string;
  color: string;
  badgeBg: string;
  categoryFilter?: BlockCategory;
  subgroups: TreeSubgroup[];
}

interface TreeSubgroup {
  id: string;
  title: string;
  match: (block: BlockDefinition) => boolean;
}

const TREE_GROUPS: TreeGroup[] = [
  {
    id: "group-custom",
    title: "Custom Blocks",
    code: "CUST",
    color: "text-rose-400",
    badgeBg: "bg-rose-950/60 border-rose-800/60",
    categoryFilter: "custom",
    subgroups: [
      {
        id: "sub-custom-all",
        title: "User Defined Blocks",
        match: (b) => b.category === "custom" || b.id.startsWith("custom."),
      },
    ],
  },
  {
    id: "group-data",
    title: "Data Ingestion & Sinks",
    code: "DATA",
    color: "text-cyan-400",
    badgeBg: "bg-cyan-950/60 border-cyan-800/60",
    categoryFilter: "data",
    subgroups: [
      {
        id: "sub-data-loaders",
        title: "File Loaders",
        match: (b) =>
          b.category === "data" &&
          (b.id.includes("loader") ||
            b.id.includes("csv") ||
            b.id.includes("json") ||
            b.id.includes("excel") ||
            b.id.includes("parquet")),
      },
      {
        id: "sub-data-generators",
        title: "Dataset Generators",
        match: (b) =>
          b.category === "data" &&
          (b.id.includes("synthetic") || b.tags?.includes("generator") === true),
      },
      {
        id: "sub-data-export",
        title: "Exporters & Sinks",
        match: (b) =>
          b.category === "data" &&
          (b.id.includes("export") ||
            b.tags?.includes("export") === true ||
            b.tags?.includes("sink") === true),
      },
      {
        id: "sub-data-general",
        title: "Other Data Blocks",
        match: (b) =>
          b.category === "data" &&
          !b.id.includes("loader") &&
          !b.id.includes("csv") &&
          !b.id.includes("json") &&
          !b.id.includes("excel") &&
          !b.id.includes("parquet") &&
          !b.id.includes("synthetic") &&
          !b.id.includes("export"),
      },
    ],
  },
  {
    id: "group-prep",
    title: "Data Preprocessing",
    code: "PREP",
    color: "text-blue-400",
    badgeBg: "bg-blue-950/60 border-blue-800/60",
    categoryFilter: "preprocessing",
    subgroups: [
      {
        id: "sub-prep-cleaning",
        title: "Cleaning & Imputation",
        match: (b) =>
          b.category === "preprocessing" &&
          (b.id.includes("imputer") || b.id.includes("drop") || b.id.includes("outlier")),
      },
      {
        id: "sub-prep-scaling",
        title: "Scaling & Encoding",
        match: (b) =>
          b.category === "preprocessing" &&
          (b.id.includes("scaler") || b.id.includes("encoder") || b.id.includes("pca")),
      },
      {
        id: "sub-prep-split",
        title: "Data Splitting",
        match: (b) => b.category === "preprocessing" && b.id.includes("split"),
      },
      {
        id: "sub-prep-other",
        title: "Other Preprocessing",
        match: (b) =>
          b.category === "preprocessing" &&
          !b.id.includes("imputer") &&
          !b.id.includes("drop") &&
          !b.id.includes("scaler") &&
          !b.id.includes("encoder") &&
          !b.id.includes("pca") &&
          !b.id.includes("split"),
      },
    ],
  },
  {
    id: "group-ml-class",
    title: "Supervised: Classification",
    code: "CLF",
    color: "text-purple-400",
    badgeBg: "bg-purple-950/60 border-purple-800/60",
    categoryFilter: "ml",
    subgroups: [
      {
        id: "sub-ml-tree-models",
        title: "Tree & Ensemble Classifiers",
        match: (b) =>
          b.category === "ml" &&
          ((b.id.includes("forest") && !b.id.includes("regressor")) ||
            (b.id.includes("decision_tree") && !b.id.includes("regressor")) ||
            (b.id.includes("boosting") && !b.id.includes("regressor"))),
      },
      {
        id: "sub-ml-linear-models",
        title: "Linear & Kernel Classifiers",
        match: (b) =>
          b.category === "ml" &&
          (b.id.includes("logistic") ||
            b.id === "ml.svc" ||
            b.id.includes("knn") ||
            b.id.includes("nb") ||
            b.id.includes("bayes")),
      },
    ],
  },
  {
    id: "group-ml-reg",
    title: "Supervised: Regression",
    code: "REG",
    color: "text-indigo-400",
    badgeBg: "bg-indigo-950/60 border-indigo-800/60",
    categoryFilter: "ml",
    subgroups: [
      {
        id: "sub-ml-linear-reg",
        title: "Linear & Regularized Regressors",
        match: (b) =>
          b.category === "ml" &&
          (b.id.includes("linear_regression") ||
            b.id.includes("ridge") ||
            b.id.includes("lasso") ||
            b.id === "ml.svr"),
      },
      {
        id: "sub-ml-ensemble-reg",
        title: "Tree & Boosting Regressors",
        match: (b) =>
          b.category === "ml" &&
          (b.id.includes("regressor") ||
            (b.id.includes("boosting") && b.id.includes("regressor"))),
      },
    ],
  },
  {
    id: "group-ml-unsupervised",
    title: "Unsupervised & Clustering",
    code: "UNSUP",
    color: "text-teal-400",
    badgeBg: "bg-teal-950/60 border-teal-800/60",
    categoryFilter: "ml",
    subgroups: [
      {
        id: "sub-ml-clustering",
        title: "Clustering Algorithms",
        match: (b) =>
          b.category === "ml" &&
          (b.id.includes("kmeans") ||
            b.id.includes("dbscan") ||
            b.tags?.includes("clustering") === true),
      },
    ],
  },
  {
    id: "group-ml-inference",
    title: "Inference & Prediction",
    code: "PRED",
    color: "text-violet-400",
    badgeBg: "bg-violet-950/60 border-violet-800/60",
    categoryFilter: "ml",
    subgroups: [
      {
        id: "sub-ml-predict-tools",
        title: "Prediction & Scoring",
        match: (b) =>
          b.category === "ml" &&
          (b.id.includes("predict") || b.tags?.includes("predict") === true),
      },
    ],
  },
  {
    id: "group-eval",
    title: "Evaluation & Metrics",
    code: "EVAL",
    color: "text-emerald-400",
    badgeBg: "bg-emerald-950/60 border-emerald-800/60",
    categoryFilter: "evaluation",
    subgroups: [
      {
        id: "sub-eval-metrics",
        title: "Scoring & Performance Reports",
        match: (b) => b.category === "evaluation",
      },
    ],
  },
  {
    id: "group-viz",
    title: "Visualization & Plots",
    code: "VIZ",
    color: "text-pink-400",
    badgeBg: "bg-pink-950/60 border-pink-800/60",
    categoryFilter: "visualization",
    subgroups: [
      {
        id: "sub-viz-charts",
        title: "Diagnostic Charts & Plots",
        match: (b) => b.category === "visualization",
      },
    ],
  },
  {
    id: "group-core",
    title: "Control Flow & Scripting",
    code: "CORE",
    color: "text-slate-300",
    badgeBg: "bg-slate-800/80 border-slate-700/80",
    categoryFilter: "core",
    subgroups: [
      {
        id: "sub-core-flow",
        title: "Logic, Variables & Code",
        match: (b) => b.category === "core",
      },
    ],
  },
];

// Port type color badge lookup
const PORT_BADGE_COLORS: Record<PortType, string> = {
  dataframe: "bg-cyan-500/10 text-cyan-400 border-cyan-500/25",
  dataset: "bg-blue-500/10 text-blue-400 border-blue-500/25",
  series: "bg-indigo-500/10 text-indigo-400 border-indigo-500/25",
  model: "bg-purple-500/10 text-purple-400 border-purple-500/25",
  scalar: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
  number: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
  string: "bg-zinc-500/10 text-zinc-300 border-zinc-500/25",
  boolean: "bg-rose-500/10 text-rose-400 border-rose-500/25",
  array: "bg-teal-500/10 text-teal-400 border-teal-500/25",
  file: "bg-sky-500/10 text-sky-400 border-sky-500/25",
  figure: "bg-pink-500/10 text-pink-400 border-pink-500/25",
  dict: "bg-violet-500/10 text-violet-400 border-violet-500/25",
  any: "bg-slate-500/10 text-slate-300 border-slate-500/25",
};

export default function Palette() {
  const [search, setSearch] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");
  const [openNodes, setOpenNodes] = useState<Set<string>>(
    new Set(["group-custom", "group-data", "group-prep", "group-ml-class"])
  );
  const [hoveredBlock, setHoveredBlock] = useState<BlockDefinition | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ top: number; left: number } | null>(null);

  // Dialogs & Custom Block Creation
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [modalTemplate, setModalTemplate] = useState<"transform" | "model" | "metric" | null>(null);
  const [contextMenuBlockId, setContextMenuBlockId] = useState<string | null>(null);

  const contextMenuRef = useRef<HTMLDivElement>(null);

  const isPaletteOpen = useUiStore((s) => s.isPaletteOpen);
  const addBlock = useWorkflowStore((s) => s.addBlock);

  const warnings = useLibraryStore((s) => s.warnings);
  const dismissWarning = useLibraryStore((s) => s.dismissWarning);

  const customBlocks = useCustomBlockStore((s) => s.customBlocks);
  const deleteCustomBlock = useCustomBlockStore((s) => s.deleteCustomBlock);
  const exportCustomBlockJson = useCustomBlockStore((s) => s.exportCustomBlockJson);
  const importCustomBlockJson = useCustomBlockStore((s) => s.importCustomBlockJson);

  // Close context menu on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenuBlockId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch all registered blocks (both built-in and custom)
  const allBlocks = useMemo(() => {
    return blockRegistry.list();
  }, [customBlocks, isCustomModalOpen]);

  // Filter blocks by search query
  const searchedBlocks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allBlocks;

    return allBlocks.filter((b) => {
      if (b.name.toLowerCase().includes(q)) return true;
      if (b.description?.toLowerCase().includes(q)) return true;
      if (b.id.toLowerCase().includes(q)) return true;
      if (b.category?.toLowerCase().includes(q)) return true;
      if (b.tags?.some((t) => t.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [allBlocks, search]);

  // When searching, automatically expand all folders that contain matching items
  useEffect(() => {
    if (search.trim()) {
      const matchingGroupIds = new Set<string>();
      for (const group of TREE_GROUPS) {
        for (const sub of group.subgroups) {
          const hasMatch = searchedBlocks.some((b) => sub.match(b));
          if (hasMatch) {
            matchingGroupIds.add(group.id);
            matchingGroupIds.add(sub.id);
          }
        }
      }
      setOpenNodes(matchingGroupIds);
    }
  }, [search, searchedBlocks]);

  if (!isPaletteOpen) return null;

  // Toggle fold state
  const toggleNode = (nodeId: string) => {
    setOpenNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    for (const group of TREE_GROUPS) {
      allIds.add(group.id);
      for (const sub of group.subgroups) {
        allIds.add(sub.id);
      }
    }
    setOpenNodes(allIds);
  };

  const collapseAll = () => {
    setOpenNodes(new Set());
  };

  const handleAdd = (def: BlockDefinition) => {
    const x = 280 + Math.random() * 80;
    const y = 180 + Math.random() * 80;
    addBlock(def, { x, y });
  };

  const handleDragStart = (e: React.DragEvent, block: BlockDefinition) => {
    e.dataTransfer.setData("application/codebrix-block-id", block.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleMouseEnterBlock = (e: React.MouseEvent, block: BlockDefinition) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPosition({ top: rect.top, left: rect.right + 10 });
    setHoveredBlock(block);
  };

  const handleMouseLeaveBlock = () => {
    setHoveredBlock(null);
  };

  // Custom block actions
  const handleOpenCreateModal = (template: "transform" | "model" | "metric" | null = null) => {
    setEditingBlockId(null);
    setModalTemplate(template);
    setIsCustomModalOpen(true);
  };

  const handleEditCustomBlock = (blockId: string) => {
    setEditingBlockId(blockId);
    setModalTemplate(null);
    setIsCustomModalOpen(true);
    setContextMenuBlockId(null);
  };

  const handleDeleteCustomBlock = (blockId: string) => {
    if (window.confirm(`Delete custom block "${blockId}"?`)) {
      deleteCustomBlock(blockId);
    }
    setContextMenuBlockId(null);
  };

  const handleExportCustomBlock = (blockId: string) => {
    try {
      const jsonStr = exportCustomBlockJson(blockId);
      navigator.clipboard.writeText(jsonStr);
      alert(`Custom block "${blockId}" JSON copied to clipboard.`);
    } catch (err) {
      alert(`Export failed: ${(err as Error).message}`);
    }
    setContextMenuBlockId(null);
  };

  const handleQuickImportJson = () => {
    const jsonStr = window.prompt("Paste Custom Block JSON definition to import:");
    if (!jsonStr) return;
    try {
      const imported = importCustomBlockJson(jsonStr);
      alert(`Imported custom block "${imported.name}" (${imported.id}) successfully!`);
      setActiveCategoryFilter("custom");
      setOpenNodes((prev) => new Set([...prev, "group-custom", "sub-custom-all"]));
    } catch (err) {
      alert(`Import failed: ${(err as Error).message}`);
    }
  };

  // Filter groups if a quick filter pill is selected
  const visibleGroups = TREE_GROUPS.filter((group) => {
    if (activeCategoryFilter === "all") return true;
    if (activeCategoryFilter === "custom") return group.id === "group-custom";
    if (activeCategoryFilter === "data") return group.id === "group-data";
    if (activeCategoryFilter === "prep") return group.id === "group-prep";
    if (activeCategoryFilter === "ml")
      return (
        group.id === "group-ml-class" ||
        group.id === "group-ml-reg" ||
        group.id === "group-ml-unsupervised" ||
        group.id === "group-ml-inference"
      );
    if (activeCategoryFilter === "eval") return group.id === "group-eval";
    if (activeCategoryFilter === "viz") return group.id === "group-viz";
    if (activeCategoryFilter === "core") return group.id === "group-core";
    return true;
  });

  return (
    <>
      <aside
        aria-label="Block Palette"
        className="w-full h-full flex flex-col overflow-hidden select-none"
      >
        {/* Top Header */}
        <div className="p-3 border-b border-white/10 space-y-2.5 bg-white/[0.02] shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <LayersIcon size={13} className="text-cyan-400" />
              <span className="text-[11px] font-bold text-white tracking-wider uppercase">
                Block Palette
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={expandAll}
                className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
                title="Expand All Folders"
              >
                Expand
              </button>
              <button
                onClick={collapseAll}
                className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
                title="Collapse All Folders"
              >
                Collapse
              </button>
              <span className="text-[10px] text-cyan-300 font-mono bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-full font-semibold">
                {searchedBlocks.length}
              </span>
            </div>
          </div>

          {/* Search Box - Text never overlaps the lens icon */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400/70 pointer-events-none flex items-center">
              <SearchIcon size={13} />
            </div>
            <input
              type="text"
              placeholder="Search blocks, algorithms, ports..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: "36px", paddingRight: "28px" }}
              className="cb-input cb-search-input text-xs"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                title="Clear search"
              >
                <CloseIcon size={10} />
              </button>
            )}
          </div>

          {/* Dedicated Custom Block Feature Studio UI (Bento Sub-Card) */}
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-950/40 via-slate-900/50 to-cyan-950/30 border border-white/10 space-y-2 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <SparklesIcon size={12} className="text-indigo-400" />
                <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">
                  Custom Block Studio
                </span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/25">
                {customBlocks.length} saved
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleOpenCreateModal(null)}
                className="flex-1 py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 shadow-[0_2px_12px_rgba(99,102,241,0.3)] cursor-pointer"
                title="Create a new visual ML block with custom Python code"
              >
                <PlusIcon size={11} />
                <span>New Block</span>
              </button>
              <button
                onClick={handleQuickImportJson}
                className="py-1.5 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                title="Import block from JSON"
              >
                <span>Import JSON</span>
              </button>
            </div>

            {/* Quick Starter Templates */}
            <div className="flex items-center gap-1 pt-0.5">
              <span className="text-[9px] text-slate-400 font-mono">Template:</span>
              <button
                onClick={() => handleOpenCreateModal("transform")}
                className="text-[9px] text-cyan-300 hover:text-white bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-800/60 px-1.5 py-0.5 rounded transition-colors cursor-pointer truncate"
                title="Start from Data Transform template"
              >
                + Transform
              </button>
              <button
                onClick={() => handleOpenCreateModal("model")}
                className="text-[9px] text-purple-300 hover:text-white bg-purple-950/70 hover:bg-purple-900 border border-purple-800/60 px-1.5 py-0.5 rounded transition-colors cursor-pointer truncate"
                title="Start from ML Classifier template"
              >
                + Classifier
              </button>
              <button
                onClick={() => handleOpenCreateModal("metric")}
                className="text-[9px] text-emerald-300 hover:text-white bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-800/60 px-1.5 py-0.5 rounded transition-colors cursor-pointer truncate"
                title="Start from Metric Evaluator template"
              >
                + Metric
              </button>
            </div>
          </div>

          {/* Quick Filter Category Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[10px] scrollbar-none">
            {[
              { id: "all", label: "All" },
              { id: "custom", label: `Custom (${customBlocks.length})` },
              { id: "data", label: "Data" },
              { id: "prep", label: "Prep" },
              { id: "ml", label: "ML" },
              { id: "eval", label: "Eval" },
              { id: "viz", label: "Viz" },
              { id: "core", label: "Core" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategoryFilter(tab.id)}
                className={`px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-all text-[10px] cursor-pointer ${
                  activeCategoryFilter === tab.id
                    ? "bg-cyan-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                    : "bg-white/[0.04] text-slate-400 hover:text-slate-200 hover:bg-white/10 border border-white/5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Library Warnings */}
        {warnings.length > 0 && (
          <div className="bg-amber-950/40 border-b border-amber-900/60 p-2 space-y-1 shrink-0">
            {warnings.map((warn, idx) => (
              <div
                key={idx}
                className="text-[10px] text-amber-300 font-mono flex items-start justify-between gap-1 leading-tight"
              >
                <div className="flex items-start gap-1">
                  <AlertTriangleIcon size={11} className="text-amber-400 mt-0.5 shrink-0" />
                  <span>{warn}</span>
                </div>
                <button
                  onClick={() => dismissWarning(idx)}
                  className="text-amber-400 hover:text-white shrink-0 ml-1 cursor-pointer"
                >
                  <CloseIcon size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Hierarchical Tree Content */}
        <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5">
          {visibleGroups.map((group) => {
            const isGroupOpen = openNodes.has(group.id);

            // Collect all matching blocks in this group
            const groupBlocks = searchedBlocks.filter((b) =>
              group.subgroups.some((sub) => sub.match(b))
            );

            // If this is the Custom group and there are no custom blocks yet, display custom empty state
            if (group.id === "group-custom" && groupBlocks.length === 0) {
              if (activeCategoryFilter === "custom" || !search.trim()) {
                return (
                  <div key={group.id} className="rounded-md bg-white/[0.03] border border-white/[0.07] overflow-hidden">
                    <button
                      onClick={() => toggleNode(group.id)}
                      className="w-full px-2 py-1.5 flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.07] transition-colors text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-slate-500 group-hover:text-slate-300">
                          {isGroupOpen ? <ChevronDownIcon size={10} /> : <ChevronRightIcon size={10} />}
                        </span>
                        <span className={`text-[9px] font-mono px-1 py-0.2 rounded border ${group.badgeBg} ${group.color}`}>
                          {group.code}
                        </span>
                        <span className={`text-xs font-medium tracking-tight ${group.color} truncate`}>
                          {group.title}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 bg-white/[0.06] px-1.5 py-0.2 rounded">
                        0
                      </span>
                    </button>

                    {isGroupOpen && (
                      <div className="p-3 border-t border-white/[0.06] bg-transparent text-center space-y-2">
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          No custom blocks yet. Create a custom ML model, transformer, or metric with user Python code.
                        </p>
                        <button
                          onClick={() => handleOpenCreateModal(null)}
                          className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-medium transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <PlusIcon size={10} />
                          <span>Create First Custom Block</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            }

            if (groupBlocks.length === 0) return null;

            return (
              <div key={group.id} className="rounded-md bg-white/[0.03] border border-white/[0.07] overflow-hidden">
                {/* Level 1: Category Folder Header */}
                <button
                  onClick={() => toggleNode(group.id)}
                  className="w-full px-2 py-1.5 flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.07] transition-colors text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-slate-500 group-hover:text-slate-300">
                      {isGroupOpen ? <ChevronDownIcon size={10} /> : <ChevronRightIcon size={10} />}
                    </span>
                    <span className={`text-[9px] font-mono px-1 py-0.2 rounded border ${group.badgeBg} ${group.color}`}>
                      {group.code}
                    </span>
                    <span className={`text-xs font-medium tracking-tight ${group.color} truncate`}>
                      {group.title}
                    </span>
                  </div>

                  <span className="text-[9px] font-mono text-slate-400 bg-white/[0.06] px-1.5 py-0.2 rounded">
                    {groupBlocks.length}
                  </span>
                </button>

                {/* Level 2 & 3: Subgroups and Blocks */}
                {isGroupOpen && (
                  <div className="p-1 space-y-1 border-t border-white/[0.06] bg-transparent">
                    {group.subgroups.map((sub) => {
                      const subBlocks = searchedBlocks.filter((b) => sub.match(b));
                      if (subBlocks.length === 0) return null;

                      const isSubOpen = openNodes.has(sub.id) || search.trim().length > 0;

                      return (
                        <div key={sub.id} className="pl-1.5 border-l border-white/[0.08] ml-1.5 space-y-0.5">
                          {/* Subfolder Header */}
                          <button
                            onClick={() => toggleNode(sub.id)}
                            className="w-full flex items-center justify-between py-0.5 px-1 rounded hover:bg-white/[0.05] text-left transition-colors text-slate-400 hover:text-slate-200 cursor-pointer"
                          >
                            <div className="flex items-center gap-1 truncate">
                              <span className="text-slate-500">
                                {isSubOpen ? <ChevronDownIcon size={8} /> : <ChevronRightIcon size={8} />}
                              </span>
                              <span className="text-[11px] font-normal truncate">{sub.title}</span>
                            </div>
                            <span className="text-[9px] font-mono text-slate-500">
                              {subBlocks.length}
                            </span>
                          </button>

                          {/* Level 3: Leaf Block Items */}
                          {isSubOpen && (
                            <div className="pl-1.5 space-y-0.5">
                              {subBlocks.map((block) => {
                                const isCustom = block.category === "custom" || block.id.startsWith("custom.");

                                return (
                                  <div
                                    key={block.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, block)}
                                    onMouseEnter={(e) => handleMouseEnterBlock(e, block)}
                                    onMouseLeave={handleMouseLeaveBlock}
                                    className="group relative p-1.5 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 cursor-grab active:cursor-grabbing transition-all flex items-center justify-between"
                                  >
                                    <div className="truncate mr-2 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-slate-200 group-hover:text-white truncate">
                                          {block.name}
                                        </span>

                                        {isCustom && (
                                          <span className="text-[8px] px-1 py-0.2 rounded bg-rose-950/70 text-rose-400 border border-rose-800/50 font-mono">
                                            custom
                                          </span>
                                        )}
                                      </div>

                                      {/* Ports Summary line */}
                                      <div className="flex items-center gap-1 mt-0.5 text-[9px] font-mono text-slate-500 truncate">
                                        <span className="text-slate-600">in:</span>
                                        {block.inputs.length === 0 ? (
                                          <span>-</span>
                                        ) : (
                                          block.inputs.slice(0, 2).map((inp) => (
                                            <span
                                              key={inp.id}
                                              className={`px-1 rounded border text-[8px] ${
                                                PORT_BADGE_COLORS[inp.type] || "text-slate-400"
                                              }`}
                                            >
                                              {inp.type}
                                            </span>
                                          ))
                                        )}
                                        {block.inputs.length > 2 && <span>+{block.inputs.length - 2}</span>}

                                        <span className="text-slate-600 ml-1">→</span>
                                        {block.outputs.length === 0 ? (
                                          <span>-</span>
                                        ) : (
                                          block.outputs.slice(0, 2).map((out) => (
                                            <span
                                              key={out.id}
                                              className={`px-1 rounded border text-[8px] ${
                                                PORT_BADGE_COLORS[out.type] || "text-slate-400"
                                              }`}
                                            >
                                              {out.type}
                                            </span>
                                          ))
                                        )}
                                      </div>
                                    </div>

                                    {/* Action Buttons: Add & Custom Block Management */}
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAdd(block);
                                        }}
                                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white transition-colors cursor-pointer"
                                        title="Add block to canvas"
                                      >
                                        + Add
                                      </button>

                                      {/* Custom block options */}
                                      {isCustom && (
                                        <div className="flex items-center gap-0.5">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEditCustomBlock(block.id);
                                            }}
                                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/80 transition-colors cursor-pointer"
                                            title="Edit custom block logic & ports"
                                          >
                                            <EditIcon size={11} />
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleExportCustomBlock(block.id);
                                            }}
                                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/80 transition-colors cursor-pointer"
                                            title="Export block definition JSON"
                                          >
                                            <ShareIcon size={11} />
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteCustomBlock(block.id);
                                            }}
                                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/60 transition-colors cursor-pointer"
                                            title="Delete custom block"
                                          >
                                            <TrashIcon size={11} />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Empty search results */}
          {searchedBlocks.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-500 space-y-1.5">
              <SearchIcon size={20} className="mx-auto text-slate-600" />
              <div>No blocks found matching "{search}"</div>
              <button
                onClick={() => {
                  setSearch("");
                  setActiveCategoryFilter("all");
                }}
                className="text-indigo-400 hover:underline text-[11px] cursor-pointer"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Footer with Import Library Button */}
        <div className="p-2 border-t border-white/10 bg-white/[0.02] shrink-0">
          <button
            onClick={() => setIsImportOpen(true)}
            className="w-full py-1.5 px-2.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <FolderIcon size={12} />
            <span>Import Library Manifest</span>
          </button>
        </div>
      </aside>

      {/* Quick Hover Preview Tooltip */}
      {hoveredBlock && hoverPosition && (
        <div
          style={{ top: Math.min(hoverPosition.top, window.innerHeight - 240), left: hoverPosition.left }}
          className="fixed z-50 w-72 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-lg p-3 shadow-2xl text-xs text-slate-200 pointer-events-none animate-in fade-in duration-100"
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-2">
            <span className="font-semibold text-white truncate">{hoveredBlock.name}</span>
            <span className="text-[9px] font-mono text-slate-400 bg-slate-800 px-1 py-0.2 rounded">
              v{hoveredBlock.version}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed mb-2.5">
            {hoveredBlock.description}
          </p>

          <div className="space-y-1 text-[10px] font-mono">
            <div>
              <span className="text-cyan-400 font-medium">Inputs: </span>
              {hoveredBlock.inputs.length === 0 ? (
                <span className="text-slate-500">None</span>
              ) : (
                hoveredBlock.inputs.map((inp) => (
                  <span key={inp.id} className="inline-block mr-1 text-slate-300">
                    {inp.name} ({inp.type})
                  </span>
                ))
              )}
            </div>

            <div>
              <span className="text-emerald-400 font-medium">Outputs: </span>
              {hoveredBlock.outputs.length === 0 ? (
                <span className="text-slate-500">None</span>
              ) : (
                hoveredBlock.outputs.map((out) => (
                  <span key={out.id} className="inline-block mr-1 text-slate-300">
                    {out.name} ({out.type})
                  </span>
                ))
              )}
            </div>

            {hoveredBlock.configSchema && Object.keys(hoveredBlock.configSchema).length > 0 && (
              <div className="text-slate-500 pt-1 border-t border-slate-800">
                {Object.keys(hoveredBlock.configSchema).length} parameters
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Block Modal */}
      <CustomBlockModal
        isOpen={isCustomModalOpen}
        onClose={() => {
          setIsCustomModalOpen(false);
          setEditingBlockId(null);
          setModalTemplate(null);
        }}
        editBlockId={editingBlockId}
        initialTemplate={modalTemplate}
      />

      {/* Import Library Dialog Modal */}
      <ImportLibraryDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />
    </>
  );
}

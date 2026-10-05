import { useState, useMemo, useEffect, useRef } from "react";
import { blockRegistry } from "../registry";
import { useWorkflowStore, useUiStore, useProjectStore } from "../stores";
import { useLibraryStore } from "../stores/libraryStore";
import { useCustomBlockStore } from "../stores/customBlockStore";
import type { BlockDefinition, BlockCategory, PortType } from "@codebrix/types";
import { PIPELINE_TEMPLATES, type PipelineTemplate } from "../templates/pipelineTemplates";
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
  CompassIcon,
  LayoutTemplateIcon,
  CheckIcon,
} from "../components/common/Icons";

// ─── TYPES & SECTIONS (VS CODE SIDEBAR TABS) ─────────────────────────

export type PaletteSection = "playground" | "library" | "custom" | "templates";

interface TreeGroup {
  id: string;
  title: string;
  code: string;
  treeBranch: "green" | "red";
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
    id: "group-data",
    title: "Data Ingestion & Sinks",
    code: "DATA",
    treeBranch: "green",
    color: "text-emerald-400",
    badgeBg: "bg-emerald-950/50 border-emerald-800/60",
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
    treeBranch: "green",
    color: "text-emerald-400",
    badgeBg: "bg-emerald-950/50 border-emerald-800/60",
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
    treeBranch: "green",
    color: "text-emerald-400",
    badgeBg: "bg-emerald-950/50 border-emerald-800/60",
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
    treeBranch: "green",
    color: "text-emerald-400",
    badgeBg: "bg-emerald-950/50 border-emerald-800/60",
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
    treeBranch: "green",
    color: "text-emerald-400",
    badgeBg: "bg-emerald-950/50 border-emerald-800/60",
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
    treeBranch: "green",
    color: "text-emerald-400",
    badgeBg: "bg-emerald-950/50 border-emerald-800/60",
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
    treeBranch: "red",
    color: "text-rose-400",
    badgeBg: "bg-rose-950/50 border-rose-800/60",
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
    treeBranch: "red",
    color: "text-rose-400",
    badgeBg: "bg-rose-950/50 border-rose-800/60",
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
    code: "FLOW",
    treeBranch: "red",
    color: "text-rose-400",
    badgeBg: "bg-rose-950/50 border-rose-800/60",
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

const PORT_BADGE_COLORS: Record<PortType, string> = {
  dataframe: "bg-cyan-500/15 text-cyan-300 border-cyan-400/35 font-medium",
  dataset: "bg-blue-500/15 text-blue-300 border-blue-400/35 font-medium",
  series: "bg-indigo-500/15 text-indigo-300 border-indigo-400/35 font-medium",
  model: "bg-purple-500/15 text-purple-300 border-purple-400/35 font-medium",
  scalar: "bg-emerald-500/15 text-emerald-300 border-emerald-400/35 font-medium",
  number: "bg-emerald-500/15 text-emerald-300 border-emerald-400/35 font-medium",
  string: "bg-slate-500/15 text-slate-200 border-slate-400/35 font-medium",
  boolean: "bg-rose-500/15 text-rose-300 border-rose-400/35 font-medium",
  array: "bg-teal-500/15 text-teal-300 border-teal-400/35 font-medium",
  file: "bg-sky-500/15 text-sky-300 border-sky-400/35 font-medium",
  figure: "bg-pink-500/15 text-pink-300 border-pink-400/35 font-medium",
  dict: "bg-violet-500/15 text-violet-300 border-violet-400/35 font-medium",
  any: "bg-slate-500/15 text-slate-200 border-slate-400/35 font-medium",
};

export default function Palette() {
  // Active VS Code sidebar tab: "playground" | "library" | "custom" | "templates"
  const [activeSection, setActiveSection] = useState<PaletteSection>("library");

  // Search & Filters
  const [search, setSearch] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [openNodes, setOpenNodes] = useState<Set<string>>(
    new Set(["group-data", "group-prep", "group-ml-class"])
  );

  // Hover details state
  const [hoveredBlock, setHoveredBlock] = useState<BlockDefinition | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ top: number; left: number } | null>(null);

  // Dialogs & Custom Blocks
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [modalTemplate, setModalTemplate] = useState<"transform" | "model" | "metric" | null>(null);

  // Global store bindings
  const isPaletteOpen = useUiStore((s) => s.isPaletteOpen);
  const selectedBlockId = useUiStore((s) => s.selectedBlockId);
  const selectBlock = useUiStore((s) => s.selectBlock);
  const graph = useWorkflowStore((s) => s.graph);
  const setGraph = useWorkflowStore((s) => s.setGraph);
  const addBlock = useWorkflowStore((s) => s.addBlock);
  const removeBlock = useWorkflowStore((s) => s.removeBlock);
  const setProjectName = useProjectStore((s) => s.setProjectName);
  const markDirty = useProjectStore((s) => s.markDirty);

  const warnings = useLibraryStore((s) => s.warnings);
  const dismissWarning = useLibraryStore((s) => s.dismissWarning);

  const customBlocks = useCustomBlockStore((s) => s.customBlocks);
  const deleteCustomBlock = useCustomBlockStore((s) => s.deleteCustomBlock);
  const exportCustomBlockJson = useCustomBlockStore((s) => s.exportCustomBlockJson);
  const importCustomBlockJson = useCustomBlockStore((s) => s.importCustomBlockJson);

  // Fetch all registered blocks
  const allBlocks = useMemo(() => {
    return blockRegistry.list();
  }, [customBlocks, isCustomModalOpen]);

  // Canvas block instances for Playground Outline
  const canvasBlocks = useMemo(() => {
    return Object.values(graph.blocks);
  }, [graph.blocks]);

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

  // Auto-expand matching folders on search
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
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    for (const group of TREE_GROUPS) {
      allIds.add(group.id);
      for (const sub of group.subgroups) allIds.add(sub.id);
    }
    setOpenNodes(allIds);
  };

  const collapseAll = () => {
    setOpenNodes(new Set());
  };

  const handleAdd = (def: BlockDefinition) => {
    const x = 320 + Math.random() * 80;
    const y = 180 + Math.random() * 80;
    addBlock(def, { x, y });
  };

  const handleDragStart = (e: React.DragEvent, block: BlockDefinition) => {
    e.dataTransfer.setData("application/codebrix-block-id", block.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleMouseEnterBlock = (e: React.MouseEvent, block: BlockDefinition) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPosition({ top: rect.top, left: rect.right + 12 });
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
  };

  const handleDeleteCustomBlock = (blockId: string) => {
    if (window.confirm(`Delete custom block "${blockId}"?`)) {
      deleteCustomBlock(blockId);
      blockRegistry.unregister(blockId);
    }
  };

  const handleExportCustomBlock = (blockId: string) => {
    const json = exportCustomBlockJson(blockId);
    if (!json) return;
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${blockId.replace(/[^a-z0-9_-]/gi, "_")}.cbx-block.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleQuickImportJson = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const res = importCustomBlockJson(text);
      if (res.success && res.block) {
        blockRegistry.register(res.block);
        alert(`Successfully imported custom block: "${res.block.name}"`);
      } else {
        alert(`Failed to import block:\n${res.error}`);
      }
    };
    input.click();
  };

  // Template loader action
  const handleLoadTemplate = (tpl: PipelineTemplate) => {
    if (
      canvasBlocks.length > 0 &&
      !window.confirm(
        `Load "${tpl.title}" template into the playground? This will replace your current canvas.`
      )
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
    setGraph({
      ...tpl.graph,
      connections: normalizedConnections,
    });
    setProjectName(tpl.title);
    markDirty(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("codebrix:fit-view"));
    }
  };

  // Filtered Templates
  const filteredTemplates = useMemo(() => {
    if (templateFilter === "all") return PIPELINE_TEMPLATES;
    return PIPELINE_TEMPLATES.filter((t) => t.category === templateFilter);
  }, [templateFilter]);

  // Visible Tree Groups filtered by activeCategoryFilter
  const visibleGroups = useMemo(() => {
    if (activeCategoryFilter === "all") return TREE_GROUPS;
    return TREE_GROUPS.filter((g) => g.categoryFilter === activeCategoryFilter);
  }, [activeCategoryFilter]);

  return (
    <>
      <aside
        aria-label="IDE Sidebar"
        className="w-full h-full flex overflow-hidden select-none"
      >
        {/* ─── VS Code Vertical Activity Rail ─── */}
        <nav
          aria-label="Activity Bar"
          className="w-12 shrink-0 border-r border-white/10 bg-black/20 flex flex-col items-center py-2.5 space-y-2 z-20"
        >
          {/* Playground / Active Pipeline */}
          <button
            onClick={() => setActiveSection("playground")}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group ${
              activeSection === "playground"
                ? "bg-white/10 text-white border border-white/20"
                : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
            }`}
            title="Pipeline explorer"
          >
            <CompassIcon size={16} />
            {canvasBlocks.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-700 text-slate-200 font-bold font-mono text-[9px] flex items-center justify-center border border-white/10 shadow-sm">
                {canvasBlocks.length}
              </span>
            )}
            {activeSection === "playground" && (
              <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-emerald-400 rounded-r" />
            )}
          </button>

          {/* Block Library */}
          <button
            onClick={() => setActiveSection("library")}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group ${
              activeSection === "library"
                ? "bg-white/10 text-white border border-white/20"
                : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
            }`}
            title="Block libraries"
          >
            <LayersIcon size={16} />
            {activeSection === "library" && (
              <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-emerald-400 rounded-r" />
            )}
          </button>

          {/* Custom Block Studio */}
          <button
            onClick={() => setActiveSection("custom")}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group ${
              activeSection === "custom"
                ? "bg-white/10 text-white border border-white/20"
                : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
            }`}
            title="Custom blocks"
          >
            <CodeIcon size={16} />
            {customBlocks.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-700 text-slate-200 font-bold font-mono text-[9px] flex items-center justify-center border border-white/10 shadow-sm">
                {customBlocks.length}
              </span>
            )}
            {activeSection === "custom" && (
              <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-emerald-400 rounded-r" />
            )}
          </button>

          {/* Workflow Blueprints / Templates */}
          <button
            onClick={() => setActiveSection("templates")}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group ${
              activeSection === "templates"
                ? "bg-white/10 text-white border border-white/20"
                : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
            }`}
            title="Templates"
          >
            <LayoutTemplateIcon size={16} />
            {activeSection === "templates" && (
              <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-emerald-400 rounded-r" />
            )}
          </button>
        </nav>

        {/* ─── Main Panel Content View ─── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-transparent">
          {/* ───────────────────────────────────────────────────────────
              SECTION 1: PIPELINE EXPLORER
             ─────────────────────────────────────────────────────────── */}
          {activeSection === "playground" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3 border-b border-white/10 space-y-2 bg-white/[0.02] shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CompassIcon size={13} className="text-emerald-400" />
                    <span className="text-[11px] font-bold text-white tracking-wider uppercase">
                      Pipeline explorer
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-300 bg-white/[0.06] border border-white/10 px-2 py-0.5 rounded-full font-medium">
                    {canvasBlocks.length} nodes
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-400 leading-tight">
                  Overview of all active blocks and models in your playground canvas.
                </p>
              </div>

              {/* Active Canvas Block List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {canvasBlocks.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 space-y-2.5">
                    <CompassIcon size={24} className="mx-auto text-slate-600" />
                    <div>Playground canvas is currently empty.</div>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        onClick={() => setActiveSection("library")}
                        className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        Browse Library
                      </button>
                      <button
                        onClick={() => setActiveSection("templates")}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        Load Template
                      </button>
                    </div>
                  </div>
                ) : (
                  canvasBlocks.map((blk) => {
                    const def = blockRegistry.get(blk.definitionId);
                    const isSelected = selectedBlockId === blk.id;
                    const rawPath = (blk.config?.filePath || blk.config?.file || blk.config?.path || "") as string;
                    const datasetName = typeof rawPath === "string" && rawPath.trim()
                      ? rawPath.split(/[/\\]/).pop()?.replace(/^["']+|["']+$/g, "")
                      : null;

                    return (
                      <div
                        key={blk.id}
                        onClick={() => selectBlock(blk.id)}
                        className={`p-2 rounded-xl transition-all border cursor-pointer flex items-center justify-between group ${
                          isSelected
                            ? "bg-cyan-500/15 border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                            : "bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.08]"
                        }`}
                      >
                        <div className="truncate mr-2 flex-1">
                          <div className="flex items-center gap-1.5 truncate">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                blk.state === "running"
                                  ? "bg-cyan-400 animate-pulse"
                                  : blk.state === "success"
                                  ? "bg-emerald-400"
                                  : blk.state === "failed"
                                  ? "bg-rose-400"
                                  : "bg-slate-500"
                              }`}
                            />
                            <span className="text-xs font-semibold text-white truncate">
                              {blk.label || def?.name || blk.id}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-1 text-[9px] font-mono text-slate-400">
                            <span className="px-1.5 py-0.2 rounded bg-white/[0.05] border border-white/10 uppercase">
                              {def?.category || "block"}
                            </span>
                            {datasetName && (
                              <span className="text-cyan-300 truncate max-w-[120px] font-semibold">
                                📄 {datasetName}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeBlock(blk.id);
                              if (selectedBlockId === blk.id) selectBlock(null);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/60 transition-colors"
                            title="Remove block from canvas"
                          >
                            <TrashIcon size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Playground Summary Footer */}
              <div className="p-2.5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-[10px] font-mono text-slate-400 shrink-0">
                <span>{graph.connections.length} connections</span>
                <button
                  onClick={() => {
                    if (window.confirm("Clear all blocks from the canvas?")) {
                      useWorkflowStore.getState().clearWorkflow();
                    }
                  }}
                  className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Clear Playground
                </button>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────
              SECTION 2: BLOCK LIBRARIES
             ─────────────────────────────────────────────────────────── */}
          {activeSection === "library" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3 border-b border-white/10 space-y-2.5 bg-white/[0.02] shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <LayersIcon size={13} className="text-emerald-400" />
                    <span className="text-[11px] font-bold text-white tracking-wider uppercase">
                      Block libraries
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
                    <span className="text-[10px] text-slate-300 font-mono bg-white/[0.06] border border-white/10 px-2 py-0.5 rounded-full font-medium">
                      {searchedBlocks.length}
                    </span>
                  </div>
                </div>

                {/* Search Box - Text never overlaps the lens icon */}
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center">
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

                {/* Quick Filter Category Pills - Smooth concrete styling */}
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[10px] scrollbar-none">
                  {[
                    { id: "all", label: "All" },
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
                          ? "bg-white/15 text-white font-medium border border-white/20"
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

              {/* Hierarchical Tree Content - Clean & Sleek Glass Styling */}
              <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5">
                {visibleGroups.map((group) => {
                  const isGroupOpen = openNodes.has(group.id);
                  const groupBlocks = searchedBlocks.filter((b) =>
                    group.subgroups.some((sub) => sub.match(b))
                  );

                  if (groupBlocks.length === 0) return null;

                  return (
                    <div
                      key={group.id}
                      className="rounded-md bg-white/[0.02] border border-white/[0.08] overflow-hidden"
                    >
                      {/* Category Folder Header */}
                      <button
                        onClick={() => toggleNode(group.id)}
                        className="w-full px-2.5 py-2 flex items-center justify-between bg-white/[0.04] hover:bg-white/[0.08] transition-colors text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-slate-400 group-hover:text-slate-200">
                            {isGroupOpen ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
                          </span>
                          <span className="text-[13px] font-semibold tracking-tight text-white truncate">
                            {group.title}
                          </span>
                        </div>

                        <span className="text-[10px] font-mono text-slate-300 bg-white/[0.08] px-2 py-0.5 rounded font-semibold">
                          {groupBlocks.length}
                        </span>
                      </button>

                      {/* Subgroups and Blocks with clean tree guidelines */}
                      {isGroupOpen && (
                        <div className="p-1 space-y-1 border-t border-white/[0.08] bg-transparent">
                          {group.subgroups.map((sub) => {
                            const subBlocks = searchedBlocks.filter((b) => sub.match(b));
                            if (subBlocks.length === 0) return null;

                            const isSubOpen = openNodes.has(sub.id) || search.trim().length > 0;

                            return (
                              <div
                                key={sub.id}
                                className="pl-2 border-l border-white/[0.1] ml-1.5 space-y-0.5"
                              >
                                {/* Subfolder Header */}
                                <button
                                  onClick={() => toggleNode(sub.id)}
                                  className="w-full flex items-center justify-between py-1 px-1.5 rounded hover:bg-white/[0.06] text-left transition-colors cursor-pointer text-slate-300 hover:text-white"
                                >
                                  <div className="flex items-center gap-1.5 truncate">
                                    <span className="text-slate-400">
                                      {isSubOpen ? <ChevronDownIcon size={10} /> : <ChevronRightIcon size={10} />}
                                    </span>
                                    <span className="text-[12px] font-medium text-slate-200 truncate">{sub.title}</span>
                                  </div>
                                  <span className="text-[10px] font-mono text-slate-400 font-medium">
                                    {subBlocks.length}
                                  </span>
                                </button>

                                {/* Leaf Block Items */}
                                {isSubOpen && (
                                  <div className="pl-2 border-l border-white/[0.06] ml-1.5 space-y-1 py-0.5">
                                    {subBlocks.map((block) => (
                                      <div
                                        key={block.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, block)}
                                        onMouseEnter={(e) => handleMouseEnterBlock(e, block)}
                                        onMouseLeave={handleMouseLeaveBlock}
                                        className="group relative p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 hover:border-white/25 cursor-grab active:cursor-grabbing transition-all flex items-center justify-between shadow-sm"
                                      >
                                        <div className="truncate mr-2 flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-cyan-400/80 shadow-sm" />
                                            <span className="text-[13px] text-slate-100 group-hover:text-white truncate font-semibold">
                                              {block.name}
                                            </span>
                                          </div>

                                          {/* Ports Summary line */}
                                          <div className="flex items-center gap-1 mt-1 text-[10px] font-mono text-slate-300 truncate">
                                            <span className="text-slate-400">in:</span>
                                            {block.inputs.length === 0 ? (
                                              <span className="text-slate-400">-</span>
                                            ) : (
                                              block.inputs.slice(0, 2).map((inp) => (
                                                <span
                                                  key={inp.id}
                                                  className={`px-1.5 py-0.2 rounded border text-[9px] font-medium ${
                                                    PORT_BADGE_COLORS[inp.type] || "text-slate-300"
                                                  }`}
                                                >
                                                  {inp.type}
                                                </span>
                                              ))
                                            )}
                                            {block.inputs.length > 2 && <span className="text-slate-400 font-medium">+{block.inputs.length - 2}</span>}

                                            <span className="text-slate-400 ml-1">→</span>
                                            {block.outputs.length === 0 ? (
                                              <span className="text-slate-400">-</span>
                                            ) : (
                                              block.outputs.slice(0, 2).map((out) => (
                                                <span
                                                  key={out.id}
                                                  className={`px-1.5 py-0.2 rounded border text-[9px] font-medium ${
                                                    PORT_BADGE_COLORS[out.type] || "text-slate-300"
                                                  }`}
                                                >
                                                  {out.type}
                                                </span>
                                              ))
                                            )}
                                          </div>
                                        </div>

                                        {/* Action: Add to canvas */}
                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleAdd(block);
                                            }}
                                            className="text-[11px] font-mono px-2.5 py-1 rounded bg-white/[0.08] text-slate-200 border border-white/15 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-500 transition-colors cursor-pointer font-semibold shadow-sm"
                                            title="Add block to canvas"
                                          >
                                            + Add
                                          </button>
                                        </div>
                                      </div>
                                    ))}
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
                      className="text-cyan-400 hover:underline text-[11px] cursor-pointer"
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
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────
              SECTION 3: CUSTOM BLOCKS
             ─────────────────────────────────────────────────────────── */}
          {activeSection === "custom" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3 border-b border-white/10 space-y-2.5 bg-white/[0.02] shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CodeIcon size={13} className="text-emerald-400" />
                    <span className="text-[11px] font-bold text-white tracking-wider uppercase">
                      Custom blocks
                    </span>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300 border border-white/10">
                    {customBlocks.length} saved
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-400 leading-tight">
                  Design, test, and package visual ML blocks with custom Python code.
                </p>

                {/* Primary Studio Action Buttons - Smooth Concrete styling */}
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => handleOpenCreateModal(null)}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-700/90 hover:bg-emerald-600 text-white text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5 border border-emerald-600/50 cursor-pointer"
                  >
                    <PlusIcon size={11} />
                    <span>New Block</span>
                  </button>
                  <button
                    onClick={handleQuickImportJson}
                    className="py-1.5 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Import JSON</span>
                  </button>
                </div>

                {/* Quick Starter Templates */}
                <div className="flex items-center gap-1 pt-0.5">
                  <span className="text-[9px] text-slate-400 font-mono">Starter:</span>
                  <button
                    onClick={() => handleOpenCreateModal("transform")}
                    className="text-[9px] text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 px-1.5 py-0.5 rounded transition-colors cursor-pointer truncate"
                  >
                    + Transform
                  </button>
                  <button
                    onClick={() => handleOpenCreateModal("model")}
                    className="text-[9px] text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 px-1.5 py-0.5 rounded transition-colors cursor-pointer truncate"
                  >
                    + Classifier
                  </button>
                  <button
                    onClick={() => handleOpenCreateModal("metric")}
                    className="text-[9px] text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 px-1.5 py-0.5 rounded transition-colors cursor-pointer truncate"
                  >
                    + Metric
                  </button>
                </div>
              </div>

              {/* Custom Blocks List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {customBlocks.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 space-y-2">
                    <CodeIcon size={24} className="mx-auto text-slate-600" />
                    <div>No custom blocks created yet.</div>
                    <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto leading-relaxed">
                      Write your own scikit-learn transformers, PyTorch models, or custom evaluation routines in Python.
                    </p>
                    <button
                      onClick={() => handleOpenCreateModal(null)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer mt-1 border border-emerald-600/50"
                    >
                      <PlusIcon size={12} />
                      <span>Create Your First Block</span>
                    </button>
                  </div>
                ) : (
                  customBlocks.map((block) => (
                    <div
                      key={block.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, block)}
                      onMouseEnter={(e) => handleMouseEnterBlock(e, block)}
                      onMouseLeave={handleMouseLeaveBlock}
                      className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-white/20 transition-all flex items-center justify-between group"
                    >
                      <div className="truncate mr-2 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          <span className="text-xs text-slate-200 group-hover:text-white font-medium truncate">
                            {block.name}
                          </span>
                          <span className="text-[8px] px-1 py-0.2 rounded bg-white/[0.06] text-slate-300 border border-white/10 font-mono">
                            Python
                          </span>
                        </div>
                        <div className="text-[9px] font-mono text-slate-500 truncate mt-0.5">
                          {block.id}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleAdd(block)}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/10 hover:bg-emerald-700 hover:text-white hover:border-emerald-600 transition-colors cursor-pointer font-medium"
                          title="Add to canvas"
                        >
                          + Add
                        </button>
                        <button
                          onClick={() => handleEditCustomBlock(block.id)}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                          title="Edit Python code & ports"
                        >
                          <EditIcon size={11} />
                        </button>
                        <button
                          onClick={() => handleExportCustomBlock(block.id)}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                          title="Export JSON definition"
                        >
                          <ShareIcon size={11} />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomBlock(block.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/60 transition-colors"
                          title="Delete custom block"
                        >
                          <TrashIcon size={11} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────
              SECTION 4: TEMPLATES
             ─────────────────────────────────────────────────────────── */}
          {activeSection === "templates" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3 border-b border-white/10 space-y-2.5 bg-white/[0.02] shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <LayoutTemplateIcon size={13} className="text-emerald-400" />
                    <span className="text-[11px] font-bold text-white tracking-wider uppercase">
                      Templates
                    </span>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300 border border-white/10">
                    {PIPELINE_TEMPLATES.length} blueprints
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-400 leading-tight">
                  One-click verified visual ML pipelines ready to run and customize.
                </p>

                {/* Template Category Filters - Smooth concrete styling */}
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[10px] scrollbar-none">
                  {[
                    { id: "all", label: "All" },
                    { id: "classification", label: "Classification" },
                    { id: "regression", label: "Regression" },
                    { id: "clustering", label: "Clustering" },
                    { id: "preprocessing", label: "Preprocessing" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setTemplateFilter(tab.id)}
                      className={`px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-all text-[10px] cursor-pointer ${
                        templateFilter === tab.id
                          ? "bg-white/15 text-white font-medium border border-white/20"
                          : "bg-white/[0.04] text-slate-400 hover:text-slate-200 hover:bg-white/10 border border-white/5"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Blueprints Cards Grid */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {filteredTemplates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/20 transition-all space-y-2 group shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-xs text-white group-hover:text-emerald-300 transition-colors">
                          {tpl.title}
                        </div>
                        <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                          {tpl.nodeCount} nodes • {tpl.edgeCount} connections
                        </div>
                      </div>
                    </div>

                    <p className="text-[10.5px] text-slate-400 leading-relaxed">
                      {tpl.description}
                    </p>

                    {/* Tags */}
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      {tpl.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[8.5px] font-mono px-1.5 py-0.2 rounded bg-white/[0.04] text-slate-400 border border-white/5"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* Load Blueprint CTA - Smooth concrete button */}
                    <div className="pt-1 border-t border-white/5 flex items-center justify-end">
                      <button
                        onClick={() => handleLoadTemplate(tpl)}
                        className="py-1 px-3 rounded-lg bg-emerald-700/90 hover:bg-emerald-600 text-white text-[10.5px] font-medium transition-colors flex items-center gap-1.5 border border-emerald-600/40 cursor-pointer"
                      >
                        <PlusIcon size={11} />
                        <span>Load Blueprint</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ─── Compact Hover Details Tooltip (For Library / Custom Blocks) ─── */}
      {hoveredBlock && hoverPosition && (
        <div
          style={{
            top: Math.max(12, Math.min(hoverPosition.top, window.innerHeight - 195)),
            left: Math.min(hoverPosition.left, window.innerWidth - 300),
          }}
          className="fixed z-50 w-72 bg-[#0c101d]/98 backdrop-blur-2xl border border-white/20 rounded-xl p-3 shadow-2xl text-xs text-slate-200 pointer-events-none animate-in fade-in zoom-in-95 duration-100 space-y-2"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-1.5 pb-1.5 border-b border-white/10">
            <span className="font-bold text-white text-[12.5px] truncate">
              {hoveredBlock.name}
            </span>
            <span
              className={`text-[9.5px] font-mono px-2 py-0.5 rounded-full border font-semibold uppercase ${
                hoveredBlock.category === "evaluation" ||
                hoveredBlock.category === "visualization" ||
                hoveredBlock.category === "core"
                  ? "bg-rose-950/70 text-rose-300 border-rose-800/60"
                  : "bg-emerald-950/70 text-emerald-300 border-emerald-800/60"
              }`}
            >
              {hoveredBlock.category}
            </span>
          </div>

          {/* Concise 1-2 sentence description */}
          <p className="text-[11px] text-slate-200 leading-relaxed font-sans line-clamp-3">
            {hoveredBlock.description}
          </p>

          {/* Compact Ports I/O flow */}
          <div className="text-[10px] font-mono text-slate-300 flex items-center gap-1.5 pt-1.5 border-t border-white/10 truncate">
            <span className="text-slate-400 font-semibold">I/O:</span>
            <span className="text-cyan-300 truncate max-w-[100px] font-medium">
              {hoveredBlock.inputs.length === 0
                ? "none"
                : hoveredBlock.inputs.map((i) => i.type).join(", ")}
            </span>
            <span className="text-slate-400 font-bold">→</span>
            <span className="text-emerald-300 truncate max-w-[100px] font-medium">
              {hoveredBlock.outputs.length === 0
                ? "none"
                : hoveredBlock.outputs.map((o) => o.type).join(", ")}
            </span>
          </div>

          {/* Configurable Parameters Brief */}
          {hoveredBlock.configSchema && Object.keys(hoveredBlock.configSchema).length > 0 && (
            <div className="text-[10px] font-mono text-slate-300 flex items-center justify-between pt-0.5">
              <span className="text-slate-400 font-medium">Parameters:</span>
              <span className="text-emerald-300 font-semibold">
                {Object.keys(hoveredBlock.configSchema).length} configurable
              </span>
            </div>
          )}
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

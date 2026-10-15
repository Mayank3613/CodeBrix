import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Background,
  MiniMap,
  type Connection as FlowConnection,
  type EdgeChange,
  type NodeChange,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { BlockNode } from "./BlockNode";
import { toReactFlowGraph, type BlockNodeData } from "./adapter";
import { useWorkflowStore, useUiStore, useExecutionStore, useProjectStore } from "../stores";
import { blockRegistry } from "../registry";
import { openProjectFileDialog, parseCbxProject } from "../project";
import {
  Boxes,
  Sparkles,
  FileUp,
  Plus,
  Minus,
  Maximize2,
  Check,
  X,
  LayoutGrid,
} from "lucide-react";
import Tooltip from "../components/common/Tooltip";

const nodeTypes = {
  blockNode: BlockNode,
};

function isInputElement(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    (el as HTMLElement).isContentEditable
  );
}

function CanvasContent() {
  const { screenToFlowPosition, setCenter, fitView, zoomIn, zoomOut } = useReactFlow();
  const graph = useWorkflowStore((s) => s.graph);
  const setGraph = useWorkflowStore((s) => s.setGraph);
  const updateBlockPosition = useWorkflowStore((s) => s.updateBlockPosition);
  const recordHistory = useWorkflowStore((s) => s.recordHistory);
  const addBlock = useWorkflowStore((s) => s.addBlock);
  const addConnection = useWorkflowStore((s) => s.addConnection);
  const removeConnection = useWorkflowStore((s) => s.removeConnection);
  const removeBlock = useWorkflowStore((s) => s.removeBlock);
  const undo = useWorkflowStore((s) => s.undo);
  const redo = useWorkflowStore((s) => s.redo);

  const selectedBlockId = useUiStore((s) => s.selectedBlockId);
  const selectBlock = useUiStore((s) => s.selectBlock);
  const focusTarget = useUiStore((s) => s.focusTarget);
  const setZoomLevel = useUiStore((s) => s.setZoomLevel);
  const runState = useExecutionStore((s) => s.runState);
  const setProjectName = useProjectStore((s) => s.setProjectName);
  const markDirty = useProjectStore((s) => s.markDirty);

  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [connectionFeedback, setConnectionFeedback] = useState<{
    message: string;
    type: "valid" | "error";
  } | null>(null);

  const blockCount = Object.keys(graph.blocks).length;
  const isRunning = runState === "running";

  // Fit view on load or when template changes
  const blockKeys = useMemo(
    () => Object.keys(graph.blocks).sort().join(","),
    [graph.blocks]
  );

  useEffect(() => {
    if (blockCount === 0) return;
    const t = setTimeout(() => {
      fitView({ duration: 300, padding: 0.2 });
    }, 100);
    return () => clearTimeout(t);
  }, [graph.id, blockKeys, fitView, blockCount]);

  // Fit view custom event
  useEffect(() => {
    const handleFit = () => {
      setTimeout(() => fitView({ duration: 400, padding: 0.2 }), 80);
    };
    window.addEventListener("codebrix:fit-view", handleFit);
    return () => window.removeEventListener("codebrix:fit-view", handleFit);
  }, [fitView]);

  const containerRef = useRef<HTMLDivElement>(null);

  // ResizeObserver: auto fit-view against visible canvas bounds when panels resize or toggle
  useEffect(() => {
    if (!containerRef.current) return;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const observer = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        fitView({ padding: 0.2, duration: 150 });
      }, 50);
    });
    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, [fitView]);

  // Focus block on validation click
  useEffect(() => {
    if (focusTarget && focusTarget.blockId) {
      const block = graph.blocks[focusTarget.blockId];
      if (block) {
        setCenter(block.position.x + 110, block.position.y + 70, {
          zoom: 1.15,
          duration: 500,
        });
      }
    }
  }, [focusTarget, graph, setCenter]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputElement(document.activeElement)) return;
      const isModifier = e.ctrlKey || e.metaKey;

      if (isModifier && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        undo();
        return;
      }

      if (
        (isModifier && e.shiftKey && (e.key === "z" || e.key === "Z")) ||
        (isModifier && (e.key === "y" || e.key === "Y"))
      ) {
        e.preventDefault();
        redo();
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedEdgeId) {
          e.preventDefault();
          removeConnection(selectedEdgeId);
          setSelectedEdgeId(null);
          return;
        }

        if (selectedBlockId) {
          e.preventDefault();
          removeBlock(selectedBlockId);
          selectBlock(null);
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, selectedEdgeId, selectedBlockId, removeConnection, removeBlock, selectBlock]);

  // Derive React Flow nodes and edges with smooth-step & running animation
  const { nodes, edges } = useMemo(() => {
    const flowGraph = toReactFlowGraph(graph);
    const mappedNodes = flowGraph.nodes.map((n) => ({
      ...n,
      selected: selectedEdgeId ? false : n.id === selectedBlockId,
    }));
    const mappedEdges = flowGraph.edges.map((e) => ({
      ...e,
      type: "smoothstep",
      animated: isRunning,
      selected: e.id === selectedEdgeId,
      pathOptions: { offset: 24, borderRadius: 12 },
    }));
    return { nodes: mappedNodes, edges: mappedEdges };
  }, [graph, selectedBlockId, selectedEdgeId, isRunning]);

  const onNodesChange = useCallback(
    (changes: NodeChange<import("@xyflow/react").Node<BlockNodeData>>[]) => {
      for (const change of changes) {
        if (change.type === "position" && change.position) {
          updateBlockPosition(change.id, change.position);
        } else if (change.type === "remove") {
          removeBlock(change.id);
          if (selectedBlockId === change.id) selectBlock(null);
        } else if (change.type === "select") {
          if (change.selected) {
            selectBlock(change.id);
            setSelectedEdgeId(null);
          } else if (selectedBlockId === change.id) {
            selectBlock(null);
          }
        }
      }
    },
    [updateBlockPosition, removeBlock, selectBlock, selectedBlockId]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      for (const change of changes) {
        if (change.type === "remove") {
          removeConnection(change.id);
          if (selectedEdgeId === change.id) setSelectedEdgeId(null);
        } else if (change.type === "select") {
          if (change.selected) {
            setSelectedEdgeId(change.id);
            selectBlock(null);
          } else if (selectedEdgeId === change.id) {
            setSelectedEdgeId(null);
          }
        }
      }
    },
    [removeConnection, selectBlock, selectedEdgeId]
  );

  const onSelectionChange = useCallback(
    ({ nodes: selNodes, edges: selEdges }: { nodes: any[]; edges: any[] }) => {
      if (selEdges.length > 0) {
        setSelectedEdgeId(selEdges[0].id);
        selectBlock(null);
      } else if (selNodes.length > 0) {
        selectBlock(selNodes[0].id);
        setSelectedEdgeId(null);
      } else {
        setSelectedEdgeId(null);
      }
    },
    [selectBlock]
  );

  const onEdgeClick = useCallback((_e: any, edge: any) => {
    setSelectedEdgeId(edge.id);
    selectBlock(null);
  }, [selectBlock]);

  const isValidConnection = useCallback(
    (connection: FlowConnection | import("@xyflow/react").Edge): boolean => {
      if (!connection.source || !connection.target) return false;
      if (connection.source === connection.target) return false;

      const sourceBlock = graph.blocks[connection.source];
      const targetBlock = graph.blocks[connection.target];
      if (!sourceBlock || !targetBlock) return false;

      const sourceDef = blockRegistry.get(sourceBlock.definitionId);
      const targetDef = blockRegistry.get(targetBlock.definitionId);
      if (!sourceDef || !targetDef) return false;

      const sourcePort = sourceDef.outputs.find((p) => p.id === connection.sourceHandle);
      const targetPort = targetDef.inputs.find((p) => p.id === connection.targetHandle);
      if (!sourcePort || !targetPort) return false;

      if (targetPort.type === "any" || sourcePort.type === "any") return true;
      if (targetPort.type === sourcePort.type) return true;
      if (
        (sourcePort.type === "dataframe" && targetPort.type === "dataset") ||
        (sourcePort.type === "dataset" && targetPort.type === "dataframe")
      ) return true;

      return false;
    },
    [graph.blocks]
  );

  const onConnect = useCallback(
    (connection: FlowConnection) => {
      if (!connection.source || !connection.target) return;
      const valid = isValidConnection(connection);
      if (!valid) {
        setConnectionFeedback({
          message: "Incompatible port types",
          type: "error",
        });
        setTimeout(() => setConnectionFeedback(null), 3000);
        return;
      }

      recordHistory();
      addConnection({
        id: `conn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sourceBlockId: connection.source,
        sourcePortId: connection.sourceHandle ?? "output",
        targetBlockId: connection.target,
        targetPortId: connection.targetHandle ?? "input",
      });
      setConnectionFeedback({ message: "Connected", type: "valid" });
      setTimeout(() => setConnectionFeedback(null), 1500);
    },
    [isValidConnection, recordHistory, addConnection]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const blockId = e.dataTransfer.getData("application/codebrix-block-id");
      if (!blockId) return;
      const def = blockRegistry.get(blockId);
      if (!def) return;

      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addBlock(def, pos);
    },
    [screenToFlowPosition, addBlock]
  );

  const handleViewportChange = useCallback(
    (viewport: Viewport) => {
      setCurrentZoom(viewport.zoom);
      setZoomLevel(viewport.zoom);
    },
    [setZoomLevel]
  );

  const handleImportPipeline = async () => {
    const res = await openProjectFileDialog();
    if (!res) return;
    const parsed = parseCbxProject(res.content);
    if (parsed.success && parsed.project) {
      setGraph(parsed.project.graph);
      setProjectName(parsed.project.graph.name || "Imported Project");
      markDirty(true);
    }
  };

  // Node color helper for MiniMap
  const getNodeColor = (n: import("@xyflow/react").Node) => {
    const data = n.data as BlockNodeData | undefined;
    if (!data?.definitionId) return "#10b981";
    const def = blockRegistry.get(data.definitionId);
    switch (def?.category) {
      case "data": return "#06b6d4";
      case "preprocessing": return "#3b82f6";
      case "ml": return "#8b5cf6";
      case "evaluation": return "#f59e0b";
      case "visualization": return "#ec4899";
      default: return "#10b981";
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full bg-[var(--cb-elevation-app)] relative overflow-hidden select-none"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Toast feedback banner */}
      {connectionFeedback && (
        <div
          className={`absolute top-3 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded-full border shadow-xl flex items-center gap-2 text-xs font-mono backdrop-blur-md transition-all animate-in fade-in zoom-in-95 duration-100 ${
            connectionFeedback.type === "error"
              ? "bg-rose-950/95 border-rose-500/80 text-rose-200"
              : "bg-emerald-950/95 border-emerald-500/80 text-emerald-200"
          }`}
        >
          {connectionFeedback.type === "error" ? <X size={12} /> : <Check size={12} />}
          <span>{connectionFeedback.message}</span>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges as unknown as import("@xyflow/react").Edge[]}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onSelectionChange={onSelectionChange}
        onEdgeClick={onEdgeClick}
        onNodeDragStart={() => recordHistory()}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onNodeClick={(_e, node) => {
          setSelectedEdgeId(null);
          selectBlock(node.id);
        }}
        onPaneClick={() => {
          setSelectedEdgeId(null);
          selectBlock(null);
        }}
        onViewportChange={handleViewportChange}
        fitView
        colorMode="dark"
        className="bg-transparent"
        proOptions={{ hideAttribution: true }}
      >
        {/* Low-contrast but clearly perceptible dot grid */}
        <Background gap={20} size={1} color="rgba(255, 255, 255, 0.12)" />

        {/* Minimap: hidden when canvas has 0 nodes, drawn in category colors */}
        {blockCount > 0 && (
          <MiniMap
            nodeColor={getNodeColor}
            nodeStrokeColor="rgba(255, 255, 255, 0.3)"
            nodeStrokeWidth={1}
            nodeBorderRadius={2}
            maskColor="rgba(11, 13, 19, 0.75)"
            maskStrokeColor="var(--cb-accent)"
            maskStrokeWidth={1.5}
            zoomable
            pannable
            ariaLabel="Canvas MiniMap"
            className="!bg-[var(--cb-elevation-panel)] !border-[var(--cb-border-subtle)] !rounded-[var(--cb-radius-control)] !shadow-[var(--cb-shadow-overlay)]"
            style={{ width: 140, height: 95 }}
          />
        )}
      </ReactFlow>

      {/* Compact Vertical Zoom Controls with Zoom % Indicator */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-col items-center bg-[var(--cb-elevation-overlay)] border border-[var(--cb-border-strong)] rounded-[var(--cb-radius-control)] shadow-[var(--cb-shadow-tooltip)] overflow-hidden">
        <button
          onClick={() => zoomIn({ duration: 150 })}
          className="w-7 h-7 flex items-center justify-center text-[var(--cb-text-secondary)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Zoom in"
          aria-label="Zoom in"
        >
          <Plus size={13} />
        </button>
        <button
          onClick={() => fitView({ duration: 250, padding: 0.2 })}
          className="w-7 px-0.5 py-0.5 text-[9px] font-mono text-[var(--cb-text-muted)] hover:text-white border-y border-[var(--cb-border-subtle)] text-center cursor-pointer transition-colors"
          title="Click to fit view"
        >
          {Math.round(currentZoom * 100)}%
        </button>
        <button
          onClick={() => zoomOut({ duration: 150 })}
          className="w-7 h-7 flex items-center justify-center text-[var(--cb-text-secondary)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Zoom out"
          aria-label="Zoom out"
        >
          <Minus size={13} />
        </button>
        <button
          onClick={() => fitView({ duration: 250, padding: 0.2 })}
          className="w-7 h-7 flex items-center justify-center text-[var(--cb-text-secondary)] hover:text-white hover:bg-white/10 transition-colors border-t border-[var(--cb-border-subtle)] cursor-pointer"
          title="Fit entire graph to screen"
          aria-label="Fit to view"
        >
          <Maximize2 size={11} />
        </button>
        <Tooltip content="Auto-layout DAG (Format)" side="right">
          <button
            onClick={() => {
              useWorkflowStore.getState().autoLayout();
              setTimeout(() => fitView({ duration: 300, padding: 0.2 }), 80);
            }}
            className="w-7 h-7 flex items-center justify-center text-[var(--cb-text-secondary)] hover:text-white hover:bg-white/10 transition-colors border-t border-[var(--cb-border-subtle)] cursor-pointer"
            title="Auto-layout DAG (Format)"
            aria-label="Auto-layout DAG"
          >
            <LayoutGrid size={12} />
          </button>
        </Tooltip>
      </div>

      {/* Empty Canvas State Card (Task 6) - Disappears once a node exists */}
      {blockCount === 0 && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
          <div className="relative text-center p-6 rounded-[var(--cb-radius-panel)] bg-[var(--cb-elevation-panel)] border border-[var(--cb-border-strong)] shadow-[var(--cb-shadow-overlay)] max-w-sm pointer-events-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-xl bg-[var(--cb-accent-subtle)] border border-[var(--cb-accent-border)] flex items-center justify-center mx-auto mb-3 text-[var(--cb-accent)]">
              <Sparkles size={20} />
            </div>
            <h3 className="text-[14px] font-semibold text-[var(--cb-text-primary)] mb-1">
              Workflow Canvas
            </h3>
            <p className="text-[12px] text-[var(--cb-text-secondary)] mb-4 leading-relaxed">
              Drag blocks from the left or press <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-white">⌘K</kbd> to add.
            </p>

            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => {
                  useUiStore.getState().setPaletteOpen(true);
                  useUiStore.getState().setActivePaletteSection("library");
                }}
                className="w-full h-8 px-3 rounded-[var(--cb-radius-control)] bg-[var(--cb-accent)] hover:bg-[var(--cb-accent-hover)] text-white font-medium text-[12px] flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
              >
                <Boxes size={13} />
                <span>Browse blocks</span>
              </button>

              <button
                onClick={() => {
                  useUiStore.getState().setPaletteOpen(true);
                  useUiStore.getState().setActivePaletteSection("templates");
                }}
                className="w-full h-8 px-3 rounded-[var(--cb-radius-control)] bg-white/[0.04] hover:bg-white/10 text-[var(--cb-text-primary)] font-medium text-[12px] flex items-center justify-center gap-2 cursor-pointer border border-[var(--cb-border-subtle)] transition-colors"
              >
                <Sparkles size={13} className="text-amber-400" />
                <span>Open an example</span>
              </button>

              <button
                onClick={handleImportPipeline}
                className="w-full h-8 px-3 rounded-[var(--cb-radius-control)] bg-white/[0.04] hover:bg-white/10 text-[var(--cb-text-primary)] font-medium text-[12px] flex items-center justify-center gap-2 cursor-pointer border border-[var(--cb-border-subtle)] transition-colors"
              >
                <FileUp size={13} className="text-cyan-400" />
                <span>Import pipeline</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasContent />
    </ReactFlowProvider>
  );
}

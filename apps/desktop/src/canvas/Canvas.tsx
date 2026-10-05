import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Background,
  Controls,
  MiniMap,
  type Connection as FlowConnection,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { BlockNode } from "./BlockNode";
import { toReactFlowGraph, type BlockNodeData } from "./adapter";
import { useWorkflowStore, useUiStore } from "../stores";
import { blockRegistry } from "../registry";
import { CheckIcon, CloseIcon } from "../components/common/Icons";

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
  const { screenToFlowPosition, setCenter } = useReactFlow();
  const graph = useWorkflowStore((s) => s.graph);
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

  // Dedicated selection state for connections (edges)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Smoothly center the canvas on a focused block (e.g. from validation error click)
  useEffect(() => {
    if (focusTarget && focusTarget.blockId) {
      const block = graph.blocks[focusTarget.blockId];
      if (block) {
        setCenter(block.position.x + 110, block.position.y + 70, {
          zoom: 1.15,
          duration: 600,
        });
      }
    }
  }, [focusTarget, graph, setCenter]);

  // Global Keyboard Shortcuts: Ctrl+Z (Undo), Ctrl+Y / Ctrl+Shift+Z (Redo), Delete / Backspace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept shortcuts when editing text inputs / textareas
      if (isInputElement(document.activeElement)) {
        return;
      }

      const isModifier = e.ctrlKey || e.metaKey;

      // Ctrl + Z: Undo
      if (isModifier && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        undo();
        return;
      }

      // Ctrl + Y or Ctrl + Shift + Z: Redo
      if (
        (isModifier && e.shiftKey && (e.key === "z" || e.key === "Z")) ||
        (isModifier && (e.key === "y" || e.key === "Y"))
      ) {
        e.preventDefault();
        redo();
        return;
      }

      // Delete or Backspace: Explicitly handle edge vs block deletion
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedEdgeId) {
          e.preventDefault();
          removeConnection(selectedEdgeId);
          setSelectedEdgeId(null);
          setConnectionFeedback({
            message: "Connection deleted",
            type: "valid",
          });
          setTimeout(() => setConnectionFeedback(null), 2000);
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

  // Connection feedback state
  const [connectionFeedback, setConnectionFeedback] = useState<{
    message: string;
    type: "valid" | "error";
  } | null>(null);

  // Derive React Flow nodes and edges via adapter
  // Mutual exclusivity: If an edge is selected, NO block node is ever marked as selected!
  const { nodes, edges } = useMemo(() => {
    const flowGraph = toReactFlowGraph(graph);
    const mappedNodes = flowGraph.nodes.map((n) => ({
      ...n,
      selected: selectedEdgeId ? false : n.id === selectedBlockId,
    }));
    const mappedEdges = flowGraph.edges.map((e) => ({
      ...e,
      selected: e.id === selectedEdgeId,
    }));
    return { nodes: mappedNodes, edges: mappedEdges };
  }, [graph, selectedBlockId, selectedEdgeId]);

  const onNodesChange = useCallback(
    (changes: NodeChange<import("@xyflow/react").Node<BlockNodeData>>[]) => {
      for (const change of changes) {
        if (change.type === "position" && change.position) {
          updateBlockPosition(change.id, change.position);
        } else if (change.type === "remove") {
          // Only remove if this node was actually the target
          removeBlock(change.id);
          if (selectedBlockId === change.id) {
            selectBlock(null);
          }
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
          if (selectedEdgeId === change.id) {
            setSelectedEdgeId(null);
          }
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

  // Selection change synchronization
  const onSelectionChange = useCallback(
    ({
      nodes: selNodes,
      edges: selEdges,
    }: {
      nodes: import("@xyflow/react").Node[];
      edges: import("@xyflow/react").Edge[];
    }) => {
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

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: import("@xyflow/react").Edge) => {
      // Immediately clear block selection so only the edge is selected
      setSelectedEdgeId(edge.id);
      selectBlock(null);
      setConnectionFeedback({
        message: "Connection selected. Press Del/Backspace to remove, or double-click to delete.",
        type: "valid",
      });
      setTimeout(() => setConnectionFeedback(null), 3000);
    },
    [selectBlock]
  );

  const onEdgeDoubleClick = useCallback(
    (_event: React.MouseEvent, edge: import("@xyflow/react").Edge) => {
      removeConnection(edge.id);
      setSelectedEdgeId(null);
      setConnectionFeedback({
        message: "Connection removed",
        type: "valid",
      });
      setTimeout(() => setConnectionFeedback(null), 2000);
    },
    [removeConnection]
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: import("@xyflow/react").Edge) => {
      event.preventDefault();
      removeConnection(edge.id);
      setSelectedEdgeId(null);
      setConnectionFeedback({
        message: "Connection deleted",
        type: "valid",
      });
      setTimeout(() => setConnectionFeedback(null), 2000);
    },
    [removeConnection]
  );

  // Type compatibility check
  const isValidConnection = useCallback(
    (connection: FlowConnection | import("@xyflow/react").Edge): boolean => {
      const sourceInstance = graph.blocks[connection.source];
      const targetInstance = graph.blocks[connection.target];

      if (!sourceInstance || !targetInstance) return false;

      const sourceDef = blockRegistry.get(sourceInstance.definitionId);
      const targetDef = blockRegistry.get(targetInstance.definitionId);

      if (!sourceDef || !targetDef) return false;

      const sourcePort = sourceDef.outputs.find((p) => p.id === connection.sourceHandle);
      const targetPort = targetDef.inputs.find((p) => p.id === connection.targetHandle);

      if (!sourcePort || !targetPort) return false;

      const compatible = blockRegistry.checkPortCompatibility(
        sourcePort.type,
        targetPort.type
      );

      if (!compatible) {
        setConnectionFeedback({
          message: `Incompatible: Cannot connect '${sourcePort.type}' output to '${targetPort.type}' input`,
          type: "error",
        });
      } else {
        setConnectionFeedback({
          message: `Compatible connection: '${sourcePort.type}' → '${targetPort.type}'`,
          type: "valid",
        });
      }

      return compatible;
    },
    [graph]
  );

  const onConnect = useCallback(
    (params: FlowConnection) => {
      if (!params.source || !params.target) return;

      const sourceInstance = graph.blocks[params.source];
      const targetInstance = graph.blocks[params.target];
      if (!sourceInstance || !targetInstance) return;

      const sourceDef = blockRegistry.get(sourceInstance.definitionId);
      const targetDef = blockRegistry.get(targetInstance.definitionId);
      if (!sourceDef || !targetDef) return;

      const sourcePort = sourceDef.outputs.find((p) => p.id === params.sourceHandle);
      const targetPort = targetDef.inputs.find((p) => p.id === params.targetHandle);
      if (!sourcePort || !targetPort) return;

      if (!blockRegistry.checkPortCompatibility(sourcePort.type, targetPort.type)) {
        return;
      }

      addConnection({
        id: `conn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sourceBlockId: params.source,
        sourcePortId: params.sourceHandle || "output",
        targetBlockId: params.target,
        targetPortId: params.targetHandle || "input",
      });

      setConnectionFeedback({
        message: "Connection created successfully",
        type: "valid",
      });
      setTimeout(() => setConnectionFeedback(null), 2500);
    },
    [graph, addConnection]
  );

  const onConnectEnd = useCallback(() => {
    setTimeout(() => {
      setConnectionFeedback(null);
    }, 2500);
  }, []);

  // Handle Drag-and-Drop from Palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const blockId = event.dataTransfer.getData("application/codebrix-block-id");
      if (!blockId) return;

      const def = blockRegistry.get(blockId);
      if (!def) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addBlock(def, position);
    },
    [screenToFlowPosition, addBlock]
  );

  return (
    <div
      className="flex-1 h-full bg-slate-950 relative overflow-hidden select-none"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Type compatibility & action floating feedback banner */}
      {connectionFeedback && (
        <div
          className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-full border shadow-2xl flex items-center gap-2 text-xs font-mono backdrop-blur-md transition-all animate-in fade-in zoom-in-95 duration-150 ${
            connectionFeedback.type === "error"
              ? "bg-rose-950/95 border-rose-500/80 text-rose-200 shadow-rose-950/50"
              : "bg-slate-900/95 border-indigo-500/80 text-indigo-200 shadow-slate-950/50"
          }`}
        >
          <span>
            {connectionFeedback.type === "error" ? (
              <CloseIcon size={12} className="text-rose-300" />
            ) : (
              <CheckIcon size={12} className="text-emerald-300" />
            )}
          </span>
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
        onEdgeDoubleClick={onEdgeDoubleClick}
        onEdgeContextMenu={onEdgeContextMenu}
        onNodeDragStart={() => recordHistory()}
        deleteKeyCode={["Backspace", "Delete"]}
        edgesFocusable={true}
        edgesReconnectable={true}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        isValidConnection={isValidConnection}
        onNodeClick={(_event, node) => {
          setSelectedEdgeId(null);
          selectBlock(node.id);
        }}
        onPaneClick={() => {
          setSelectedEdgeId(null);
          selectBlock(null);
        }}
        fitView
        colorMode="dark"
        className="bg-[#080a0f]"
      >
        <Background gap={24} size={1.2} color="#232a3d" />
        <Controls className="!bg-black/60 !backdrop-blur-xl !border-white/10 !text-slate-300 rounded-xl overflow-hidden shadow-2xl" />
        <MiniMap
          nodeColor="#f59e0b"
          maskColor="rgba(7, 10, 16, 0.75)"
          className="!bg-black/60 !backdrop-blur-xl !border-white/10 rounded-xl overflow-hidden shadow-2xl"
        />
      </ReactFlow>
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

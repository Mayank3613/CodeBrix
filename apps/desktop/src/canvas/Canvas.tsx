import { useState, useCallback, useMemo } from "react";
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

const nodeTypes = {
  blockNode: BlockNode,
};

function CanvasContent() {
  const { screenToFlowPosition } = useReactFlow();
  const graph = useWorkflowStore((s) => s.graph);
  const updateBlockPosition = useWorkflowStore((s) => s.updateBlockPosition);
  const addBlock = useWorkflowStore((s) => s.addBlock);
  const addConnection = useWorkflowStore((s) => s.addConnection);
  const removeConnection = useWorkflowStore((s) => s.removeConnection);
  const removeBlock = useWorkflowStore((s) => s.removeBlock);

  const selectedBlockId = useUiStore((s) => s.selectedBlockId);
  const selectBlock = useUiStore((s) => s.selectBlock);

  // Connection feedback state
  const [connectionFeedback, setConnectionFeedback] = useState<{
    message: string;
    type: "valid" | "error";
  } | null>(null);

  // Derive React Flow nodes and edges via adapter
  const { nodes, edges } = useMemo(() => {
    const flowGraph = toReactFlowGraph(graph);
    const mappedNodes = flowGraph.nodes.map((n) => ({
      ...n,
      selected: n.id === selectedBlockId,
    }));
    return { nodes: mappedNodes, edges: flowGraph.edges };
  }, [graph, selectedBlockId]);

  const onNodesChange = useCallback(
    (changes: NodeChange<import("@xyflow/react").Node<BlockNodeData>>[]) => {
      for (const change of changes) {
        if (change.type === "position" && change.position) {
          updateBlockPosition(change.id, change.position);
        } else if (change.type === "remove") {
          removeBlock(change.id);
        }
      }
    },
    [updateBlockPosition, removeBlock]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      for (const change of changes) {
        if (change.type === "remove") {
          removeConnection(change.id);
        }
      }
    },
    [removeConnection]
  );

  const onEdgeDoubleClick = useCallback(
    (_event: React.MouseEvent, edge: import("@xyflow/react").Edge) => {
      removeConnection(edge.id);
      setConnectionFeedback({
        message: "Connection removed",
        type: "valid",
      });
    },
    [removeConnection]
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: import("@xyflow/react").Edge) => {
      event.preventDefault();
      removeConnection(edge.id);
      setConnectionFeedback({
        message: "Connection deleted",
        type: "valid",
      });
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
      {/* Type compatibility floating feedback banner */}
      {connectionFeedback && (
        <div
          className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full border shadow-2xl flex items-center gap-2 text-xs font-mono backdrop-blur-md transition-all animate-bounce ${
            connectionFeedback.type === "error"
              ? "bg-rose-950/95 border-rose-500/80 text-rose-200 shadow-rose-950/50"
              : "bg-emerald-950/95 border-emerald-500/80 text-emerald-200 shadow-emerald-950/50"
          }`}
        >
          <span className="font-bold">
            {connectionFeedback.type === "error" ? "✗" : "✓"}
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
        onEdgeDoubleClick={onEdgeDoubleClick}
        onEdgeContextMenu={onEdgeContextMenu}
        deleteKeyCode={["Backspace", "Delete"]}
        edgesFocusable={true}
        edgesReconnectable={true}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        isValidConnection={isValidConnection}
        onNodeClick={(_event, node) => selectBlock(node.id)}
        onPaneClick={() => selectBlock(null)}
        fitView
        colorMode="dark"
        className="bg-slate-950"
      >
        <Background gap={24} size={1.5} color="#334155" />
        <Controls className="!bg-slate-900 !border-slate-800 !text-slate-300" />
        <MiniMap
          nodeColor="#6366f1"
          maskColor="rgba(15, 23, 42, 0.7)"
          className="!bg-slate-900 !border-slate-800 rounded-lg overflow-hidden"
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

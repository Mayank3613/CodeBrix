import { useState, useCallback, useMemo } from "react";
import {
  ReactFlow,
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

export default function Canvas() {
  const graph = useWorkflowStore((s) => s.graph);
  const updateBlockPosition = useWorkflowStore((s) => s.updateBlockPosition);
  const addConnection = useWorkflowStore((s) => s.addConnection);
  const removeConnection = useWorkflowStore((s) => s.removeConnection);
  const removeBlock = useWorkflowStore((s) => s.removeBlock);

  const selectedBlockId = useUiStore((s) => s.selectedBlockId);
  const selectBlock = useUiStore((s) => s.selectBlock);

  // Derive React Flow nodes and edges via adapter
  const { nodes, edges } = useMemo(() => {
    const flowGraph = toReactFlowGraph(graph);
    // Mark the selected node
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

  const [connectionFeedback, setConnectionFeedback] = useState<{
    message: string;
    type: "error" | "valid";
  } | null>(null);

  const isValidConnection = useCallback(
    (connection: import("@xyflow/react").Edge | FlowConnection) => {
      if (!connection.source || !connection.target) return false;
      if (connection.source === connection.target) {
        setConnectionFeedback({
          message: "Cannot connect a block to itself",
          type: "error",
        });
        return false;
      }

      const sourceBlock = graph.blocks[connection.source];
      const targetBlock = graph.blocks[connection.target];
      if (!sourceBlock || !targetBlock) return false;

      const sourceDef = blockRegistry.get(sourceBlock.definitionId);
      const targetDef = blockRegistry.get(targetBlock.definitionId);

      const sourcePort = sourceDef?.outputs.find((p) => p.id === connection.sourceHandle);
      const targetPort = targetDef?.inputs.find((p) => p.id === connection.targetHandle);

      if (sourcePort && targetPort) {
        const isCompatible = blockRegistry.checkPortCompatibility(
          sourcePort.type,
          targetPort.type
        );
        if (!isCompatible) {
          setConnectionFeedback({
            message: `Incompatible types: '${sourcePort.type}' cannot connect to '${targetPort.type}'`,
            type: "error",
          });
          return false;
        }

        setConnectionFeedback({
          message: `Compatible connection: '${sourcePort.name}' (${sourcePort.type}) → '${targetPort.name}' (${targetPort.type})`,
          type: "valid",
        });
        return true;
      }

      return true;
    },
    [graph]
  );

  const onConnect = useCallback(
    (params: FlowConnection) => {
      if (!params.source || !params.target) return;

      const sourceBlock = graph.blocks[params.source];
      const targetBlock = graph.blocks[params.target];
      if (!sourceBlock || !targetBlock) return;

      const sourceDef = blockRegistry.get(sourceBlock.definitionId);
      const targetDef = blockRegistry.get(targetBlock.definitionId);

      const sourcePort = sourceDef?.outputs.find((p) => p.id === params.sourceHandle);
      const targetPort = targetDef?.inputs.find((p) => p.id === params.targetHandle);

      // Verify port compatibility if definitions are loaded
      if (sourcePort && targetPort) {
        const isCompatible = blockRegistry.checkPortCompatibility(
          sourcePort.type,
          targetPort.type
        );
        if (!isCompatible) {
          setConnectionFeedback({
            message: `Blocked connection: '${sourcePort.type}' is not compatible with '${targetPort.type}'`,
            type: "error",
          });
          return;
        }
      }

      addConnection({
        id: `conn-${Date.now().toString(36)}`,
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
    // Clear feedback shortly after drag release
    setTimeout(() => {
      setConnectionFeedback(null);
    }, 2500);
  }, []);

  return (
    <div className="flex-1 h-full bg-slate-950 relative overflow-hidden select-none">
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

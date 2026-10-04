import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Connection as FlowConnection,
  type EdgeChange,
  type NodeChange,
  applyNodeChanges,
  applyEdgeChanges,
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
        } else if (change.type === "select") {
          if (change.selected) {
            selectBlock(change.id);
          }
        }
      }
    },
    [updateBlockPosition, removeBlock, selectBlock]
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
          console.warn(
            `Incompatible port connection: ${sourcePort.type} -> ${targetPort.type}`
          );
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
    },
    [graph, addConnection]
  );

  return (
    <div className="flex-1 h-full bg-slate-950 relative overflow-hidden select-none">
      <ReactFlow
        nodes={nodes}
        edges={edges as unknown as import("@xyflow/react").Edge[]}
        nodeTypes={nodeTypes}
        onNodesChange={(changes) => {
          applyNodeChanges(changes, nodes);
          onNodesChange(changes);
        }}
        onEdgesChange={(changes) => {
          applyEdgeChanges(changes, edges as unknown as import("@xyflow/react").Edge[]);
          onEdgesChange(changes);
        }}
        onConnect={onConnect}
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

import { create } from "zustand";
import type {
  WorkflowGraph,
  BlockDefinition,
  Position2D,
  BlockState,
  Connection,
  BlockInstance,
} from "@codebrix/types";
import { createIrisWorkflowMock } from "@codebrix/shared";

export interface WorkflowState {
  graph: WorkflowGraph;
  setGraph: (graph: WorkflowGraph) => void;
  addBlock: (definition: BlockDefinition, position: Position2D) => string;
  removeBlock: (blockId: string) => void;
  updateBlockPosition: (blockId: string, position: Position2D) => void;
  updateBlockConfig: (blockId: string, key: string, value: unknown) => void;
  updateBlockState: (blockId: string, state: BlockState) => void;
  addConnection: (connection: Connection) => void;
  removeConnection: (connectionId: string) => void;
  clearWorkflow: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  graph: createIrisWorkflowMock(),

  setGraph: (graph: WorkflowGraph) => set({ graph }),

  addBlock: (definition: BlockDefinition, position: Position2D) => {
    const id = `blk-${definition.category}-${Date.now().toString(36)}`;
    const newInstance: BlockInstance = {
      id,
      definitionId: definition.id,
      label: definition.name,
      position,
      config: Object.fromEntries(
        Object.entries(definition.configSchema || {}).map(([k, v]) => [k, v.defaultValue ?? ""])
      ),
      state: "idle",
    };

    set((state) => ({
      graph: {
        ...state.graph,
        blocks: {
          ...state.graph.blocks,
          [id]: newInstance,
        },
      },
    }));

    return id;
  },

  removeBlock: (blockId: string) =>
    set((state) => {
      const nextBlocks = { ...state.graph.blocks };
      delete nextBlocks[blockId];

      const nextConnections = state.graph.connections.filter(
        (c) => c.sourceBlockId !== blockId && c.targetBlockId !== blockId
      );

      return {
        graph: {
          ...state.graph,
          blocks: nextBlocks,
          connections: nextConnections,
        },
      };
    }),

  updateBlockPosition: (blockId: string, position: Position2D) =>
    set((state) => {
      const target = state.graph.blocks[blockId];
      if (!target) return state;

      return {
        graph: {
          ...state.graph,
          blocks: {
            ...state.graph.blocks,
            [blockId]: {
              ...target,
              position,
            },
          },
        },
      };
    }),

  updateBlockConfig: (blockId: string, key: string, value: unknown) =>
    set((state) => {
      const target = state.graph.blocks[blockId];
      if (!target) return state;

      return {
        graph: {
          ...state.graph,
          blocks: {
            ...state.graph.blocks,
            [blockId]: {
              ...target,
              config: {
                ...target.config,
                [key]: value,
              },
            },
          },
        },
      };
    }),

  updateBlockState: (blockId: string, blockState: BlockState) =>
    set((state) => {
      const target = state.graph.blocks[blockId];
      if (!target) return state;

      return {
        graph: {
          ...state.graph,
          blocks: {
            ...state.graph.blocks,
            [blockId]: {
              ...target,
              state: blockState,
            },
          },
        },
      };
    }),

  addConnection: (connection: Connection) =>
    set((state) => {
      const exists = state.graph.connections.some(
        (c) =>
          c.sourceBlockId === connection.sourceBlockId &&
          c.sourcePortId === connection.sourcePortId &&
          c.targetBlockId === connection.targetBlockId &&
          c.targetPortId === connection.targetPortId
      );
      if (exists) return state;

      return {
        graph: {
          ...state.graph,
          connections: [...state.graph.connections, connection],
        },
      };
    }),

  removeConnection: (connectionId: string) =>
    set((state) => ({
      graph: {
        ...state.graph,
        connections: state.graph.connections.filter((c) => c.id !== connectionId),
      },
    })),

  clearWorkflow: () =>
    set((state) => ({
      graph: {
        ...state.graph,
        blocks: {},
        connections: [],
      },
    })),
}));

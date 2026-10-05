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
import { useProjectStore } from "./projectStore";
import { autoLayoutGraphLeftToRight } from "../canvas/layout";

const MAX_HISTORY = 50;

/** Deep clone a WorkflowGraph to ensure history snapshots remain immutable */
function cloneGraph(graph: WorkflowGraph): WorkflowGraph {
  return {
    ...graph,
    blocks: JSON.parse(JSON.stringify(graph.blocks)),
    connections: JSON.parse(JSON.stringify(graph.connections)),
    metadata: { ...graph.metadata },
  };
}

export interface WorkflowState {
  graph: WorkflowGraph;
  past: WorkflowGraph[];
  future: WorkflowGraph[];

  setGraph: (graph: WorkflowGraph, clearHistory?: boolean) => void;
  recordHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  addBlock: (definition: BlockDefinition, position: Position2D) => string;
  removeBlock: (blockId: string) => void;
  updateBlockPosition: (blockId: string, position: Position2D) => void;
  updateBlockLabel: (blockId: string, label: string) => void;
  updateBlockConfig: (blockId: string, key: string, value: unknown) => void;
  updateBlockState: (blockId: string, state: BlockState) => void;
  addConnection: (connection: Connection) => void;
  removeConnection: (connectionId: string) => void;
  clearWorkflow: () => void;
  autoLayout: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  graph: createIrisWorkflowMock(),
  past: [],
  future: [],

  setGraph: (graph: WorkflowGraph, clearHistory = true) =>
    set((state) => {
      if (clearHistory) {
        return { graph, past: [], future: [] };
      }
      const snapshot = cloneGraph(state.graph);
      const nextPast = [...state.past, snapshot].slice(-MAX_HISTORY);
      return { graph, past: nextPast, future: [] };
    }),

  recordHistory: () =>
    set((state) => {
      const snapshot = cloneGraph(state.graph);
      const nextPast = [...state.past, snapshot].slice(-MAX_HISTORY);
      return { past: nextPast, future: [] };
    }),

  undo: () => {
    set((state) => {
      if (state.past.length === 0) return state;

      const previous = state.past[state.past.length - 1];
      const nextPast = state.past.slice(0, state.past.length - 1);
      const currentSnapshot = cloneGraph(state.graph);

      useProjectStore.getState().markDirty(true);

      return {
        graph: previous,
        past: nextPast,
        future: [currentSnapshot, ...state.future].slice(0, MAX_HISTORY),
      };
    });
  },

  redo: () => {
    set((state) => {
      if (state.future.length === 0) return state;

      const next = state.future[0];
      const nextFuture = state.future.slice(1);
      const currentSnapshot = cloneGraph(state.graph);
      const nextPast = [...state.past, currentSnapshot].slice(-MAX_HISTORY);

      useProjectStore.getState().markDirty(true);

      return {
        graph: next,
        past: nextPast,
        future: nextFuture,
      };
    });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

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

    set((state) => {
      const snapshot = cloneGraph(state.graph);
      const nextPast = [...state.past, snapshot].slice(-MAX_HISTORY);

      return {
        graph: {
          ...state.graph,
          blocks: {
            ...state.graph.blocks,
            [id]: newInstance,
          },
        },
        past: nextPast,
        future: [],
      };
    });

    useProjectStore.getState().markDirty(true);
    return id;
  },

  removeBlock: (blockId: string) => {
    useProjectStore.getState().markDirty(true);
    return set((state) => {
      if (!state.graph.blocks[blockId]) return state;

      const snapshot = cloneGraph(state.graph);
      const nextPast = [...state.past, snapshot].slice(-MAX_HISTORY);

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
        past: nextPast,
        future: [],
      };
    });
  },

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

  updateBlockLabel: (blockId: string, label: string) => {
    useProjectStore.getState().markDirty(true);
    return set((state) => {
      const target = state.graph.blocks[blockId];
      if (!target) return state;

      const snapshot = cloneGraph(state.graph);
      const nextPast = [...state.past, snapshot].slice(-MAX_HISTORY);

      return {
        graph: {
          ...state.graph,
          blocks: {
            ...state.graph.blocks,
            [blockId]: {
              ...target,
              label,
            },
          },
        },
        past: nextPast,
        future: [],
      };
    });
  },

  updateBlockConfig: (blockId: string, key: string, value: unknown) => {
    useProjectStore.getState().markDirty(true);
    return set((state) => {
      const target = state.graph.blocks[blockId];
      if (!target) return state;

      const snapshot = cloneGraph(state.graph);
      const nextPast = [...state.past, snapshot].slice(-MAX_HISTORY);

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
        past: nextPast,
        future: [],
      };
    });
  },

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

  addConnection: (connection: Connection) => {
    useProjectStore.getState().markDirty(true);
    return set((state) => {
      const exists = state.graph.connections.some(
        (c) =>
          c.sourceBlockId === connection.sourceBlockId &&
          c.sourcePortId === connection.sourcePortId &&
          c.targetBlockId === connection.targetBlockId &&
          c.targetPortId === connection.targetPortId
      );
      if (exists) return state;

      const snapshot = cloneGraph(state.graph);
      const nextPast = [...state.past, snapshot].slice(-MAX_HISTORY);

      return {
        graph: {
          ...state.graph,
          connections: [...state.graph.connections, connection],
        },
        past: nextPast,
        future: [],
      };
    });
  },

  removeConnection: (connectionId: string) => {
    useProjectStore.getState().markDirty(true);
    return set((state) => {
      const conn = state.graph.connections.find((c) => c.id === connectionId);
      if (!conn) return state;

      const snapshot = cloneGraph(state.graph);
      const nextPast = [...state.past, snapshot].slice(-MAX_HISTORY);

      return {
        graph: {
          ...state.graph,
          connections: state.graph.connections.filter((c) => c.id !== connectionId),
        },
        past: nextPast,
        future: [],
      };
    });
  },

  clearWorkflow: () =>
    set((state) => {
      const snapshot = cloneGraph(state.graph);
      const nextPast = [...state.past, snapshot].slice(-MAX_HISTORY);

      return {
        graph: {
          ...state.graph,
          blocks: {},
          connections: [],
        },
        past: nextPast,
        future: [],
      };
    }),

  autoLayout: () => {
    const { graph, recordHistory } = get();
    recordHistory();
    const newPositions = autoLayoutGraphLeftToRight(graph);
    const updatedBlocks = { ...graph.blocks };
    for (const [id, pos] of Object.entries(newPositions)) {
      if (updatedBlocks[id]) {
        updatedBlocks[id] = {
          ...updatedBlocks[id],
          position: pos,
        };
      }
    }
    useProjectStore.getState().markDirty(true);
    set({
      graph: {
        ...graph,
        blocks: updatedBlocks,
      },
    });
  },
}));

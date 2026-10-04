import { create } from "zustand";
import type { ExecutionResult, BlockState, OutputMessage } from "@codebrix/types";

export type RunState = "idle" | "running" | "success" | "failed";

export interface ExecutionState {
  runState: RunState;
  blockStatuses: Record<string, BlockState>;
  activeBlockId: string | null;
  latestResult: ExecutionResult | null;
  executionId: string | null;
  outputs: OutputMessage[];
  statusMessage: string | null;

  setRunState: (state: RunState) => void;
  setBlockStatus: (blockId: string, status: BlockState) => void;
  setActiveBlockId: (blockId: string | null) => void;
  setLatestResult: (result: ExecutionResult | null) => void;
  setExecutionId: (id: string | null) => void;
  setStatusMessage: (msg: string | null) => void;
  addOutput: (output: OutputMessage) => void;
  clearOutputs: () => void;
  resetExecution: () => void;
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  runState: "idle",
  blockStatuses: {},
  activeBlockId: null,
  latestResult: null,
  executionId: null,
  outputs: [],
  statusMessage: null,

  setRunState: (runState: RunState) => set({ runState }),

  setBlockStatus: (blockId: string, status: BlockState) =>
    set((state) => ({
      blockStatuses: {
        ...state.blockStatuses,
        [blockId]: status,
      },
    })),

  setActiveBlockId: (blockId: string | null) => set({ activeBlockId: blockId }),

  setLatestResult: (latestResult: ExecutionResult | null) =>
    set((state) => ({
      latestResult,
      outputs: latestResult?.outputs ? latestResult.outputs : state.outputs,
    })),

  setExecutionId: (executionId: string | null) => set({ executionId }),

  setStatusMessage: (statusMessage: string | null) => set({ statusMessage }),

  addOutput: (output: OutputMessage) =>
    set((state) => ({
      outputs: [...state.outputs, output],
    })),

  clearOutputs: () => set({ outputs: [] }),

  resetExecution: () =>
    set({
      runState: "idle",
      blockStatuses: {},
      activeBlockId: null,
      latestResult: null,
      executionId: null,
      outputs: [],
      statusMessage: null,
    }),
}));

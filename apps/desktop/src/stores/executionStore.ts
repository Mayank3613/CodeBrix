import { create } from "zustand";
import type { ExecutionResult, BlockState } from "@codebrix/types";

export type RunState = "idle" | "running" | "success" | "failed";

export interface ExecutionState {
  runState: RunState;
  blockStatuses: Record<string, BlockState>;
  activeBlockId: string | null;
  latestResult: ExecutionResult | null;

  setRunState: (state: RunState) => void;
  setBlockStatus: (blockId: string, status: BlockState) => void;
  setActiveBlockId: (blockId: string | null) => void;
  setLatestResult: (result: ExecutionResult | null) => void;
  resetExecution: () => void;
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  runState: "idle",
  blockStatuses: {},
  activeBlockId: null,
  latestResult: null,

  setRunState: (runState: RunState) => set({ runState }),

  setBlockStatus: (blockId: string, status: BlockState) =>
    set((state) => ({
      blockStatuses: {
        ...state.blockStatuses,
        [blockId]: status,
      },
    })),

  setActiveBlockId: (blockId: string | null) => set({ activeBlockId: blockId }),

  setLatestResult: (latestResult: ExecutionResult | null) => set({ latestResult }),

  resetExecution: () =>
    set({
      runState: "idle",
      blockStatuses: {},
      activeBlockId: null,
      latestResult: null,
    }),
}));

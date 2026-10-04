import { create } from "zustand";

export type OutputTab =
  | "metrics"
  | "console"
  | "table"
  | "image"
  | "plots"
  | "visuals";

export interface UiState {
  selectedBlockId: string | null;
  focusedBlockId: string | null;
  focusTarget: { blockId: string; timestamp: number } | null;
  activeOutputTab: OutputTab;
  isPaletteOpen: boolean;
  isPropertiesOpen: boolean;
  isOutputOpen: boolean;
  outputPanelHeight: number;
  zoomLevel: number;

  selectBlock: (blockId: string | null) => void;
  focusBlock: (blockId: string) => void;
  setActiveOutputTab: (tab: OutputTab) => void;
  togglePalette: () => void;
  toggleProperties: () => void;
  toggleOutput: () => void;
  setOutputPanelHeight: (height: number) => void;
  setZoomLevel: (zoom: number) => void;
  resetUi: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedBlockId: "blk-csv",
  focusedBlockId: null,
  focusTarget: null,
  activeOutputTab: "metrics",
  isPaletteOpen: true,
  isPropertiesOpen: true,
  isOutputOpen: true,
  outputPanelHeight: 320,
  zoomLevel: 1,

  selectBlock: (blockId: string | null) =>
    set({ selectedBlockId: blockId, focusedBlockId: blockId }),

  focusBlock: (blockId: string) =>
    set({
      selectedBlockId: blockId,
      focusedBlockId: blockId,
      focusTarget: { blockId, timestamp: Date.now() },
    }),

  setActiveOutputTab: (tab: OutputTab) => set({ activeOutputTab: tab }),

  togglePalette: () => set((state) => ({ isPaletteOpen: !state.isPaletteOpen })),

  toggleProperties: () =>
    set((state) => ({ isPropertiesOpen: !state.isPropertiesOpen })),

  toggleOutput: () => set((state) => ({ isOutputOpen: !state.isOutputOpen })),

  setOutputPanelHeight: (height: number) =>
    set({
      outputPanelHeight: Math.max(
        140,
        Math.min(typeof window !== "undefined" ? window.innerHeight - 100 : 700, height)
      ),
    }),

  setZoomLevel: (zoom: number) => set({ zoomLevel: zoom }),

  resetUi: () =>
    set({
      selectedBlockId: null,
      focusedBlockId: null,
      focusTarget: null,
      activeOutputTab: "metrics",
      isPaletteOpen: true,
      isPropertiesOpen: true,
      isOutputOpen: true,
      zoomLevel: 1,
    }),
}));

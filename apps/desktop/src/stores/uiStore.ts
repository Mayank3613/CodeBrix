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
  paletteWidth: number;
  propertiesWidth: number;
  outputPanelHeight: number;
  zoomLevel: number;

  selectBlock: (blockId: string | null) => void;
  focusBlock: (blockId: string) => void;
  setActiveOutputTab: (tab: OutputTab) => void;
  togglePalette: () => void;
  toggleProperties: () => void;
  toggleOutput: () => void;
  setPaletteWidth: (width: number) => void;
  setPropertiesWidth: (width: number) => void;
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
  paletteWidth: 320,
  propertiesWidth: 300,
  outputPanelHeight: 260,
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

  setPaletteWidth: (width: number) =>
    set({
      paletteWidth: Math.max(240, Math.min(560, Math.round(width))),
    }),

  setPropertiesWidth: (width: number) =>
    set({
      propertiesWidth: Math.max(220, Math.min(520, Math.round(width))),
    }),

  setOutputPanelHeight: (height: number) =>
    set({
      outputPanelHeight: Math.max(
        120,
        Math.min(typeof window !== "undefined" ? Math.round(window.innerHeight * 0.75) : 600, Math.round(height))
      ),
    }),

  setZoomLevel: (zoom: number) => set({ zoomLevel: zoom }),

  resetUi: () =>
    set({
      selectedBlockId: null,
      focusedBlockId: null,
      focusTarget: null,
      activeOutputTab: "console",
      isPaletteOpen: true,
      isPropertiesOpen: true,
      isOutputOpen: true,
      paletteWidth: 320,
      propertiesWidth: 300,
      outputPanelHeight: 260,
      zoomLevel: 1,
    }),
}));

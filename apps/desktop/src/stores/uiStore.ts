import { create } from "zustand";

export type OutputTab =
  | "metrics"
  | "console"
  | "table"
  | "image"
  | "plots"
  | "visuals";

export type PaletteSection = "playground" | "library" | "custom" | "templates";

function getInitialTerminalHeight(): number {
  if (typeof window === "undefined") return 260;
  try {
    const saved = localStorage.getItem("codebrix:terminal-height");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!Number.isNaN(parsed) && parsed >= 160) return parsed;
    }
  } catch {
    // ignore
  }
  return Math.max(160, Math.round(window.innerHeight * 0.35));
}

export interface UiState {
  selectedBlockId: string | null;
  focusedBlockId: string | null;
  focusTarget: { blockId: string; timestamp: number } | null;
  activeOutputTab: OutputTab;
  isPaletteOpen: boolean;
  activePaletteSection: PaletteSection;
  isPropertiesOpen: boolean;
  isOutputOpen: boolean;
  paletteWidth: number;
  propertiesWidth: number;
  outputPanelHeight: number;
  zoomLevel: number;
  isCustomBlockModalOpen: boolean;
  editCustomBlockId: string | null;

  selectBlock: (blockId: string | null) => void;
  focusBlock: (blockId: string) => void;
  setActiveOutputTab: (tab: OutputTab) => void;
  togglePalette: () => void;
  setPaletteOpen: (open: boolean) => void;
  setActivePaletteSection: (section: PaletteSection) => void;
  toggleProperties: () => void;
  toggleOutput: () => void;
  setOutputOpen: (open: boolean) => void;
  setPaletteWidth: (width: number) => void;
  setPropertiesWidth: (width: number) => void;
  setOutputPanelHeight: (height: number) => void;
  setZoomLevel: (zoom: number) => void;
  openCustomBlockModal: (blockId?: string | null) => void;
  closeCustomBlockModal: () => void;
  resetUi: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedBlockId: null,
  focusedBlockId: null,
  focusTarget: null,
  activeOutputTab: "metrics",
  isPaletteOpen: true,
  activePaletteSection: "library",
  isPropertiesOpen: false,
  isOutputOpen: true,
  paletteWidth: 320,
  propertiesWidth: 300,
  outputPanelHeight: getInitialTerminalHeight(),
  zoomLevel: 1,
  isCustomBlockModalOpen: false,
  editCustomBlockId: null,

  selectBlock: (blockId: string | null) =>
    set({ selectedBlockId: blockId, focusedBlockId: blockId }),

  focusBlock: (blockId: string) =>
    set({
      selectedBlockId: blockId,
      focusedBlockId: blockId,
      focusTarget: { blockId, timestamp: Date.now() },
    }),

  setActiveOutputTab: (tab: OutputTab) => set({ activeOutputTab: tab }),

  togglePalette: () =>
    set((state) => {
      const next = !state.isPaletteOpen;
      if (typeof window !== "undefined") {
        setTimeout(() => window.dispatchEvent(new CustomEvent("codebrix:fit-view")), 50);
      }
      return {
        isPaletteOpen: next,
        ...(next ? { isPropertiesOpen: false } : {}),
      };
    }),

  setPaletteOpen: (open: boolean) => {
    if (typeof window !== "undefined") {
      setTimeout(() => window.dispatchEvent(new CustomEvent("codebrix:fit-view")), 50);
    }
    set({
      isPaletteOpen: open,
      ...(open ? { isPropertiesOpen: false } : {}),
    });
  },

  setActivePaletteSection: (section: PaletteSection) => {
    if (typeof window !== "undefined") {
      setTimeout(() => window.dispatchEvent(new CustomEvent("codebrix:fit-view")), 50);
    }
    set({
      isPaletteOpen: true,
      isPropertiesOpen: false,
      activePaletteSection: section,
    });
  },

  toggleProperties: () =>
    set((state) => {
      const next = !state.isPropertiesOpen;
      if (typeof window !== "undefined") {
        setTimeout(() => window.dispatchEvent(new CustomEvent("codebrix:fit-view")), 50);
      }
      return {
        isPropertiesOpen: next,
        ...(next ? { isPaletteOpen: false } : {}),
      };
    }),

  setPropertiesOpen: (open: boolean) => {
    if (typeof window !== "undefined") {
      setTimeout(() => window.dispatchEvent(new CustomEvent("codebrix:fit-view")), 50);
    }
    set({
      isPropertiesOpen: open,
      ...(open ? { isPaletteOpen: false } : {}),
    });
  },

  toggleOutput: () =>
    set((state) => {
      const next = !state.isOutputOpen;
      if (typeof window !== "undefined") {
        setTimeout(() => window.dispatchEvent(new CustomEvent("codebrix:fit-view")), 50);
      }
      return { isOutputOpen: next };
    }),

  setOutputOpen: (open: boolean) => {
    if (typeof window !== "undefined") {
      setTimeout(() => window.dispatchEvent(new CustomEvent("codebrix:fit-view")), 50);
    }
    set({ isOutputOpen: open });
  },

  setPaletteWidth: (width: number) => {
    set({
      paletteWidth: Math.max(240, Math.min(560, Math.round(width))),
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("codebrix:fit-view"));
    }
  },

  setPropertiesWidth: (width: number) => {
    set({
      propertiesWidth: Math.max(220, Math.min(520, Math.round(width))),
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("codebrix:fit-view"));
    }
  },

  setOutputPanelHeight: (height: number) => {
    const clamped = Math.max(
      160,
      Math.min(
        typeof window !== "undefined" ? Math.round(window.innerHeight * 0.75) : 600,
        Math.round(height)
      )
    );
    try {
      localStorage.setItem("codebrix:terminal-height", String(clamped));
    } catch {
      // ignore
    }
    set({ outputPanelHeight: clamped });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("codebrix:fit-view"));
    }
  },

  setZoomLevel: (zoom: number) => set({ zoomLevel: zoom }),

  openCustomBlockModal: (blockId = null) =>
    set({ isCustomBlockModalOpen: true, editCustomBlockId: blockId }),

  closeCustomBlockModal: () =>
    set({ isCustomBlockModalOpen: false, editCustomBlockId: null }),

  resetUi: () =>
    set({
      selectedBlockId: null,
      focusedBlockId: null,
      focusTarget: null,
      activeOutputTab: "console",
      isPaletteOpen: true,
      activePaletteSection: "library",
      isPropertiesOpen: true,
      isOutputOpen: true,
      paletteWidth: 320,
      propertiesWidth: 300,
      outputPanelHeight: getInitialTerminalHeight(),
      zoomLevel: 1,
      isCustomBlockModalOpen: false,
      editCustomBlockId: null,
    }),
}));

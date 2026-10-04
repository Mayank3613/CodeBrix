import { create } from "zustand";
import type { BlockDefinition, BlockCategory } from "@codebrix/types";

export interface LibraryState {
  installedLibraries: string[];
  registeredBlocks: BlockDefinition[];
  filterQuery: string;
  selectedCategory: BlockCategory | "all";

  setInstalledLibraries: (libraries: string[]) => void;
  addInstalledLibrary: (libraryName: string) => void;
  setRegisteredBlocks: (blocks: BlockDefinition[]) => void;
  addRegisteredBlock: (block: BlockDefinition) => void;
  setFilterQuery: (query: string) => void;
  setSelectedCategory: (category: BlockCategory | "all") => void;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  installedLibraries: ["core", "data", "scikit-learn", "visualization"],
  registeredBlocks: [],
  filterQuery: "",
  selectedCategory: "all",

  setInstalledLibraries: (libraries: string[]) => set({ installedLibraries: libraries }),

  addInstalledLibrary: (libraryName: string) =>
    set((state) => ({
      installedLibraries: state.installedLibraries.includes(libraryName)
        ? state.installedLibraries
        : [...state.installedLibraries, libraryName],
    })),

  setRegisteredBlocks: (blocks: BlockDefinition[]) => set({ registeredBlocks: blocks }),

  addRegisteredBlock: (block: BlockDefinition) =>
    set((state) => ({
      registeredBlocks: state.registeredBlocks.some((b) => b.id === block.id)
        ? state.registeredBlocks
        : [...state.registeredBlocks, block],
    })),

  setFilterQuery: (query: string) => set({ filterQuery: query }),

  setSelectedCategory: (category: BlockCategory | "all") =>
    set({ selectedCategory: category }),
}));

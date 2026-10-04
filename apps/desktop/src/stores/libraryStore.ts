import { create } from "zustand";
import type { LibraryManifest } from "@codebrix/types";

export interface LoadedLibrary {
  manifest: LibraryManifest;
  path: string;
  manifestPath: string;
  isBuiltIn: boolean;
  enabled: boolean;
  isValid: boolean;
  error?: string;
  blockIds: string[];
}

export interface LibraryState {
  libraries: LoadedLibrary[];
  warnings: string[];
  isLoading: boolean;
  selectedCategory: string;
  searchQuery: string;
  setLibraries: (libraries: LoadedLibrary[]) => void;
  addLibrary: (library: LoadedLibrary) => void;
  setLibraryEnabled: (name: string, enabled: boolean) => void;
  addWarning: (warning: string) => void;
  dismissWarning: (index: number) => void;
  clearWarnings: () => void;
  setSelectedCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  libraries: [],
  warnings: [],
  isLoading: false,
  selectedCategory: "all",
  searchQuery: "",

  setLibraries: (libraries) => set({ libraries }),

  addLibrary: (library) =>
    set((state) => {
      const existingIdx = state.libraries.findIndex(
        (l) => l.manifest.name === library.manifest.name
      );
      if (existingIdx >= 0) {
        const next = [...state.libraries];
        next[existingIdx] = library;
        return { libraries: next };
      }
      return { libraries: [...state.libraries, library] };
    }),

  setLibraryEnabled: (name, enabled) =>
    set((state) => ({
      libraries: state.libraries.map((lib) =>
        lib.manifest.name === name ? { ...lib, enabled } : lib
      ),
    })),

  addWarning: (warning) =>
    set((state) => ({ warnings: [...state.warnings, warning] })),

  dismissWarning: (index) =>
    set((state) => ({
      warnings: state.warnings.filter((_, i) => i !== index),
    })),

  clearWarnings: () => set({ warnings: [] }),

  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setLoading: (isLoading) => set({ isLoading }),
}));

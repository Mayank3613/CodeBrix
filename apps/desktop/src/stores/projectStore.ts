import { create } from "zustand";
import {
  loadPersistedRecentProjects,
  persistRecentProjects,
} from "../project/storage";
import {
  getRecoverySnapshot,
  clearRecoverySnapshot,
  type AutosaveSnapshot,
} from "../project/autosave";
import { normalizePath } from "../project/crossPlatformPaths";

export interface ProjectState {
  currentFilePath: string | null;
  projectName: string;
  isDirty: boolean;
  recentProjects: string[];
  lastAutosavedAt: string | null;
  libraries: string[];
  recoverySnapshot: AutosaveSnapshot | null;

  setProjectName: (name: string) => void;
  setCurrentFilePath: (path: string | null) => void;
  markDirty: (dirty: boolean) => void;
  addRecentProject: (path: string) => void;
  removeRecentProject: (path: string) => void;
  clearRecentProjects: () => void;
  recordAutosave: () => void;
  setLibraries: (libraries: string[]) => void;
  addLibraryDependency: (name: string) => void;
  checkRecovery: () => void;
  dismissRecovery: () => void;
  resetProject: () => void;
}

const initialRecent = loadPersistedRecentProjects();

export const useProjectStore = create<ProjectState>((set) => ({
  currentFilePath: null,
  projectName: "Iris Classification Acceptance Pipeline",
  isDirty: false,
  recentProjects: initialRecent,
  lastAutosavedAt: null,
  libraries: ["core", "data", "scikit-learn", "visualization"],
  recoverySnapshot: null,

  setProjectName: (name: string) => set({ projectName: name, isDirty: true }),

  setCurrentFilePath: (path: string | null) =>
    set((state) => {
      // Phase 6 (D1-6.2): Normalize path for cross-platform portability
      const normalizedPath = path ? normalizePath(path) : null;
      let nextRecent = state.recentProjects;
      if (normalizedPath) {
        nextRecent = [normalizedPath, ...state.recentProjects.filter((p) => p !== normalizedPath)].slice(0, 10);
        persistRecentProjects(nextRecent);
      }
      return {
        currentFilePath: normalizedPath,
        isDirty: false,
        recentProjects: nextRecent,
      };
    }),

  markDirty: (dirty: boolean) => set({ isDirty: dirty }),

  addRecentProject: (path: string) =>
    set((state) => {
      // Phase 6 (D1-6.2): Normalize for cross-platform recent-project entries
      const normalizedPath = normalizePath(path);
      const nextRecent = [normalizedPath, ...state.recentProjects.filter((p) => p !== normalizedPath)].slice(0, 10);
      persistRecentProjects(nextRecent);
      return { recentProjects: nextRecent };
    }),

  removeRecentProject: (path: string) =>
    set((state) => {
      const normalizedPath = normalizePath(path);
      const nextRecent = state.recentProjects.filter((p) => p !== normalizedPath);
      persistRecentProjects(nextRecent);
      return { recentProjects: nextRecent };
    }),

  clearRecentProjects: () => {
    persistRecentProjects([]);
    set({ recentProjects: [] });
  },

  recordAutosave: () =>
    set({
      lastAutosavedAt: new Date().toISOString(),
    }),

  setLibraries: (libraries: string[]) => set({ libraries }),

  addLibraryDependency: (name: string) =>
    set((state) => ({
      libraries: state.libraries.includes(name)
        ? state.libraries
        : [...state.libraries, name],
      isDirty: true,
    })),

  checkRecovery: () => {
    const snap = getRecoverySnapshot();
    if (snap) {
      set({ recoverySnapshot: snap });
    }
  },

  dismissRecovery: () => {
    clearRecoverySnapshot();
    set({ recoverySnapshot: null });
  },

  resetProject: () =>
    set({
      currentFilePath: null,
      projectName: "Untitled Project",
      isDirty: false,
      lastAutosavedAt: null,
      libraries: ["core", "data", "scikit-learn", "visualization"],
    }),
}));

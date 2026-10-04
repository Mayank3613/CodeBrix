import { create } from "zustand";

export interface ProjectState {
  currentFilePath: string | null;
  projectName: string;
  isDirty: boolean;
  recentProjects: string[];
  lastAutosavedAt: string | null;

  setProjectName: (name: string) => void;
  setCurrentFilePath: (path: string | null) => void;
  markDirty: (dirty: boolean) => void;
  addRecentProject: (path: string) => void;
  recordAutosave: () => void;
  resetProject: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentFilePath: null,
  projectName: "Iris Classification Acceptance Pipeline",
  isDirty: false,
  recentProjects: [],
  lastAutosavedAt: null,

  setProjectName: (name: string) => set({ projectName: name, isDirty: true }),

  setCurrentFilePath: (path: string | null) =>
    set((state) => ({
      currentFilePath: path,
      isDirty: false,
      recentProjects: path && !state.recentProjects.includes(path)
        ? [path, ...state.recentProjects.slice(0, 4)]
        : state.recentProjects,
    })),

  markDirty: (dirty: boolean) => set({ isDirty: dirty }),

  addRecentProject: (path: string) =>
    set((state) => ({
      recentProjects: [path, ...state.recentProjects.filter((p) => p !== path)].slice(0, 5),
    })),

  recordAutosave: () =>
    set({
      lastAutosavedAt: new Date().toISOString(),
      isDirty: false,
    }),

  resetProject: () =>
    set({
      currentFilePath: null,
      projectName: "Untitled Project",
      isDirty: false,
      lastAutosavedAt: null,
    }),
}));

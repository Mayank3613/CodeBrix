import { serializeCbxProject, parseCbxProject } from "./projectManager";
import { useWorkflowStore } from "../stores/workflowStore";
import { useProjectStore } from "../stores/projectStore";
import type { CbxProjectFile, WorkflowGraph } from "@codebrix/types";
import {
  STORAGE_KEYS,
  getStorageItem,
  setStorageItem,
  removeStorageItem,
} from "./storage";

export { clearAllStorage } from "./storage";

export interface AutosaveSnapshot {
  savedAt: string;
  projectName: string;
  currentFilePath: string | null;
  rawJson: string;
}

/**
 * Saves current workflow state to recovery snapshot.
 */
export function performAutosave(): void {
  const { graph } = useWorkflowStore.getState();
  const { projectName, currentFilePath, recordAutosave } = useProjectStore.getState();

  const graphWithName: WorkflowGraph = {
    ...graph,
    name: projectName,
  };

  const serialized = serializeCbxProject(graphWithName);

  const snapshot: AutosaveSnapshot = {
    savedAt: new Date().toISOString(),
    projectName,
    currentFilePath,
    rawJson: serialized,
  };

  setStorageItem(STORAGE_KEYS.AUTOSAVE, JSON.stringify(snapshot));
  recordAutosave();
}

/**
 * Checks if a recovery snapshot exists from an unsaved/crashed session.
 */
export function getRecoverySnapshot(): AutosaveSnapshot | null {
  const raw = getStorageItem(STORAGE_KEYS.AUTOSAVE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AutosaveSnapshot;
    if (parsed && parsed.rawJson && parsed.savedAt) {
      return parsed;
    }
  } catch {
    // Corrupt snapshot
  }
  return null;
}

/**
 * Restores workflow from the autosaved recovery snapshot.
 */
export function restoreFromRecoverySnapshot(snapshot: AutosaveSnapshot): CbxProjectFile {
  const result = parseCbxProject(snapshot.rawJson);
  if (!result.success || !result.project) {
    throw new Error(`Failed to parse recovery snapshot: ${result.error || "Corrupted project"}`);
  }
  const project = result.project;
  useWorkflowStore.getState().setGraph(project.graph);

  const projectStore = useProjectStore.getState();
  projectStore.setProjectName(project.graph.name || snapshot.projectName);
  projectStore.setCurrentFilePath(snapshot.currentFilePath);
  projectStore.markDirty(true); // Recovered projects start dirty so user is reminded to save

  return project;
}

/**
 * Discard and clean up recovery snapshot.
 */
export function clearRecoverySnapshot(): void {
  removeStorageItem(STORAGE_KEYS.AUTOSAVE);
}

export {
  loadPersistedRecentProjects,
  persistRecentProjects,
} from "./storage";

import { describe, it, expect, beforeEach } from "vitest";
import {
  performAutosave,
  getRecoverySnapshot,
  restoreFromRecoverySnapshot,
  clearRecoverySnapshot,
  loadPersistedRecentProjects,
  persistRecentProjects,
  clearAllStorage,
} from "./autosave";
import { useWorkflowStore } from "../stores/workflowStore";
import { useProjectStore } from "../stores/projectStore";

describe("Autosave and Recovery (D1-3.4)", () => {
  beforeEach(() => {
    clearAllStorage();
    useWorkflowStore.getState().clearWorkflow();
    useProjectStore.getState().resetProject();
  });

  it("saves a valid snapshot into localStorage", () => {
    useProjectStore.getState().setProjectName("Test Autosave Project");
    performAutosave();

    const snapshot = getRecoverySnapshot();
    expect(snapshot).not.toBeNull();
    expect(snapshot?.projectName).toBe("Test Autosave Project");
    expect(snapshot?.rawJson).toContain("Test Autosave Project");
    expect(snapshot?.savedAt).toBeDefined();
  });

  it("restores workflow graph and flags project as dirty from snapshot", () => {
    useProjectStore.getState().setProjectName("Recovered ML Model");
    performAutosave();

    const snapshot = getRecoverySnapshot()!;
    // Clear state
    useWorkflowStore.getState().clearWorkflow();
    useProjectStore.getState().resetProject();

    const restored = restoreFromRecoverySnapshot(snapshot);
    expect(restored.graph.name).toBe("Recovered ML Model");
    expect(useProjectStore.getState().projectName).toBe("Recovered ML Model");
    expect(useProjectStore.getState().isDirty).toBe(true);
  });

  it("clears recovery snapshot on demand", () => {
    performAutosave();
    expect(getRecoverySnapshot()).not.toBeNull();

    clearRecoverySnapshot();
    expect(getRecoverySnapshot()).toBeNull();
  });

  it("persists and retrieves recent project list", () => {
    const list = ["/path/one.cbx", "/path/two.cbx"];
    persistRecentProjects(list);

    const loaded = loadPersistedRecentProjects();
    expect(loaded).toEqual(list);
  });
});

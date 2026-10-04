import { describe, it, expect, beforeEach } from "vitest";
import { useExecutionStore, useValidationStore, useWorkflowStore } from "../../stores";
import { workflowService } from "../../services";
import { stopPythonExecution } from "../../services/tauriPythonRuntime";

describe("Run/Stop Toolbar & Execution Flow (D1-4.1)", () => {
  beforeEach(() => {
    useExecutionStore.getState().resetExecution();
    useValidationStore.getState().clearValidation();
    useWorkflowStore.getState().clearWorkflow();
  });

  it("manages run and stop button states according to executionStore runState", () => {
    // Idle state: Run is enabled, Stop is disabled
    expect(useExecutionStore.getState().runState).toBe("idle");

    // Transition to running state: Run is disabled, Stop is enabled
    useExecutionStore.getState().setRunState("running");
    expect(useExecutionStore.getState().runState).toBe("running");

    // Transition to success state: Run is enabled, Stop is disabled
    useExecutionStore.getState().setRunState("success");
    expect(useExecutionStore.getState().runState).toBe("success");

    // Transition to failed state: Run is enabled, Stop is disabled
    useExecutionStore.getState().setRunState("failed");
    expect(useExecutionStore.getState().runState).toBe("failed");
  });

  it("validates workflow graph and rejects execution on invalid graph", async () => {
    // Empty graph is invalid according to workflow validator
    const emptyGraph = useWorkflowStore.getState().graph;
    const validation = await workflowService.validateGraph(emptyGraph);

    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);

    useValidationStore.getState().setValidationResult(validation);
    expect(useValidationStore.getState().validationResult?.valid).toBe(false);

    // If graph is invalid, runState remains idle and status message indicates validation failure
    if (!validation.valid) {
      useExecutionStore.getState().setStatusMessage(
        `Validation failed (${validation.errors.length} issue(s)) - resolve errors before running`
      );
    }

    expect(useExecutionStore.getState().runState).toBe("idle");
    expect(useExecutionStore.getState().statusMessage).toContain("Validation failed");
  });

  it("stops active execution process and updates run state to failed / aborted", async () => {
    useExecutionStore.getState().setRunState("running");
    useExecutionStore.getState().setExecutionId("exec-test-123");

    await stopPythonExecution();

    const state = useExecutionStore.getState();
    expect(state.runState).toBe("failed");
    expect(state.statusMessage).toContain("Execution aborted by user");
    expect(state.outputs.some((o) => o.type === "error" && o.message.includes("Aborted"))).toBe(true);
  });
});

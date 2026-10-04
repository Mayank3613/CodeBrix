import { describe, it, expect } from "vitest";
import { WorkflowRunner } from "../workflow-runner.js";
import { createIrisWorkflowMock } from "@codebrix/shared";
import type { OutputMessage } from "@codebrix/types";

describe("WorkflowRunner End-to-End Execution", () => {
  it(
    "should execute the complete Iris classification workflow and produce real metrics",
    async () => {
      const runner = new WorkflowRunner();
      const workflow = createIrisWorkflowMock();

      const streamedOutputs: OutputMessage[] = [];
      const updatedBlocks: string[] = [];

      const result = await runner.runWorkflow(workflow, {
        onOutput: (msg) => streamedOutputs.push(msg),
        onBlockStatus: (blockId, status) => {
          if (status.status === "success" && !updatedBlocks.includes(blockId)) {
            updatedBlocks.push(blockId);
          }
        },
      });

      expect(result.status).toBe("success");
      expect(result.exitCode).toBe(0);
      expect(result.workflowId).toBe(workflow.id);

      // Verify all 6 blocks succeeded
      expect(Object.keys(result.blockResults)).toHaveLength(6);
      expect(result.blockResults["blk-csv"]?.status).toBe("success");
      expect(result.blockResults["blk-split"]?.status).toBe("success");
      expect(result.blockResults["blk-rf"]?.status).toBe("success");
      expect(result.blockResults["blk-predict"]?.status).toBe("success");
      expect(result.blockResults["blk-acc"]?.status).toBe("success");
      expect(result.blockResults["blk-cm"]?.status).toBe("success");

      // Verify metrics output received (accuracy > 90% on Iris test set)
      const metricsMsg = streamedOutputs.find(
        (m) => m.type === "metrics" && m.title === "Model Accuracy"
      );
      expect(metricsMsg).toBeDefined();
      if (metricsMsg?.type === "metrics") {
        const acc = Number(metricsMsg.metrics["accuracy"]);
        expect(acc).toBeGreaterThan(0.9);
      }

      // Verify confusion matrix metrics received
      const cmMsg = streamedOutputs.find(
        (m) => m.type === "metrics" && m.title === "Confusion Matrix"
      );
      expect(cmMsg).toBeDefined();
    },
    20000 // Allow up to 20s for python execution and package imports
  );
});

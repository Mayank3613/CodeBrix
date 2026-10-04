import { describe, it, expect, beforeEach } from "vitest";
import { outputRendererRegistry, registerRenderer } from "./registry";
import "./renderers"; // Load default renderers
import { createMockExecutionResult } from "@codebrix/shared";
import { useExecutionStore } from "../../stores";
import type {
  MetricsOutputMessage,
  TableOutputMessage,
  ImageOutputMessage,
  ConsoleOutputMessage,
} from "@codebrix/types";

describe("Output Panel Container & Renderer Registry (D1-4.4)", () => {
  beforeEach(() => {
    useExecutionStore.getState().resetExecution();
  });

  it("registers and retrieves output renderers through seam contract", () => {
    expect(outputRendererRegistry.hasRenderer("console")).toBe(true);
    expect(outputRendererRegistry.hasRenderer("table")).toBe(true);
    expect(outputRendererRegistry.hasRenderer("metrics")).toBe(true);
    expect(outputRendererRegistry.hasRenderer("image")).toBe(true);
    expect(outputRendererRegistry.hasRenderer("plotly")).toBe(true);

    const types = outputRendererRegistry.getRegisteredTypes();
    expect(types).toContain("console");
    expect(types).toContain("table");
    expect(types).toContain("metrics");
    expect(types).toContain("image");
    expect(types).toContain("plotly");
  });

  it("allows custom renderer registration via registerRenderer()", () => {
    const CustomRenderer = () => null;
    registerRenderer("custom_test_channel", CustomRenderer);

    expect(outputRendererRegistry.hasRenderer("custom_test_channel")).toBe(true);
    expect(outputRendererRegistry.getRenderer("custom_test_channel")).toBe(CustomRenderer);
  });

  it("handles the complete Iris mock execution result across all 5 output sections", () => {
    const mockResult = createMockExecutionResult({
      outputs: [
        {
          type: "console",
          stream: "stdout",
          text: "Loaded dataset successfully with shape (150, 5)",
          timestamp: "2026-10-04T12:00:00.000Z",
        } as ConsoleOutputMessage,
        {
          type: "metrics",
          title: "Model Accuracy",
          metrics: {
            accuracy: 0.967,
            total_samples: 150,
          },
          timestamp: "2026-10-04T12:00:01.000Z",
        } as MetricsOutputMessage,
        {
          type: "table",
          title: "Iris Dataset Preview",
          columns: ["sepal_length", "sepal_width", "petal_length", "petal_width", "species"],
          rows: [
            [5.1, 3.5, 1.4, 0.2, "setosa"],
            [4.9, 3.0, 1.4, 0.2, "setosa"],
          ],
          totalRows: 150,
          totalColumns: 5,
          timestamp: "2026-10-04T12:00:02.000Z",
        } as TableOutputMessage,
        {
          type: "image",
          title: "Confusion Matrix",
          format: "confusion_matrix",
          data: "mock_plot_data",
          timestamp: "2026-10-04T12:00:03.000Z",
        } as ImageOutputMessage,
      ],
    });

    useExecutionStore.getState().setLatestResult(mockResult);

    const storeState = useExecutionStore.getState();
    expect(storeState.latestResult?.status).toBe("success");
    expect(storeState.latestResult?.outputs.length).toBe(4);

    // Verify all message channels exist and can be served by registered renderers
    for (const output of storeState.latestResult!.outputs) {
      const channel = output.type === "image" && output.format === "confusion_matrix" ? "plotly" : output.type;
      expect(outputRendererRegistry.hasRenderer(channel)).toBe(true);
    }
  });

  it("synchronizes outputs and clears them cleanly", () => {
    useExecutionStore.getState().addOutput({
      type: "console",
      stream: "stdout",
      text: "Test log line",
      timestamp: new Date().toISOString(),
    });

    expect(useExecutionStore.getState().outputs.length).toBe(1);

    useExecutionStore.getState().clearOutputs();
    expect(useExecutionStore.getState().outputs.length).toBe(0);
  });
});

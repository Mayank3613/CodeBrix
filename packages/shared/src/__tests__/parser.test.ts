import { describe, it, expect } from "vitest";
import { parsePythonOutputJsonLine } from "../parser.js";

describe("Python Output JSON Protocol Parser", () => {
  it("should return null on empty string or whitespace", () => {
    expect(parsePythonOutputJsonLine("")).toBeNull();
    expect(parsePythonOutputJsonLine("   ")).toBeNull();
  });

  it("should parse structured metrics JSON line", () => {
    const raw = JSON.stringify({
      type: "metrics",
      metrics: { accuracy: 0.9667, f1: 0.95 },
      title: "Model Evaluation",
    });

    const parsed = parsePythonOutputJsonLine(raw, "blk-acc");
    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe("metrics");
    if (parsed?.type === "metrics") {
      expect(parsed.metrics["accuracy"]).toBe(0.9667);
      expect(parsed.blockId).toBe("blk-acc");
    }
  });

  it("should parse structured table preview JSON line", () => {
    const raw = JSON.stringify({
      type: "table",
      columns: ["sepal_length", "species"],
      rows: [[5.1, "setosa"], [7.0, "versicolor"]],
    });

    const parsed = parsePythonOutputJsonLine(raw);
    expect(parsed?.type).toBe("table");
    if (parsed?.type === "table") {
      expect(parsed.columns).toHaveLength(2);
      expect(parsed.rows).toHaveLength(2);
    }
  });

  it("should parse enveloped event format", () => {
    const raw = JSON.stringify({
      event: "output",
      payload: {
        type: "console",
        stream: "stderr",
        text: "ConvergenceWarning: lbfgs failed",
      },
    });

    const parsed = parsePythonOutputJsonLine(raw);
    expect(parsed?.type).toBe("console");
    if (parsed?.type === "console") {
      expect(parsed.stream).toBe("stderr");
      expect(parsed.text).toBe("ConvergenceWarning: lbfgs failed");
    }
  });

  it("should fallback to console stdout for unstructured log lines", () => {
    const raw = "Loaded 150 rows from iris.csv";
    const parsed = parsePythonOutputJsonLine(raw, "blk-csv");
    expect(parsed?.type).toBe("console");
    if (parsed?.type === "console") {
      expect(parsed.text).toBe(raw);
      expect(parsed.stream).toBe("stdout");
      expect(parsed.blockId).toBe("blk-csv");
    }
  });

  it("should return null for non-output control events (status, done)", () => {
    const statusEvent = JSON.stringify({
      event: "status",
      payload: "running",
      timestamp: new Date().toISOString(),
    });
    const doneEvent = JSON.stringify({
      event: "done",
      payload: { exitCode: 0 },
      timestamp: new Date().toISOString(),
    });

    expect(parsePythonOutputJsonLine(statusEvent)).toBeNull();
    expect(parsePythonOutputJsonLine(doneEvent)).toBeNull();
  });
});


import { describe, it, expect } from "vitest";
import { ProtocolParser } from "../protocol.js";

describe("ProtocolParser", () => {
  const parser = new ProtocolParser();

  it("should parse block_start control event", () => {
    const line = JSON.stringify({
      event: "block_start",
      payload: { blockId: "blk-1" },
      timestamp: "2026-10-04T12:00:00Z",
    });

    const parsed = parser.parseLine(line);
    expect(parsed.isControl).toBe(true);
    expect(parsed.controlEvent?.event).toBe("block_start");
    expect((parsed.controlEvent?.payload as { blockId: string }).blockId).toBe("blk-1");
  });

  it("should parse block_done control event", () => {
    const line = JSON.stringify({
      event: "block_done",
      payload: { blockId: "blk-1", status: "success" },
    });

    const parsed = parser.parseLine(line);
    expect(parsed.isControl).toBe(true);
    expect(parsed.controlEvent?.event).toBe("block_done");
  });

  it("should parse block_error control event", () => {
    const line = JSON.stringify({
      event: "block_error",
      payload: { blockId: "blk-1", error: "Value error", traceback: "..." },
    });

    const parsed = parser.parseLine(line);
    expect(parsed.isControl).toBe(true);
    expect(parsed.controlEvent?.event).toBe("block_error");
  });

  it("should parse metrics OutputMessage", () => {
    const line = JSON.stringify({
      type: "metrics",
      title: "Model Accuracy",
      metrics: { accuracy: 0.967 },
    });

    const parsed = parser.parseLine(line);
    expect(parsed.isControl).toBe(false);
    expect(parsed.outputMessage?.type).toBe("metrics");
    if (parsed.outputMessage?.type === "metrics") {
      expect(parsed.outputMessage.metrics["accuracy"]).toBe(0.967);
    }
  });

  it("should wrap plain non-JSON print statements as console output", () => {
    const line = "Loading dataset from disk...";
    const parsed = parser.parseLine(line, "blk-csv");

    expect(parsed.isControl).toBe(false);
    expect(parsed.outputMessage?.type).toBe("console");
    if (parsed.outputMessage?.type === "console") {
      expect(parsed.outputMessage.text).toBe("Loading dataset from disk...");
      expect(parsed.outputMessage.blockId).toBe("blk-csv");
    }
  });

  it("should ignore empty or whitespace lines", () => {
    const parsed = parser.parseLine("   \n");
    expect(parsed.isControl).toBe(false);
    expect(parsed.outputMessage).toBeUndefined();
  });
});

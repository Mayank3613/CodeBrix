import type { OutputMessage } from "@codebrix/types";

/**
 * Parses a single stdout/stderr line from the Python subprocess runner.
 * Lines matching the JSON protocol `{ "type": "...", ... }` are parsed into OutputMessage.
 * Raw non-JSON lines are wrapped in a fallback ConsoleOutputMessage.
 */
export function parsePythonOutputJsonLine(
  line: string,
  defaultBlockId?: string
): OutputMessage | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  // Attempt JSON parse
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;

      // Check if it's an enveloped event {"event": "output", "payload": ...}
      if (parsed["event"] === "output" && typeof parsed["payload"] === "object" && parsed["payload"] !== null) {
        const payload = parsed["payload"] as OutputMessage;
        if (!payload.blockId && defaultBlockId) {
          payload.blockId = defaultBlockId;
        }
        return payload;
      }

      // Ignore lifecycle/control events (e.g. status, done, progress)
      if (typeof parsed["event"] === "string" && parsed["event"] !== "output") {
        return null;
      }

      // Check if it directly matches OutputMessage structure
      const type = parsed["type"];
      if (
        type === "console" ||
        type === "table" ||
        type === "metrics" ||
        type === "image" ||
        type === "error"
      ) {
        const msg = parsed as unknown as OutputMessage;
        if (!msg.timestamp) {
          msg.timestamp = new Date().toISOString();
        }
        if (!msg.blockId && defaultBlockId) {
          msg.blockId = defaultBlockId;
        }
        return msg;
      }
    } catch {
      // Fall through to raw console output
    }
  }

  // Fallback: standard stdout line
  return {
    type: "console",
    stream: "stdout",
    text: trimmed,
    blockId: defaultBlockId,
    timestamp: new Date().toISOString(),
  };
}

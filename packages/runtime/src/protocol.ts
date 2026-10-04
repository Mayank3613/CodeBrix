import type { OutputMessage } from "@codebrix/types";
import { parsePythonOutputJsonLine } from "@codebrix/shared";
import type { ControlEventType, ParsedProtocolLine } from "./types.js";

const CONTROL_EVENT_NAMES = new Set<ControlEventType>([
  "status",
  "block_start",
  "block_done",
  "block_error",
  "done",
  "error",
]);

/**
 * Protocol parser that classifies and extracts both lifecycle control events
 * (e.g. block transitions, overall status) and output data messages (console, metrics, etc.).
 */
export class ProtocolParser {
  /**
   * Parse a single line from the Python process.
   */
  parseLine(line: string, defaultBlockId?: string): ParsedProtocolLine {
    const trimmed = line.trim();
    if (!trimmed) {
      return { isControl: false };
    }

    // Check for JSON-formatted line
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const obj = JSON.parse(trimmed) as Record<string, unknown>;

        // 1. Is it a control event?
        const eventName = obj["event"] as ControlEventType | undefined;
        if (eventName && CONTROL_EVENT_NAMES.has(eventName)) {
          return {
            isControl: true,
            controlEvent: {
              event: eventName,
              payload: obj["payload"],
              timestamp: (obj["timestamp"] as string) ?? new Date().toISOString(),
            },
          };
        }

        // 2. Is it an OutputMessage?
        const parsedOutput = parsePythonOutputJsonLine(trimmed, defaultBlockId);
        if (parsedOutput) {
          return {
            isControl: false,
            outputMessage: parsedOutput,
          };
        }
      } catch {
        // Fall back to plain console text
      }
    }

    // Fallback: standard stdout/stderr line
    const fallbackMessage: OutputMessage = {
      type: "console",
      stream: "stdout",
      text: trimmed,
      blockId: defaultBlockId,
      timestamp: new Date().toISOString(),
    };

    return {
      isControl: false,
      outputMessage: fallbackMessage,
    };
  }
}

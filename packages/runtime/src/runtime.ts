import { nanoid } from "nanoid";
import type {
  ExecutionResult,
  BlockExecutionStatus,
  OutputMessage,
  ExecutionStatus,
} from "@codebrix/types";
import type {
  IPythonRuntime,
  PythonEnvironment,
  ExecuteOptions,
} from "./types.js";
import { PythonDetector } from "./python-detector.js";
import { ProtocolParser } from "./protocol.js";
import { SubprocessSession } from "./process-manager.js";

/**
 * Production Node.js subprocess-based Python runtime.
 * Executes scripts locally using the detected Python environment,
 * captures streaming events, and manages the execution lifecycle.
 */
export class SubprocessPythonRuntime implements IPythonRuntime {
  private readonly detector: PythonDetector;
  private readonly parser: ProtocolParser;
  private readonly activeSessions = new Map<string, SubprocessSession>();

  constructor(searchDir?: string) {
    this.detector = new PythonDetector(searchDir);
    this.parser = new ProtocolParser();
  }

  /**
   * Discovers and validates the active Python environment.
   */
  async discover(): Promise<PythonEnvironment> {
    return this.detector.detect();
  }

  /**
   * Executes a Python script, tracks block lifecycle transitions,
   * streams output messages, and returns the final ExecutionResult.
   */
  async execute(options: ExecuteOptions): Promise<ExecutionResult> {
    const executionId = `exec_${nanoid(8)}`;
    const workflowId = options.workflowId ?? "workflow-1";
    const startedAt = new Date().toISOString();

    const env = await this.discover();
    const session = new SubprocessSession(
      env.executable,
      options.script,
      options.cwd ?? env.cwd,
      options.timeoutMs ?? 60000,
      options.env
    );

    this.activeSessions.set(executionId, session);

    const blockResults: Record<string, BlockExecutionStatus> = {};
    const outputs: OutputMessage[] = [];
    let currentBlockId: string | undefined;
    let executionError: ExecutionResult["error"] | undefined;

    options.onStatus?.("running");

    try {
      const outcome = await session.start((line, stream) => {
        const parsed = this.parser.parseLine(line, currentBlockId);

        if (parsed.isControl && parsed.controlEvent) {
          const ctrl = parsed.controlEvent;
          const payload = ctrl.payload as Record<string, unknown> | undefined;

          switch (ctrl.event) {
            case "block_start": {
              const bId = (payload?.["blockId"] as string) ?? currentBlockId;
              if (bId) {
                currentBlockId = bId;
                const statusObj: BlockExecutionStatus = {
                  blockId: bId,
                  status: "running",
                  startedAt: ctrl.timestamp ?? new Date().toISOString(),
                };
                blockResults[bId] = statusObj;
                options.onBlockStatus?.(bId, statusObj);
              }
              break;
            }

            case "block_done": {
              const bId = (payload?.["blockId"] as string) ?? currentBlockId;
              if (bId && blockResults[bId]) {
                const now = ctrl.timestamp ?? new Date().toISOString();
                const start = blockResults[bId]?.startedAt;
                const dur = start ? new Date(now).getTime() - new Date(start).getTime() : undefined;
                const statusObj: BlockExecutionStatus = {
                  ...blockResults[bId]!,
                  status: "success",
                  completedAt: now,
                  durationMs: dur,
                };
                blockResults[bId] = statusObj;
                options.onBlockStatus?.(bId, statusObj);
              }
              break;
            }

            case "block_error": {
              const bId = (payload?.["blockId"] as string) ?? currentBlockId;
              const errText = (payload?.["error"] as string) ?? "Block execution failed";
              const trace = payload?.["traceback"] as string | undefined;

              if (bId && blockResults[bId]) {
                const now = ctrl.timestamp ?? new Date().toISOString();
                const statusObj: BlockExecutionStatus = {
                  ...blockResults[bId]!,
                  status: "failed",
                  completedAt: now,
                  error: errText,
                };
                blockResults[bId] = statusObj;
                options.onBlockStatus?.(bId, statusObj);
              }

              executionError = {
                blockId: bId,
                message: errText,
                traceback: trace,
              };
              break;
            }

            case "error": {
              const msg = (payload?.["message"] as string) ?? "Execution error";
              const trace = payload?.["traceback"] as string | undefined;
              executionError = {
                message: msg,
                traceback: trace,
              };
              break;
            }

            case "status": {
              const st = (ctrl.payload as ExecutionStatus) ?? "running";
              options.onStatus?.(st);
              break;
            }

            case "done": {
              // Terminal done event
              break;
            }
          }
        } else if (parsed.outputMessage) {
          const out = parsed.outputMessage;
          if (stream === "stderr" && out.type === "console") {
            out.stream = "stderr";
          }
          outputs.push(out);
          options.onOutput?.(out);
        }
      });

      const endedAt = new Date().toISOString();
      const durationMs = new Date(endedAt).getTime() - new Date(startedAt).getTime();
      const isSuccess = outcome.exitCode === 0 && !outcome.wasAborted && !executionError;
      const status: ExecutionStatus = outcome.wasAborted
        ? "aborted"
        : isSuccess
          ? "success"
          : "failed";

      options.onStatus?.(status);

      return {
        executionId,
        workflowId,
        status,
        startedAt,
        completedAt: endedAt,
        durationMs,
        exitCode: outcome.exitCode,
        blockResults,
        outputs,
        error: isSuccess ? undefined : (executionError ?? { message: `Process exited with code ${outcome.exitCode}` }),
      };
    } finally {
      this.activeSessions.delete(executionId);
    }
  }

  /**
   * Stop an active execution process by session ID.
   */
  async stop(executionId: string): Promise<void> {
    const session = this.activeSessions.get(executionId);
    if (session) {
      session.kill();
      this.activeSessions.delete(executionId);
    }
  }
}

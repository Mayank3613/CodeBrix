import type { ConsoleOutputMessage, ErrorOutputMessage, OutputMessage } from "@codebrix/types";
import type { RendererProps } from "../registry";

export default function ConsoleRenderer({
  messages,
  runState,
  onClear,
}: RendererProps<OutputMessage>) {
  const consoleLogs = messages.filter(
    (m): m is ConsoleOutputMessage | ErrorOutputMessage =>
      m.type === "console" || m.type === "error"
  );

  return (
    <div className="space-y-2 bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-slate-300 font-mono text-xs">
      <div className="flex items-center justify-between pb-1 border-b border-slate-800/60 text-[10px] text-slate-500 font-sans">
        <span>Standard Output & Error Stream ({consoleLogs.length} entries)</span>
        {consoleLogs.length > 0 && onClear && (
          <button
            onClick={onClear}
            className="text-slate-400 hover:text-white hover:underline cursor-pointer"
          >
            Clear Console
          </button>
        )}
      </div>

      {consoleLogs.length > 0 ? (
        <div className="space-y-1">
          {consoleLogs.map((log, i) => {
            if (log.type === "error") {
              return (
                <div
                  key={i}
                  className="flex flex-col gap-1 text-rose-400 bg-rose-950/30 p-2 rounded border border-rose-900/40"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 select-none">
                      [{log.timestamp ? log.timestamp.slice(11, 19) : "--:--:--"}]
                    </span>
                    <span className="font-semibold">{log.message}</span>
                  </div>
                  {log.traceback && (
                    <pre className="text-[11px] text-rose-300/80 font-mono whitespace-pre-wrap pl-6 overflow-x-auto">
                      {log.traceback}
                    </pre>
                  )}
                </div>
              );
            }

            if (log.type === "console") {
              return (
                <div key={i} className="flex gap-2 leading-relaxed">
                  <span className="text-slate-600 select-none">
                    [{log.timestamp ? log.timestamp.slice(11, 19) : "--:--:--"}]
                  </span>
                  <span
                    className={`whitespace-pre-wrap ${
                      log.stream === "stderr" ? "text-rose-400" : "text-emerald-300"
                    }`}
                  >
                    {log.text}
                  </span>
                </div>
              );
            }

            return null;
          })}

          {runState === "running" && (
            <div className="flex items-center gap-2 text-amber-400 text-[11px] pt-1 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Streaming live Python output...</span>
            </div>
          )}
        </div>
      ) : runState === "running" ? (
        <div className="text-amber-400 italic py-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>Initializing Python subprocess... streaming logs will appear here.</span>
        </div>
      ) : (
        <div className="text-slate-500 italic py-4">
          No console logs captured yet. Click "Run Pipeline" to execute the Python script.
        </div>
      )}
    </div>
  );
}

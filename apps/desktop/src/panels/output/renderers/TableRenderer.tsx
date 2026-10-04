import type { TableOutputMessage, OutputMessage } from "@codebrix/types";
import type { RendererProps } from "../registry";

export default function TableRenderer({
  messages,
  runState,
  executionResult,
}: RendererProps<OutputMessage>) {
  const tableOutputs = messages.filter((m): m is TableOutputMessage => m.type === "table");
  const latestTable = tableOutputs[tableOutputs.length - 1];

  if (!latestTable) {
    if (runState === "running") {
      return (
        <div className="text-amber-400 text-center py-8 flex flex-col items-center gap-2 font-mono text-xs">
          <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
          <span className="font-sans text-xs">
            Loading dataset from Python process... preview will render once received.
          </span>
        </div>
      );
    }

    if (executionResult?.status === "failed") {
      return (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-center font-sans text-xs text-rose-300">
          Execution failed before dataset could be loaded. Check Console tab for traceback.
        </div>
      );
    }

    return (
      <div className="text-slate-500 text-center py-8 font-sans text-xs">
        No tabular dataset loaded yet. Connect a CSV Loader or dataset block and click{" "}
        <span className="text-emerald-400 font-semibold">"Run Pipeline"</span>.
      </div>
    );
  }

  const rowCount = latestTable.totalRows ?? latestTable.rows.length;
  const colCount = latestTable.totalColumns ?? latestTable.columns.length;

  return (
    <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-950/80 font-mono text-xs">
      <div className="px-3 py-2 bg-slate-900/80 border-b border-slate-800 text-xs font-sans text-slate-300 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">{latestTable.title || "Dataset Preview"}</span>
          {latestTable.blockId && (
            <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-800 text-slate-400 font-mono">
              {latestTable.blockId}
            </span>
          )}
        </div>
        <span className="text-slate-400 font-mono text-[11px]">
          {rowCount} rows × {colCount} columns (showing {latestTable.rows.length} preview rows)
        </span>
      </div>

      <div className="overflow-x-auto max-h-48">
        <table className="w-full text-left border-collapse font-mono text-xs">
          <thead>
            <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] text-slate-400 sticky top-0">
              <th className="p-2 border-r border-slate-800/60 w-10 text-center text-slate-500 select-none">
                #
              </th>
              {latestTable.columns.map((col, idx) => (
                <th
                  key={idx}
                  className="p-2 border-r border-slate-800/40 font-semibold text-slate-300 whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {latestTable.rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-slate-800/40 transition-colors">
                <td className="p-2 border-r border-slate-800/60 text-center text-slate-500 select-none">
                  {rowIdx + 1}
                </td>
                {row.map((val, cellIdx) => (
                  <td
                    key={cellIdx}
                    className="p-2 border-r border-slate-800/40 text-slate-300 whitespace-nowrap"
                  >
                    {val === null || val === undefined ? (
                      <span className="text-slate-600 italic">null</span>
                    ) : typeof val === "number" ? (
                      Number.isInteger(val) ? (
                        val
                      ) : (
                        val.toFixed(3)
                      )
                    ) : (
                      String(val)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

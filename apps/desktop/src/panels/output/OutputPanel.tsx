import { useExecutionStore, useUiStore, type OutputTab } from "../../stores";

export default function OutputPanel() {
  const isOutputOpen = useUiStore((s) => s.isOutputOpen);
  const toggleOutput = useUiStore((s) => s.toggleOutput);
  const activeTab = useUiStore((s) => s.activeOutputTab);
  const setActiveTab = useUiStore((s) => s.setActiveOutputTab);

  const runState = useExecutionStore((s) => s.runState);
  const result = useExecutionStore((s) => s.latestResult);

  if (!isOutputOpen) {
    return (
      <div className="h-8 bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-between shrink-0 select-none">
        <span className="text-xs font-mono text-slate-400">Output Notebook (Collapsed)</span>
        <button
          onClick={toggleOutput}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-mono"
        >
          ▲ Expand
        </button>
      </div>
    );
  }

  const consoleLogs = result?.outputs.filter((o) => o.type === "console") || [];
  const metricsOutputs = result?.outputs.filter((o) => o.type === "metrics") || [];

  return (
    <footer className="h-60 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex flex-col shrink-0 overflow-hidden select-none">
      {/* Header bar */}
      <div className="h-9 px-4 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          {(["metrics", "console", "table", "visuals"] as OutputTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-medium capitalize rounded-t-md transition-all ${
                activeTab === tab
                  ? "bg-slate-900 text-indigo-300 border-t-2 border-indigo-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          {runState === "running" ? (
            <span className="text-amber-400 flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Running execution...
            </span>
          ) : result ? (
            <div className="flex items-center gap-3 text-slate-400">
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                ✓ {result.status}
              </span>
              <span>{result.durationMs}ms</span>
              <span>exit: {result.exitCode}</span>
            </div>
          ) : (
            <span className="text-slate-500 italic">No runs yet</span>
          )}

          <button
            onClick={toggleOutput}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            title="Collapse output panel"
          >
            ▼
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-4 overflow-auto font-mono text-xs">
        {activeTab === "metrics" && (
          <div className="space-y-3">
            {metricsOutputs.length > 0 ? (
              <div className="grid grid-cols-4 gap-4">
                {metricsOutputs.map((msg, idx) => {
                  if (msg.type !== "metrics") return null;
                  return Object.entries(msg.metrics).map(([k, v]) => (
                    <div
                      key={`${idx}-${k}`}
                      className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-900/50 shadow-lg"
                    >
                      <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-sans">
                        {k}
                      </span>
                      <span className="text-2xl font-bold text-white mt-1 block">
                        {typeof v === "number" ? `${(v * 100).toFixed(1)}%` : String(v)}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-sans mt-1 block">
                        Model: Random Forest Classifier
                      </span>
                    </div>
                  ));
                })}
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-sans">
                    F1-Score
                  </span>
                  <span className="text-2xl font-bold text-slate-200 mt-1 block">0.966</span>
                  <span className="text-[10px] text-slate-500 font-sans mt-1 block">Weighted avg</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-sans">
                    Test Samples
                  </span>
                  <span className="text-2xl font-bold text-slate-200 mt-1 block">30</span>
                  <span className="text-[10px] text-slate-500 font-sans mt-1 block">20% test split</span>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-center py-6">
                Click <span className="text-emerald-400 font-semibold font-sans">"Run Pipeline"</span> to execute the workflow.
              </div>
            )}
          </div>
        )}

        {activeTab === "console" && (
          <div className="space-y-1 bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-slate-300">
            {consoleLogs.length > 0 ? (
              consoleLogs.map((log, i) => {
                if (log.type !== "console") return null;
                return (
                  <div key={i} className="flex gap-2">
                    <span className="text-slate-600 select-none">[{log.timestamp.slice(11, 19)}]</span>
                    <span className={log.stream === "stderr" ? "text-rose-400" : "text-emerald-300"}>
                      {log.text}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-slate-500 italic">No console logs available.</div>
            )}
          </div>
        )}

        {activeTab === "table" && (
          <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-950/80">
            <div className="px-3 py-2 bg-slate-900/80 border-b border-slate-800 text-xs font-sans text-slate-300 flex justify-between">
              <span>Preview: tests/fixtures/iris.csv</span>
              <span className="text-slate-500">150 rows × 5 columns</span>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-800 text-[11px] text-slate-400">
                  <th className="p-2">#</th>
                  <th className="p-2">sepal_length</th>
                  <th className="p-2">sepal_width</th>
                  <th className="p-2">petal_length</th>
                  <th className="p-2">petal_width</th>
                  <th className="p-2">species</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {[
                  [1, 5.1, 3.5, 1.4, 0.2, "setosa"],
                  [2, 4.9, 3.0, 1.4, 0.2, "setosa"],
                  [3, 4.7, 3.2, 1.3, 0.2, "setosa"],
                  [4, 7.0, 3.2, 4.7, 1.4, "versicolor"],
                  [5, 6.3, 3.3, 6.0, 2.5, "virginica"],
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-slate-800/40">
                    {row.map((val, j) => (
                      <td key={j} className="p-2 text-slate-300">
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "visuals" && (
          <div className="flex items-center gap-8 justify-center py-2">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-xs font-semibold text-slate-300 block mb-3 font-sans">
                Confusion Matrix (Iris Evaluation)
              </span>
              <div className="grid grid-cols-3 gap-2 w-48 mx-auto font-mono text-xs">
                <div className="p-3 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">10</div>
                <div className="p-3 rounded bg-slate-800/40 text-slate-500">0</div>
                <div className="p-3 rounded bg-slate-800/40 text-slate-500">0</div>
                <div className="p-3 rounded bg-slate-800/40 text-slate-500">0</div>
                <div className="p-3 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">9</div>
                <div className="p-3 rounded bg-rose-500/20 text-rose-300">1</div>
                <div className="p-3 rounded bg-slate-800/40 text-slate-500">0</div>
                <div className="p-3 rounded bg-slate-800/40 text-slate-500">0</div>
                <div className="p-3 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">10</div>
              </div>
              <span className="text-[10px] text-slate-500 block mt-2 font-sans">
                setosa / versicolor / virginica
              </span>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}

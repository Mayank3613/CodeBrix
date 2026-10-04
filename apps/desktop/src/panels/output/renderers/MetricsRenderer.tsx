import type { MetricsOutputMessage, OutputMessage } from "@codebrix/types";
import type { RendererProps } from "../registry";

function formatMetricValue(key: string, val: number | string | boolean): string {
  if (typeof val === "boolean") return val ? "True" : "False";
  if (typeof val === "string") return val;
  if (typeof val === "number") {
    const lower = key.toLowerCase();
    if (lower.includes("pct") || lower.includes("percent")) {
      return `${val}%`;
    }
    if (
      lower.includes("sample") ||
      lower.includes("count") ||
      lower.includes("total") ||
      Number.isInteger(val)
    ) {
      return val.toLocaleString();
    }
    if (
      val >= 0 &&
      val <= 1 &&
      (lower.includes("acc") ||
        lower.includes("score") ||
        lower.includes("precision") ||
        lower.includes("recall") ||
        lower.includes("f1") ||
        lower.includes("loss"))
    ) {
      return `${(val * 100).toFixed(2)}% (${val.toFixed(4)})`;
    }
    return val.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  return String(val);
}

function formatMetricKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function MetricsRenderer({
  messages,
  runState,
  executionResult,
}: RendererProps<OutputMessage>) {
  const metricsOutputs = messages.filter((m): m is MetricsOutputMessage => m.type === "metrics");

  const scalarMetrics: Array<{
    key: string;
    value: number | string | boolean;
    title?: string;
    blockId?: string;
  }> = [];

  for (const msg of metricsOutputs) {
    for (const [k, v] of Object.entries(msg.metrics)) {
      if (Array.isArray(v) || (typeof v === "object" && v !== null)) continue;
      if (k === "accuracy_pct" && "accuracy" in msg.metrics) continue;
      scalarMetrics.push({
        key: k,
        value: v,
        title: msg.title,
        blockId: msg.blockId,
      });
    }
  }

  if (scalarMetrics.length === 0) {
    if (runState === "running") {
      return (
        <div className="text-amber-400 text-center py-8 flex flex-col items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
          <span className="font-sans text-xs">
            Running Python workflow subprocess... Awaiting metrics emission.
          </span>
        </div>
      );
    }

    if (executionResult?.status === "failed") {
      return (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-center space-y-2">
          <p className="text-sm font-semibold text-rose-300">
            Execution Failed {executionResult.exitCode !== undefined ? `(exit code ${executionResult.exitCode})` : ""}
          </p>
          <p className="text-xs text-slate-400 font-sans">
            {executionResult.error?.message || "An error occurred during Python subprocess execution."}
          </p>
        </div>
      );
    }

    return (
      <div className="text-slate-500 text-center py-8 font-sans text-xs">
        No metrics computed yet. Click{" "}
        <span className="text-emerald-400 font-semibold">"Run Pipeline"</span> to execute the Python workflow.
      </div>
    );
  }

  return (
    <div className="space-y-3 font-mono text-xs">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {scalarMetrics.map((item, idx) => {
          const isErrorKey = item.key.includes("incorrect") || item.key.includes("error");
          const isCorrectKey = item.key.includes("correct") && !isErrorKey;
          const numVal = typeof item.value === "number" ? item.value : null;
          const hasErrors = isErrorKey && numVal !== null && numVal > 0;
          const cardBorder =
            hasErrors
              ? "border-rose-800/60 bg-gradient-to-br from-rose-950/30 to-slate-900"
              : isCorrectKey
              ? "border-emerald-800/50 bg-gradient-to-br from-emerald-950/20 to-slate-900"
              : "border-indigo-900/50 bg-gradient-to-br from-indigo-950/40 to-slate-900";

          const valColor =
            hasErrors
              ? "text-rose-400"
              : isCorrectKey
              ? "text-emerald-400"
              : "text-white";

          return (
            <div
              key={`${idx}-${item.key}`}
              className={`p-4 rounded-xl border shadow-lg ${cardBorder}`}
            >
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-sans">
                {formatMetricKey(item.key)}
              </span>
              <span className={`text-2xl font-bold mt-1 block tracking-tight ${valColor}`}>
                {formatMetricValue(item.key, item.value)}
              </span>
              <span className="text-[10px] text-slate-400 font-sans mt-1 block truncate">
                {item.title || "Evaluation Metric"}
                {item.blockId ? ` • [${item.blockId}]` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

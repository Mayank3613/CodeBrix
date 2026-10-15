import { useMemo } from "react";
import type { MetricsOutputMessage, OutputMessage } from "@codebrix/types";
import type { RendererProps } from "../registry";
import { useWorkflowStore, useUiStore } from "../../../stores";
import { blockRegistry } from "../../../registry";
import { Activity, Award } from "lucide-react";

function BlockChip({ blockId }: { blockId: string }) {
  const block = useWorkflowStore((s) => s.graph.blocks[blockId]);
  const focusBlock = useUiStore((s) => s.focusBlock);
  const label = block?.label || (block?.definitionId ? blockRegistry.get(block.definitionId)?.name : null) || "Block";

  return (
    <button
      type="button"
      onClick={() => focusBlock(blockId)}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/50 text-cyan-300 font-mono text-[10px] cursor-pointer transition-colors"
      title={`Focus ${label} on canvas`}
    >
      <span>{label}</span>
    </button>
  );
}

function formatMetricValue(key: string, val: number | string | boolean): { display: string; isHeroCandidate?: boolean } {
  if (typeof val === "boolean") return { display: val ? "True" : "False" };
  if (typeof val === "string") return { display: val };
  if (typeof val === "number") {
    const lower = key.toLowerCase();

    // Percentage values
    if (lower.includes("pct") || lower.includes("percent")) {
      return {
        display: new Intl.NumberFormat("en-US", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val / 100),
        isHeroCandidate: true,
      };
    }

    // Integer counts
    if (Number.isInteger(val) || lower.includes("sample") || lower.includes("count") || lower.includes("total")) {
      return {
        display: new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(val),
        isHeroCandidate: false,
      };
    }

    // 0-1 metrics (accuracy, precision, recall, f1, score)
    if (val >= 0 && val <= 1 && (lower.includes("acc") || lower.includes("score") || lower.includes("precision") || lower.includes("recall") || lower.includes("f1"))) {
      return {
        display: new Intl.NumberFormat("en-US", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val),
        isHeroCandidate: true,
      };
    }

    // Generic float (4 decimal places)
    return {
      display: new Intl.NumberFormat("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(val),
      isHeroCandidate: false,
    };
  }
  return { display: String(val) };
}

function formatMetricKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function MetricsRenderer({
  messages,
  runState,
  executionResult,
}: RendererProps<OutputMessage>) {
  const metricsOutputs = useMemo(
    () => messages.filter((m): m is MetricsOutputMessage => m.type === "metrics"),
    [messages]
  );

  const graphBlocks = useWorkflowStore((s) => s.graph.blocks);

  // Group metrics by block or title
  const { groups, heroMetrics, totalMetricsCount } = useMemo(() => {
    const groupMap = new Map<string, { blockId?: string; title: string; items: Array<{ key: string; value: number | string | boolean; display: string }> }>();
    const heroes: Array<{ key: string; display: string; blockLabel: string; blockId?: string }> = [];
    let count = 0;

    for (const msg of metricsOutputs) {
      const bId = msg.blockId;
      const bLabel = (bId && graphBlocks[bId]?.label) || (bId && blockRegistry.get(graphBlocks[bId]?.definitionId || "")?.name) || msg.title || "Pipeline Evaluation";
      const groupKey = bId || msg.title || "evaluation";

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          blockId: bId,
          title: bLabel,
          items: [],
        });
      }

      const grp = groupMap.get(groupKey)!;

      for (const [k, v] of Object.entries(msg.metrics)) {
        if (Array.isArray(v) || (typeof v === "object" && v !== null)) continue;
        if (k === "accuracy_pct" && "accuracy" in msg.metrics) continue;

        const { display, isHeroCandidate } = formatMetricValue(k, v);
        grp.items.push({ key: k, value: v, display });
        count++;

        if (isHeroCandidate && (k.includes("acc") || k.includes("f1") || k.includes("score"))) {
          heroes.push({
            key: k,
            display,
            blockLabel: bLabel,
            blockId: bId,
          });
        }
      }
    }

    return {
      groups: Array.from(groupMap.values()),
      heroMetrics: heroes,
      totalMetricsCount: count,
    };
  }, [metricsOutputs, graphBlocks]);

  if (totalMetricsCount === 0) {
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
    <div className="pt-2 pb-6 space-y-6 font-mono text-xs">
      {/* ── Hero KPI Cards ── */}
      {heroMetrics.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {heroMetrics.map((hero, hIdx) => (
            <div
              key={hIdx}
              className="p-3.5 rounded-[var(--cb-radius-control)] bg-emerald-950/20 border border-emerald-500/30 flex flex-col shadow-xs"
            >
              <div className="flex items-center justify-between gap-1 text-[10px] text-emerald-400 font-sans uppercase font-bold tracking-wider">
                <span>{formatMetricKey(hero.key)}</span>
                <Award size={13} className="text-emerald-400 shrink-0" />
              </div>
              <div className="text-2xl font-bold text-white mt-1">
                {hero.display}
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--cb-text-muted)] font-sans">
                <span className="truncate">{hero.blockLabel}</span>
                {hero.blockId && <BlockChip blockId={hero.blockId} />}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Grouped Secondary Metrics ── */}
      <div className="space-y-4">
        {groups.map((grp, gIdx) => (
          <div
            key={gIdx}
            className="p-4 rounded-[var(--cb-radius-control)] bg-black/25 border border-[var(--cb-border-subtle)]"
          >
            {/* Group Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[var(--cb-border-subtle)] mb-3">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-cyan-400" />
                <span className="font-semibold text-white font-sans text-xs">
                  {grp.title}
                </span>
                {grp.blockId && <BlockChip blockId={grp.blockId} />}
              </div>
              <span className="text-[10px] text-[var(--cb-text-muted)] font-mono">
                {grp.items.length} metrics
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {grp.items.map((item, iIdx) => {
                const isErrorKey = item.key.includes("incorrect") || item.key.includes("error");
                const isCorrectKey = item.key.includes("correct") && !isErrorKey;
                const numVal = typeof item.value === "number" ? item.value : null;
                const hasErrors = isErrorKey && numVal !== null && numVal > 0;

                const cardBorder = hasErrors
                  ? "border-rose-900/60 bg-rose-950/20"
                  : isCorrectKey
                  ? "border-emerald-900/50 bg-emerald-950/15"
                  : "border-white/[0.06] bg-white/[0.02]";

                const valColor = hasErrors
                  ? "text-rose-400"
                  : isCorrectKey
                  ? "text-emerald-400"
                  : "text-white";

                return (
                  <div
                    key={iIdx}
                    className={`p-3 rounded-[var(--cb-radius-control)] border ${cardBorder}`}
                  >
                    <span className="text-[10px] text-[var(--cb-text-muted)] uppercase tracking-wider block font-sans truncate" title={item.key}>
                      {formatMetricKey(item.key)}
                    </span>
                    <span className={`text-lg font-bold mt-0.5 block tracking-tight font-mono ${valColor}`}>
                      {item.display}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

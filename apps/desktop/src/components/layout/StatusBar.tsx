import {
  useUiStore,
  useExecutionStore,
  useWorkflowStore,
  useValidationStore,
  useProjectStore,
} from "../../stores";
import {
  Check,
  AlertTriangle,
  AlertCircle,
  Terminal,
  Layers,
  Loader2,
} from "lucide-react";

export default function StatusBar() {
  const focusBlock = useUiStore((s) => s.focusBlock);
  const runState = useExecutionStore((s) => s.runState);
  const latestResult = useExecutionStore((s) => s.latestResult);
  const graph = useWorkflowStore((s) => s.graph);
  const validationResult = useValidationStore((s) => s.validationResult);
  const isDirty = useProjectStore((s) => s.isDirty);

  const blockCount = Object.keys(graph.blocks).length;
  const connectionCount = graph.connections.length;

  const errors = validationResult?.errors || [];
  const warnings = validationResult?.warnings || [];

  const handleValidationClick = () => {
    if (errors.length > 0 && errors[0]?.blockId) {
      focusBlock(errors[0].blockId);
    } else {
      if (!useUiStore.getState().isPropertiesOpen) {
        useUiStore.getState().toggleProperties();
      }
    }
  };

  return (
    <footer
      aria-label="Status Bar"
      className="h-[var(--cb-statusbar-height)] px-3 bg-[var(--cb-elevation-panel)] border-t border-[var(--cb-border-subtle)] grid grid-cols-[1fr_auto_1fr] items-center text-[12px] font-mono text-[var(--cb-text-muted)] select-none shrink-0 z-30"
    >
      {/* ── Left Zone: Python Runtime & Runner State ── */}
      <div className="flex items-center gap-2.5 justify-self-start">
        <div className="flex items-center gap-1.5 text-[var(--cb-text-secondary)]">
          <Terminal size={12} className="text-cyan-400" />
          <span>Python 3.11</span>
          <span className="text-[11px] text-[var(--cb-text-muted)]">(.venv)</span>
        </div>

        <div className="w-px h-3 bg-[var(--cb-border-subtle)]" />

        <div className="flex items-center gap-1.5">
          {runState === "running" ? (
            <>
              <Loader2 size={11} className="animate-spin text-cyan-400" />
              <span className="text-cyan-300 font-medium">Running</span>
            </>
          ) : latestResult?.status === "success" ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--cb-success)] shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
              <span className="text-emerald-300 font-medium">Success</span>
            </>
          ) : latestResult?.status === "failed" || runState === "failed" ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--cb-error)] shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
              <span className="text-rose-300 font-medium">Failed</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              <span className="text-[var(--cb-text-secondary)]">Idle</span>
            </>
          )}
        </div>
      </div>

      {/* ── Center Zone: Graph Stats & Validation Summary ── */}
      <div className="flex items-center gap-2.5 justify-self-center">
        <div className="flex items-center gap-1.5 text-[var(--cb-text-secondary)]">
          <Layers size={12} className="text-slate-500" />
          <span>{blockCount} block{blockCount !== 1 ? "s" : ""}</span>
          <span className="text-slate-600">•</span>
          <span>{connectionCount} connection{connectionCount !== 1 ? "s" : ""}</span>
        </div>

        <div className="w-px h-3 bg-[var(--cb-border-subtle)]" />

        {/* Validation Summary Button */}
        <button
          onClick={handleValidationClick}
          className={`flex items-center gap-1.5 cursor-pointer px-1.5 py-0.5 rounded-[var(--cb-radius-sm)] hover:bg-white/10 transition-colors ${
            errors.length > 0
              ? "text-rose-400 font-medium"
              : warnings.length > 0
              ? "text-amber-400 font-medium"
              : validationResult?.valid
              ? "text-emerald-400 font-medium"
              : "text-[var(--cb-text-muted)]"
          }`}
          title="Click to view issues in properties panel"
        >
          {errors.length > 0 ? (
            <>
              <AlertCircle size={12} className="text-rose-400" />
              <span>{errors.length} error{errors.length > 1 ? "s" : ""}</span>
            </>
          ) : warnings.length > 0 ? (
            <>
              <AlertTriangle size={12} className="text-amber-400" />
              <span>{warnings.length} warning{warnings.length > 1 ? "s" : ""}</span>
            </>
          ) : validationResult?.valid ? (
            <>
              <Check size={12} className="text-emerald-400" />
              <span>Graph Valid</span>
            </>
          ) : (
            <span>Not Validated</span>
          )}
        </button>
      </div>

      {/* ── Right Zone: Saved/Modified Status ── */}
      <div className="flex items-center gap-1.5 justify-self-end">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isDirty ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" : "bg-emerald-500"
          }`}
        />
        <span className={isDirty ? "text-amber-300 font-medium" : "text-[var(--cb-text-muted)]"}>
          {isDirty ? "Modified" : "Saved"}
        </span>
      </div>
    </footer>
  );
}

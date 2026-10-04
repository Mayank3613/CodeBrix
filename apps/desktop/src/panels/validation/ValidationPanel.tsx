import { useValidationStore, useUiStore } from "../../stores";

export default function ValidationPanel() {
  const result = useValidationStore((s) => s.validationResult);
  const selectBlock = useUiStore((s) => s.selectBlock);

  if (!result || (result.errors.length === 0 && result.warnings.length === 0)) {
    return null;
  }

  return (
    <div className="bg-slate-900 border-b border-rose-900/60 p-2.5 px-5 flex items-center justify-between text-xs select-none">
      <div className="flex items-center gap-3 overflow-x-auto">
        <span className="font-semibold text-rose-400 flex items-center gap-1.5 shrink-0">
          <span>⚠</span>
          <span>Validation Issues ({result.errors.length} errors, {result.warnings.length} warnings):</span>
        </span>

        {result.errors.map((err, i) => (
          <button
            key={i}
            onClick={() => err.blockId && selectBlock(err.blockId)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 text-[11px] font-mono transition-colors shrink-0"
          >
            <span className="font-semibold">[{err.blockId || "graph"}]</span>
            <span>{err.message}</span>
          </button>
        ))}

        {result.warnings.map((warn, i) => (
          <button
            key={i}
            onClick={() => warn.blockId && selectBlock(warn.blockId)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/80 hover:bg-amber-900 border border-amber-800 text-amber-200 text-[11px] font-mono transition-colors shrink-0"
          >
            <span className="font-semibold">[{warn.blockId || "graph"}]</span>
            <span>{warn.message}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface ToolbarProps {
  onValidate: () => void;
  onRun: () => void;
  onReset: () => void;
  isValidating: boolean;
  isRunning: boolean;
  validationStatus: { valid: boolean | null; errorCount: number; message: string };
}

export default function Toolbar({
  onValidate,
  onRun,
  onReset,
  isValidating,
  isRunning,
  validationStatus,
}: ToolbarProps) {
  return (
    <div className="h-12 px-5 bg-slate-900/60 backdrop-blur-md border-b border-slate-800 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-1.5 text-xs text-slate-300">
        <button className="px-2.5 py-1 rounded hover:bg-slate-800 hover:text-white transition-colors">
          File
        </button>
        <button className="px-2.5 py-1 rounded hover:bg-slate-800 hover:text-white transition-colors">
          Edit
        </button>
        <button className="px-2.5 py-1 rounded hover:bg-slate-800 hover:text-white transition-colors">
          Insert
        </button>
        <button className="px-2.5 py-1 rounded hover:bg-slate-800 hover:text-white transition-colors">
          View
        </button>
        <div className="w-px h-4 bg-slate-800 mx-2" />
        <span className="text-[11px] text-slate-500 font-mono">Acceptance Pipeline: Iris MVP</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Validation status badge */}
        {validationStatus.valid !== null && (
          <div
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border ${
              validationStatus.valid
                ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/60"
                : "bg-rose-950/40 text-rose-300 border-rose-800/60"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                validationStatus.valid ? "bg-emerald-400" : "bg-rose-400"
              }`}
            />
            {validationStatus.message}
          </div>
        )}

        <button
          onClick={onValidate}
          disabled={isValidating}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all border border-slate-700/80 rounded-lg disabled:opacity-50"
        >
          <span>✓</span>
          <span>{isValidating ? "Validating..." : "Validate Graph"}</span>
        </button>

        <button
          onClick={onRun}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-95 shadow-md shadow-emerald-600/20 transition-all rounded-lg disabled:opacity-50"
        >
          <span>▶</span>
          <span>{isRunning ? "Running Pipeline..." : "Run Pipeline"}</span>
        </button>

        <button
          onClick={onReset}
          className="px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors rounded-lg"
          title="Reset Graph to Default Iris Mock"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
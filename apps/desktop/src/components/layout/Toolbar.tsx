import { useState } from "react";
import { workflowService } from "../../services";
import {
  useWorkflowStore,
  useValidationStore,
  useExecutionStore,
  useUiStore,
} from "../../stores";
import { createIrisWorkflowMock } from "@codebrix/shared";

export default function Toolbar() {
  const [isValidating, setIsValidating] = useState(false);
  const graph = useWorkflowStore((s) => s.graph);
  const setGraph = useWorkflowStore((s) => s.setGraph);

  const setValidationResult = useValidationStore((s) => s.setValidationResult);
  const validationResult = useValidationStore((s) => s.validationResult);

  const setRunState = useExecutionStore((s) => s.setRunState);
  const setLatestResult = useExecutionStore((s) => s.setLatestResult);
  const setBlockStatus = useExecutionStore((s) => s.setBlockStatus);
  const runState = useExecutionStore((s) => s.runState);

  const isPaletteOpen = useUiStore((s) => s.isPaletteOpen);
  const togglePalette = useUiStore((s) => s.togglePalette);
  const isPropertiesOpen = useUiStore((s) => s.isPropertiesOpen);
  const toggleProperties = useUiStore((s) => s.toggleProperties);

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const res = await workflowService.validateGraph(graph);
      setValidationResult(res);
    } catch (err) {
      console.error("Validation error:", err);
    } finally {
      setIsValidating(false);
    }
  };

  const handleRun = async () => {
    setRunState("running");

    // Animate blocks through execution plan
    const blockIds = Object.keys(graph.blocks);
    for (const bId of blockIds) {
      setBlockStatus(bId, "running");
      await new Promise((r) => setTimeout(r, 60));
      setBlockStatus(bId, "success");
    }

    try {
      const res = await workflowService.executeWorkflow(graph);
      setLatestResult(res);
      setRunState("success");
    } catch (err) {
      console.error("Execution failed:", err);
      setRunState("failed");
    }
  };

  const handleReset = () => {
    const mock = createIrisWorkflowMock();
    setGraph(mock);
    setValidationResult(null);
    setLatestResult(null);
    setRunState("idle");
  };

  return (
    <div className="h-12 px-5 bg-slate-900/60 backdrop-blur-md border-b border-slate-800 flex items-center justify-between shrink-0 select-none">
      <div className="flex items-center gap-2">
        <button
          onClick={togglePalette}
          className={`px-2.5 py-1 text-xs rounded transition-colors ${
            isPaletteOpen
              ? "bg-slate-800 text-white font-medium"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {isPaletteOpen ? "Hide Palette" : "Show Palette"}
        </button>

        <button
          onClick={toggleProperties}
          className={`px-2.5 py-1 text-xs rounded transition-colors ${
            isPropertiesOpen
              ? "bg-slate-800 text-white font-medium"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {isPropertiesOpen ? "Hide Properties" : "Show Properties"}
        </button>

        <div className="w-px h-4 bg-slate-800 mx-2" />
        <span className="text-[11px] text-slate-500 font-mono">
          Nodes: {Object.keys(graph.blocks).length} | Edges: {graph.connections.length}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Validation Status Indicator */}
        {validationResult && (
          <div
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border ${
              validationResult.valid
                ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/60"
                : "bg-rose-950/40 text-rose-300 border-rose-800/60"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                validationResult.valid ? "bg-emerald-400" : "bg-rose-400"
              }`}
            />
            <span>
              {validationResult.valid
                ? "Graph Valid"
                : `${validationResult.errors.length} issue(s)`}
            </span>
          </div>
        )}

        <button
          onClick={handleValidate}
          disabled={isValidating}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all border border-slate-700/80 rounded-lg disabled:opacity-50"
        >
          <span>✓</span>
          <span>{isValidating ? "Validating..." : "Validate Graph"}</span>
        </button>

        <button
          onClick={handleRun}
          disabled={runState === "running"}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-95 shadow-md shadow-emerald-600/20 transition-all rounded-lg disabled:opacity-50"
        >
          <span>▶</span>
          <span>{runState === "running" ? "Running Pipeline..." : "Run Pipeline"}</span>
        </button>

        <button
          onClick={handleReset}
          className="px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors rounded-lg"
          title="Reset to default Iris mock pipeline"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
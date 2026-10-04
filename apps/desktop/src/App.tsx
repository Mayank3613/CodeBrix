import { useState } from "react";
import type { WorkflowGraph, ExecutionResult } from "@codebrix/types";
import { createIrisWorkflowMock } from "@codebrix/shared";
import { workflowService } from "./services";
import Header from "./components/layout/Header";
import Toolbar from "./components/layout/Toolbar";
import Explorer from "./components/layout/Explorer";
import Canvas from "./components/layout/Canvas";
import Panel from "./components/layout/Panel";
import Footer from "./components/layout/Footer";

export default function App() {
  const [graph, setGraph] = useState<WorkflowGraph>(() => createIrisWorkflowMock());
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>("blk-csv");
  const [validationStatus, setValidationStatus] = useState<{
    valid: boolean | null;
    errorCount: number;
    message: string;
  }>({
    valid: null,
    errorCount: 0,
    message: "Ready",
  });
  const [isValidating, setIsValidating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);

  // Validate workflow graph using shared workflow service
  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const res = await workflowService.validateGraph(graph);
      setValidationStatus({
        valid: res.valid,
        errorCount: res.errors.length,
        message: res.valid ? "Graph is valid" : `${res.errors.length} error(s) found`,
      });
    } catch (err) {
      setValidationStatus({
        valid: false,
        errorCount: 1,
        message: err instanceof Error ? err.message : "Validation failed",
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Run workflow pipeline using shared workflow service
  const handleRun = async () => {
    setIsRunning(true);
    try {
      const execResult = await workflowService.executeWorkflow(graph);
      setResult(execResult);
      setValidationStatus({
        valid: true,
        errorCount: 0,
        message: "Execution completed",
      });
    } catch (err) {
      console.error("Execution failed:", err);
    } finally {
      setIsRunning(false);
    }
  };

  // Reset graph to reference Iris pipeline
  const handleReset = () => {
    setGraph(createIrisWorkflowMock());
    setSelectedBlockId("blk-csv");
    setResult(null);
    setValidationStatus({ valid: null, errorCount: 0, message: "Reset to Iris Mock" });
  };

  // Live update block configuration
  const handleUpdateConfig = (blockId: string, key: string, value: unknown) => {
    setGraph((prev) => {
      const target = prev.blocks[blockId];
      if (!target) return prev;
      return {
        ...prev,
        blocks: {
          ...prev.blocks,
          [blockId]: {
            ...target,
            config: {
              ...target.config,
              [key]: value,
            },
          },
        },
      };
    });
  };

  const selectedBlock = selectedBlockId ? graph.blocks[selectedBlockId] ?? null : null;

  return (
    <main className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      <Header projectName={graph.name} />
      <Toolbar
        onValidate={handleValidate}
        onRun={handleRun}
        onReset={handleReset}
        isValidating={isValidating}
        isRunning={isRunning}
        validationStatus={validationStatus}
      />

      <div className="flex flex-1 overflow-hidden">
        <Explorer />
        <Canvas
          graph={graph}
          selectedBlockId={selectedBlockId}
          onSelectBlock={setSelectedBlockId}
        />
        <Panel
          selectedBlock={selectedBlock}
          onUpdateConfig={handleUpdateConfig}
        />
      </div>

      <Footer result={result} isRunning={isRunning} />
    </main>
  );
}

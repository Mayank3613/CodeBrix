import { useState } from "react";

interface LibraryCategory {
  id: string;
  name: string;
  description: string;
  blocks: Array<{
    id: string;
    name: string;
    description: string;
    category: "data" | "ml" | "eval" | "core";
  }>;
}

const LIBRARIES: LibraryCategory[] = [
  {
    id: "data",
    name: "Data Processing",
    description: "Loaders, encoders & preprocessing",
    blocks: [
      { id: "data.csv_loader", name: "CSV Loader", description: "Read tabular dataset from CSV", category: "data" },
      { id: "data.json_loader", name: "JSON Loader", description: "Parse structured JSON data", category: "data" },
      { id: "data.excel_loader", name: "Excel Loader", description: "Read worksheets with openpyxl", category: "data" },
      { id: "data.scaling", name: "Feature Scaler", description: "Standard & MinMax scaling", category: "data" },
      { id: "data.encoding", name: "Categorical Encoder", description: "One-hot & Label encoding", category: "data" },
    ],
  },
  {
    id: "scikit-learn",
    name: "Scikit-Learn ML",
    description: "Supervised models & estimators",
    blocks: [
      { id: "ml.train_test_split", name: "Train/Test Split", description: "Partition dataset into folds", category: "ml" },
      { id: "ml.random_forest_classifier", name: "Random Forest", description: "Ensemble classification trees", category: "ml" },
      { id: "ml.linear_regression", name: "Linear Regression", description: "Ordinary least squares", category: "ml" },
      { id: "ml.predict", name: "Predictor", description: "Generate inference predictions", category: "ml" },
    ],
  },
  {
    id: "visualization",
    name: "Visualization & Eval",
    description: "Metrics, confusion matrices & plots",
    blocks: [
      { id: "eval.accuracy", name: "Accuracy Score", description: "Compute accuracy classification metric", category: "eval" },
      { id: "eval.confusion_matrix", name: "Confusion Matrix", description: "Plot multiclass classification matrix", category: "eval" },
      { id: "eval.plotly", name: "Plotly Interactive", description: "Render dynamic 2D/3D charts", category: "eval" },
    ],
  },
  {
    id: "core",
    name: "Core Logic",
    description: "Flow control & variables",
    blocks: [
      { id: "core.variables", name: "Variables", description: "State and global variables", category: "core" },
      { id: "core.conditions", name: "Conditions", description: "Branching if/else evaluation", category: "core" },
    ],
  },
];

interface ExplorerProps {
  onAddBlock?: (definitionId: string, name: string) => void;
}

export default function Explorer({ onAddBlock }: ExplorerProps) {
  const [search, setSearch] = useState("");
  const [openLibrary, setOpenLibrary] = useState<string>("data");

  const filteredLibraries = LIBRARIES.map((lib) => ({
    ...lib,
    blocks: lib.blocks.filter(
      (b) =>
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.description.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((lib) => lib.blocks.length > 0);

  return (
    <div className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col shrink-0 overflow-hidden">
      <div className="p-3 border-b border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Block Library
          </span>
          <span className="text-[10px] text-slate-500 font-mono">4 Packages</span>
        </div>
        <input
          type="text"
          placeholder="Search blocks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-950/80 border border-slate-700/70 rounded-md px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredLibraries.map((lib) => {
          const isOpen = openLibrary === lib.id || search.length > 0;
          return (
            <div key={lib.id} className="rounded-lg overflow-hidden border border-slate-800/80 bg-slate-950/40">
              <button
                onClick={() => setOpenLibrary(isOpen && search.length === 0 ? "" : lib.id)}
                className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-800/50 transition-colors"
              >
                <div>
                  <div className="text-xs font-medium text-slate-200">{lib.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{lib.description}</div>
                </div>
                <span className="text-xs text-slate-500">{isOpen ? "▾" : "▸"}</span>
              </button>

              {isOpen && (
                <div className="px-2 pb-2 space-y-1">
                  {lib.blocks.map((block) => (
                    <div
                      key={block.id}
                      onClick={() => onAddBlock?.(block.id, block.name)}
                      className="group p-2 rounded-md bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all flex items-start justify-between"
                    >
                      <div>
                        <div className="text-xs font-medium text-slate-300 group-hover:text-white">
                          {block.name}
                        </div>
                        <div className="text-[10px] text-slate-500 line-clamp-1">
                          {block.description}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-600 group-hover:text-indigo-400 font-mono">
                        +
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
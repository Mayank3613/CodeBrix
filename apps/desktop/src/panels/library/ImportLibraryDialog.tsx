import { useState, useMemo } from "react";
import { isValidLibraryManifest } from "@codebrix/shared";
import type { LibraryManifest } from "@codebrix/types";
import { importLibraryManifest } from "../../registry/libraryLoader";
import { useProjectStore } from "../../stores/projectStore";
import { readProjectFile } from "../../project/fileIo";

interface ImportLibraryDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_MANIFEST: LibraryManifest = {
  name: "community-transformers",
  version: "0.1.0",
  description: "HuggingFace transformer models and text feature extraction blocks",
  author: "Community Contributor",
  blocks: [
    "blocks/bert_encoder/block.js",
    "blocks/text_classifier/block.js",
  ],
  dependencies: {
    transformers: ">=4.30.0",
    torch: ">=2.0.0",
  },
};

export default function ImportLibraryDialog({ isOpen, onClose }: ImportLibraryDialogProps) {
  const [activeTab, setActiveTab] = useState<"file" | "json">("file");
  const [filePath, setFilePath] = useState("");
  const [rawJson, setRawJson] = useState(JSON.stringify(SAMPLE_MANIFEST, null, 2));
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  const addLibraryDependency = useProjectStore((s) => s.addLibraryDependency);

  // Validate the manifest live
  const parsedManifest = useMemo<{
    isValid: boolean;
    manifest: LibraryManifest | null;
    error: string | null;
  }>(() => {
    try {
      const parsed = JSON.parse(rawJson);
      if (isValidLibraryManifest(parsed)) {
        return { isValid: true, manifest: parsed, error: null };
      }
      return {
        isValid: false,
        manifest: null,
        error: "Schema validation failed: Must contain 'name', 'version', 'description', and array of 'blocks'.",
      };
    } catch (e) {
      return {
        isValid: false,
        manifest: null,
        error: `JSON parse error: ${(e as Error).message}`,
      };
    }
  }, [rawJson]);

  if (!isOpen) return null;

  const handleLoadFromFile = async () => {
    if (!filePath.trim()) return;
    setIsLoadingFile(true);
    setFeedback(null);

    try {
      const content = await readProjectFile(filePath.trim());
      setRawJson(content);
      setActiveTab("json");
      setFeedback({ message: "Loaded file content successfully. Review manifest below.", isError: false });
    } catch (err) {
      setFeedback({ message: `Failed to read file: ${(err as Error).message}`, isError: true });
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleConfirmImport = () => {
    if (!parsedManifest.isValid || !parsedManifest.manifest) {
      setFeedback({ message: "Cannot import: Manifest has validation errors.", isError: true });
      return;
    }

    const res = importLibraryManifest(rawJson, filePath || "custom");
    if (!res.success) {
      setFeedback({ message: `Import failed: ${res.error}`, isError: true });
      return;
    }

    addLibraryDependency(parsedManifest.manifest.name);
    setFeedback({
      message: `Library '${parsedManifest.manifest.name}' imported and registered successfully!`,
      isError: false,
    });

    setTimeout(() => {
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
            <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wide">
              Import Block Library
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800/50 hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-2">
          <button
            onClick={() => setActiveTab("file")}
            className={`pb-2 px-3 text-xs font-medium border-b-2 transition-all ${
              activeTab === "file"
                ? "border-indigo-500 text-indigo-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            From File / Directory
          </button>
          <button
            onClick={() => setActiveTab("json")}
            className={`pb-2 px-3 text-xs font-medium border-b-2 transition-all ${
              activeTab === "json"
                ? "border-indigo-500 text-indigo-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Manifest JSON Editor
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {activeTab === "file" && (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-300">
                Manifest File Path (`library.json`):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. libraries/data/library.json or /path/to/library.json"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <button
                  onClick={handleLoadFromFile}
                  disabled={isLoadingFile || !filePath.trim()}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-all"
                >
                  {isLoadingFile ? "Reading..." : "Read"}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Provide a local path to a <code className="text-slate-300">library.json</code> file. CodeBrix validates the manifest format against the contract specification before importing.
              </p>
            </div>
          )}

          {activeTab === "json" && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                Edit Manifest JSON:
              </label>
              <textarea
                value={rawJson}
                onChange={(e) => setRawJson(e.target.value)}
                rows={9}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg p-3 text-xs text-indigo-200 font-mono focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
              />
            </div>
          )}

          {/* Validation Status & Live Preview */}
          <div className="p-3.5 rounded-lg border bg-slate-950/60 border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Validation Status</span>
              {parsedManifest.isValid ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 flex items-center gap-1">
                  ✓ Valid Manifest
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-950/80 border border-rose-500/50 text-rose-400 flex items-center gap-1">
                  ✗ Validation Error
                </span>
              )}
            </div>

            {parsedManifest.isValid && parsedManifest.manifest ? (
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Library Name:</span>
                  <span className="font-mono text-indigo-300 font-semibold">{parsedManifest.manifest.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Version:</span>
                  <span className="font-mono text-slate-300">{parsedManifest.manifest.version}</span>
                </div>
                {parsedManifest.manifest.author && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Author:</span>
                    <span className="text-slate-300">{parsedManifest.manifest.author}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Declared Blocks:</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {parsedManifest.manifest.blocks.length} block(s)
                  </span>
                </div>
                <div className="pt-1 text-[11px] text-slate-400 italic">
                  "{parsedManifest.manifest.description}"
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-rose-400 font-mono">
                {parsedManifest.error}
              </div>
            )}
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div
              className={`p-2.5 rounded-lg text-xs font-mono border ${
                feedback.isError
                  ? "bg-rose-950/60 border-rose-800 text-rose-300"
                  : "bg-emerald-950/60 border-emerald-800 text-emerald-300"
              }`}
            >
              {feedback.message}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={!parsedManifest.isValid}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-all shadow-lg shadow-indigo-600/20"
          >
            Import & Register
          </button>
        </div>
      </div>
    </div>
  );
}

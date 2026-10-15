import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
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
      let content = "";
      if (typeof window !== "undefined" && Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__)) {
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          content = await invoke<string>("read_library_manifest", { manifestPath: filePath.trim() });
        } catch {
          content = await readProjectFile(filePath.trim());
        }
      } else {
        content = await readProjectFile(filePath.trim());
      }
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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-[4px] flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[var(--cb-elevation-panel)] border border-[var(--cb-border-strong)] rounded-[var(--cb-radius-panel)] shadow-[var(--cb-shadow-overlay)] max-w-lg w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[var(--cb-elevation-raised)] border-b border-[var(--cb-border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--cb-accent)]" />
            <h2 className="text-[13px] font-semibold text-[var(--cb-text-primary)]">
              Import Block Library
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-[var(--cb-radius-control)] text-[var(--cb-text-muted)] hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-[var(--cb-border-subtle)] bg-[var(--cb-elevation-raised)] px-5 pt-1">
          <button
            onClick={() => setActiveTab("file")}
            className={`pb-2 px-3 text-[12px] font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === "file"
                ? "border-[var(--cb-accent)] text-[var(--cb-accent)] font-semibold"
                : "border-transparent text-[var(--cb-text-secondary)] hover:text-white"
            }`}
          >
            From File / Directory
          </button>
          <button
            onClick={() => setActiveTab("json")}
            className={`pb-2 px-3 text-[12px] font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === "json"
                ? "border-[var(--cb-accent)] text-[var(--cb-accent)] font-semibold"
                : "border-transparent text-[var(--cb-text-secondary)] hover:text-white"
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
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
                  Valid Manifest
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950/80 border border-rose-500/40 text-rose-400">
                  Validation Error
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
        <div className="px-5 py-3.5 bg-[var(--cb-elevation-raised)] border-t border-[var(--cb-border-subtle)] flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="h-7 px-3 rounded-[var(--cb-radius-control)] border border-[var(--cb-border-subtle)] text-[var(--cb-text-secondary)] hover:text-white hover:bg-white/10 text-[12px] font-medium transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={!parsedManifest.isValid}
            className="h-7 px-4 rounded-[var(--cb-radius-control)] bg-[var(--cb-accent)] hover:bg-[var(--cb-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12px] font-medium transition-all shadow-sm cursor-pointer"
          >
            Import & Register
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

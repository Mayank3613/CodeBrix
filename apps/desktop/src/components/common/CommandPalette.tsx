import { useEffect, useState, useMemo } from "react";
import { Command } from "cmdk";
import { blockRegistry } from "../../registry";
import { useWorkflowStore, useUiStore, useValidationStore } from "../../stores";
import { workflowService } from "../../services";
import {
  Search,
  Play,
  Check,
  LayoutGrid,
  Sliders,
  Terminal,
  Boxes,
  HelpCircle,
} from "lucide-react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenShortcuts?: () => void;
}

export default function CommandPalette({ isOpen, onClose, onOpenShortcuts }: CommandPaletteProps) {
  const [search, setSearch] = useState("");

  const addBlock = useWorkflowStore((s) => s.addBlock);
  const graph = useWorkflowStore((s) => s.graph);
  const toggleProperties = useUiStore((s) => s.toggleProperties);
  const toggleOutput = useUiStore((s) => s.toggleOutput);
  const setValidationResult = useValidationStore((s) => s.setValidationResult);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          setSearch("");
          // Open handled by parent or state
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const allBlocks = useMemo(() => {
    try {
      return blockRegistry.list();
    } catch {
      return [];
    }
  }, []);

  const handleAddBlock = (blockDef: import("@codebrix/types").BlockDefinition) => {
    addBlock(blockDef, { x: 320 + Math.random() * 60, y: 160 + Math.random() * 60 });
    onClose();
  };

  const handleRun = async () => {
    onClose();
    try {
      const val = await workflowService.validateGraph(graph);
      setValidationResult(val);
      if (val.valid) {
        useUiStore.getState().setPaletteOpen(false);
        useUiStore.getState().setActiveOutputTab("console");
        await workflowService.executeWorkflow(graph);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleValidate = async () => {
    onClose();
    try {
      const val = await workflowService.validateGraph(graph);
      setValidationResult(val);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFormat = () => {
    onClose();
    useWorkflowStore.getState().autoLayout();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("codebrix:fit-view"));
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-start justify-center pt-24 select-none animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[var(--cb-elevation-overlay)] border border-[var(--cb-border-strong)] rounded-[var(--cb-radius-panel)] shadow-[var(--cb-shadow-overlay)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="w-full" label="Command Palette">
          {/* Search Input Bar */}
          <div className="flex items-center px-3.5 border-b border-[var(--cb-border-subtle)] bg-[var(--cb-elevation-raised)]">
            <Search size={14} className="text-[var(--cb-text-muted)] shrink-0 mr-2.5" />
            <Command.Input
              autoFocus
              value={search}
              onValueChange={setSearch}
              placeholder="Search blocks, commands, or templates..."
              className="w-full h-10 bg-transparent text-[13px] text-white placeholder-[var(--cb-text-muted)] outline-none font-sans"
            />
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[9px] text-[var(--cb-text-muted)] border border-white/10 shrink-0">
              ESC
            </kbd>
          </div>

          {/* List of items */}
          <Command.List className="max-h-80 overflow-y-auto p-1.5 text-[12px]">
            <Command.Empty className="py-8 text-center text-xs text-[var(--cb-text-muted)]">
              No results found for "{search}"
            </Command.Empty>

            {/* Quick Actions Group */}
            <Command.Group heading="IDE Actions" className="text-[10px] font-mono text-[var(--cb-text-muted)] uppercase tracking-wider px-2 py-1">
              <Command.Item
                onSelect={handleRun}
                className="px-2.5 py-2 rounded-[var(--cb-radius-sm)] flex items-center justify-between text-[var(--cb-text-primary)] hover:bg-white/10 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Play size={13} className="text-[var(--cb-accent)]" />
                  <span>Run Pipeline</span>
                </div>
                <kbd className="text-[10px] font-mono text-[var(--cb-text-muted)]">⌘↵</kbd>
              </Command.Item>

              <Command.Item
                onSelect={handleValidate}
                className="px-2.5 py-2 rounded-[var(--cb-radius-sm)] flex items-center justify-between text-[var(--cb-text-primary)] hover:bg-white/10 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Check size={13} className="text-cyan-400" />
                  <span>Validate Graph DAG</span>
                </div>
              </Command.Item>

              <Command.Item
                onSelect={handleFormat}
                className="px-2.5 py-2 rounded-[var(--cb-radius-sm)] flex items-center justify-between text-[var(--cb-text-primary)] hover:bg-white/10 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <LayoutGrid size={13} className="text-purple-400" />
                  <span>Auto-Format Layout</span>
                </div>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  onClose();
                  toggleProperties();
                }}
                className="px-2.5 py-2 rounded-[var(--cb-radius-sm)] flex items-center justify-between text-[var(--cb-text-primary)] hover:bg-white/10 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sliders size={13} className="text-slate-400" />
                  <span>Toggle Properties Inspector</span>
                </div>
                <kbd className="text-[10px] font-mono text-[var(--cb-text-muted)]">⌥P</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  onClose();
                  toggleOutput();
                }}
                className="px-2.5 py-2 rounded-[var(--cb-radius-sm)] flex items-center justify-between text-[var(--cb-text-primary)] hover:bg-white/10 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Terminal size={13} className="text-slate-400" />
                  <span>Toggle Terminal / Output Panel</span>
                </div>
                <kbd className="text-[10px] font-mono text-[var(--cb-text-muted)]">⌥T</kbd>
              </Command.Item>

              {onOpenShortcuts && (
                <Command.Item
                  onSelect={() => {
                    onClose();
                    onOpenShortcuts();
                  }}
                  className="px-2.5 py-2 rounded-[var(--cb-radius-sm)] flex items-center justify-between text-[var(--cb-text-primary)] hover:bg-white/10 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <HelpCircle size={13} className="text-slate-400" />
                    <span>Keyboard Shortcuts Cheat-Sheet</span>
                  </div>
                  <kbd className="text-[10px] font-mono text-[var(--cb-text-muted)]">?</kbd>
                </Command.Item>
              )}
            </Command.Group>

            {/* Blocks Group */}
            <Command.Group heading="Blocks Library" className="text-[10px] font-mono text-[var(--cb-text-muted)] uppercase tracking-wider px-2 py-1 mt-1 border-t border-[var(--cb-border-subtle)]">
              {allBlocks.slice(0, 30).map((block) => (
                <Command.Item
                  key={block.id}
                  onSelect={() => handleAddBlock(block)}
                  className="px-2.5 py-2 rounded-[var(--cb-radius-sm)] flex items-center justify-between text-[var(--cb-text-primary)] hover:bg-white/10 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Boxes size={13} className="text-cyan-400 shrink-0" />
                    <span className="font-medium truncate">{block.name}</span>
                    <span className="text-[10px] text-[var(--cb-text-muted)] truncate">{block.description}</span>
                  </div>
                  <span className="text-[9.5px] font-mono text-[var(--cb-text-muted)] uppercase shrink-0 px-1 py-0.2 rounded bg-white/5">
                    {block.category}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

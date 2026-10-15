import { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Keyboard, X } from "lucide-react";

interface ShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  {
    title: "General & Navigation",
    items: [
      { label: "Command Palette", keys: ["⌘", "K"] },
      { label: "Keyboard Shortcuts Cheat-Sheet", keys: ["?"] },
      { label: "Search Blocks Library", keys: ["/"] },
    ],
  },
  {
    title: "Pipeline & Execution",
    items: [
      { label: "Run Pipeline", keys: ["⌘", "↵"] },
      { label: "Save Project", keys: ["⌘", "S"] },
      { label: "Delete Selected Block / Edge", keys: ["⌫"] },
      { label: "Undo Change", keys: ["⌘", "Z"] },
      { label: "Redo Change", keys: ["⌘", "⇧", "Z"] },
    ],
  },
  {
    title: "Activity Bar & Views",
    items: [
      { label: "Blocks Library", keys: ["⌥", "1"] },
      { label: "Pipeline Outline", keys: ["⌥", "2"] },
      { label: "Custom Blocks Studio", keys: ["⌥", "3"] },
      { label: "Blueprints Gallery", keys: ["⌥", "4"] },
      { label: "Toggle Properties Panel", keys: ["⌥", "P"] },
      { label: "Toggle Terminal / Output", keys: ["⌥", "T"] },
    ],
  },
];

export default function ShortcutsDialog({ isOpen, onClose }: ShortcutsDialogProps) {
  // Global '?' shortcut listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === "?" &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        if (isOpen) onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs animate-in fade-in duration-100" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-full max-w-md bg-[var(--cb-elevation-overlay)] border border-[var(--cb-border-strong)] rounded-[var(--cb-radius-panel)] shadow-[var(--cb-shadow-overlay)] p-5 text-[12px] select-none animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--cb-border-subtle)] mb-4">
            <div className="flex items-center gap-2">
              <Keyboard size={16} className="text-[var(--cb-accent)]" />
              <Dialog.Title className="font-semibold text-white text-[14px]">
                Keyboard Shortcuts
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                className="p-1 rounded-[var(--cb-radius-sm)] text-[var(--cb-text-muted)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {SHORTCUT_GROUPS.map((group) => (
              <div key={group.title} className="space-y-2">
                <div className="text-[10.5px] font-mono text-[var(--cb-text-muted)] uppercase tracking-wider">
                  {group.title}
                </div>
                <div className="space-y-1.5">
                  {group.items.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between py-1 px-2 rounded-[var(--cb-radius-sm)] bg-white/[0.02]"
                    >
                      <span className="text-[var(--cb-text-secondary)]">{item.label}</span>
                      <div className="flex items-center gap-1">
                        {item.keys.map((k, i) => (
                          <kbd
                            key={i}
                            className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-white border border-white/10 shadow-xs"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

import { useEffect } from "react";
import {
  Boxes,
  Compass,
  Code2,
  Sparkles,
  Sliders,
  Terminal,
  HelpCircle,
} from "lucide-react";
import { useUiStore, useWorkflowStore } from "../../stores";
import { useCustomBlockStore } from "../../stores/customBlockStore";
import Tooltip from "../common/Tooltip";

interface LeftRailProps {
  onOpenShortcuts?: () => void;
}

export default function LeftRail({ onOpenShortcuts }: LeftRailProps) {
  const isPaletteOpen = useUiStore((s) => s.isPaletteOpen);
  const activePaletteSection = useUiStore((s) => s.activePaletteSection);
  const setActivePaletteSection = useUiStore((s) => s.setActivePaletteSection);
  const togglePalette = useUiStore((s) => s.togglePalette);

  const isPropertiesOpen = useUiStore((s) => s.isPropertiesOpen);
  const toggleProperties = useUiStore((s) => s.toggleProperties);

  const isOutputOpen = useUiStore((s) => s.isOutputOpen);
  const toggleOutput = useUiStore((s) => s.toggleOutput);

  const isCustomBlockModalOpen = useUiStore((s) => s.isCustomBlockModalOpen);

  const blockCount = Object.keys(useWorkflowStore((s) => s.graph.blocks)).length;
  const customBlockCount = useCustomBlockStore((s) => s.customBlocks.length);

  const handleSectionClick = (section: import("../../stores").PaletteSection) => {
    if (section === "custom" && isCustomBlockModalOpen) {
      useUiStore.getState().closeCustomBlockModal();
      return;
    }
    if (isPaletteOpen && activePaletteSection === section) {
      togglePalette();
    } else {
      setActivePaletteSection(section);
    }
  };

  // Keyboard shortcut listener for activity rail
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.altKey && !e.metaKey && !e.ctrlKey) {
        if (e.key === "1") {
          e.preventDefault();
          handleSectionClick("library");
        } else if (e.key === "2") {
          e.preventDefault();
          handleSectionClick("playground");
        } else if (e.key === "3") {
          e.preventDefault();
          handleSectionClick("custom");
        } else if (e.key === "4") {
          e.preventDefault();
          handleSectionClick("templates");
        } else if (e.key.toLowerCase() === "p") {
          e.preventDefault();
          toggleProperties();
        } else if (e.key.toLowerCase() === "t") {
          e.preventDefault();
          toggleOutput();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPaletteOpen, activePaletteSection, isPropertiesOpen, isOutputOpen, isCustomBlockModalOpen]);

  const isModalActive = isCustomBlockModalOpen;

  const navItems = [
    {
      id: "library" as const,
      label: "Blocks Library",
      shortcut: "⌥1",
      icon: Boxes,
      isActive: !isModalActive && isPaletteOpen && activePaletteSection === "library",
      onClick: () => handleSectionClick("library"),
      badge: null,
    },
    {
      id: "playground" as const,
      label: "Pipeline Outline",
      shortcut: "⌥2",
      icon: Compass,
      isActive: !isModalActive && isPaletteOpen && activePaletteSection === "playground",
      onClick: () => handleSectionClick("playground"),
      badge: blockCount > 0 ? blockCount : null,
    },
    {
      id: "custom" as const,
      label: "Custom Blocks Studio",
      shortcut: "⌥3",
      icon: Code2,
      isActive: isCustomBlockModalOpen || (isPaletteOpen && activePaletteSection === "custom"),
      onClick: () => handleSectionClick("custom"),
      badge: customBlockCount > 0 ? customBlockCount : null,
    },
    {
      id: "templates" as const,
      label: "Example Blueprints",
      shortcut: "⌥4",
      icon: Sparkles,
      isActive: !isModalActive && isPaletteOpen && activePaletteSection === "templates",
      onClick: () => handleSectionClick("templates"),
      badge: null,
    },
  ];

  return (
    <aside
      aria-label="Activity Bar"
      className="w-[var(--cb-rail-width)] bg-[var(--cb-elevation-app)] border-r border-[var(--cb-border-subtle)] flex flex-col items-center justify-between py-2 shrink-0 select-none z-30 h-full"
    >
      {/* Top Section: Primary Views */}
      <div className="flex flex-col items-center gap-1.5 w-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Tooltip key={item.id} content={item.label} shortcut={item.shortcut} side="right">
              <button
                onClick={item.onClick}
                className={`w-9 h-9 rounded-[var(--cb-radius-control)] flex items-center justify-center relative cursor-pointer transition-colors ${
                  item.isActive
                    ? "text-white bg-white/10"
                    : "text-[var(--cb-text-muted)] hover:text-white hover:bg-white/[0.05]"
                }`}
                aria-label={item.label}
                aria-pressed={item.isActive}
              >
                {/* Active indicator bar */}
                {item.isActive && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[var(--cb-accent)] rounded-r" />
                )}
                <Icon size={16} strokeWidth={1.5} />
                {typeof item.badge === "number" && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[var(--cb-elevation-raised)] border border-[var(--cb-border-subtle)] text-[9px] font-mono font-medium text-[var(--cb-text-secondary)] flex items-center justify-center shadow-xs pointer-events-none">
                    {item.badge}
                  </span>
                )}
              </button>
            </Tooltip>
          );
        })}

        <div className="w-5 h-px bg-[var(--cb-border-subtle)] my-1" />

        {/* Panel Toggles: Properties & Terminal (small dot indicator, no full highlight or left bar) */}
        <Tooltip content="Toggle Properties Inspector" shortcut="⌥P" side="right">
          <button
            onClick={toggleProperties}
            className={`w-9 h-9 rounded-[var(--cb-radius-control)] flex items-center justify-center relative cursor-pointer transition-colors ${
              !isModalActive && isPropertiesOpen
                ? "text-[var(--cb-text-primary)] hover:bg-white/[0.05]"
                : "text-[var(--cb-text-muted)] hover:text-white hover:bg-white/[0.05]"
            }`}
            aria-label="Toggle Properties Inspector"
            aria-pressed={!isModalActive && isPropertiesOpen}
          >
            <Sliders size={16} strokeWidth={1.5} />
            {!isModalActive && isPropertiesOpen && (
              <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[var(--cb-accent)]" />
            )}
          </button>
        </Tooltip>

        <Tooltip content="Toggle Terminal / Output" shortcut="⌥T" side="right">
          <button
            onClick={toggleOutput}
            className={`w-9 h-9 rounded-[var(--cb-radius-control)] flex items-center justify-center relative cursor-pointer transition-colors ${
              !isModalActive && isOutputOpen
                ? "text-[var(--cb-text-primary)] hover:bg-white/[0.05]"
                : "text-[var(--cb-text-muted)] hover:text-white hover:bg-white/[0.05]"
            }`}
            aria-label="Toggle Terminal / Output"
            aria-pressed={!isModalActive && isOutputOpen}
          >
            <Terminal size={16} strokeWidth={1.5} />
            {!isModalActive && isOutputOpen && (
              <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[var(--cb-accent)]" />
            )}
          </button>
        </Tooltip>
      </div>

      {/* Bottom Pinned: Settings & Keyboard Shortcuts Help */}
      <div className="flex flex-col items-center gap-1 w-full">
        <Tooltip content="Keyboard Shortcuts & Help" shortcut="?" side="right">
          <button
            onClick={onOpenShortcuts}
            className="w-9 h-9 rounded-[var(--cb-radius-control)] flex items-center justify-center text-[var(--cb-text-muted)] hover:text-white hover:bg-white/[0.05] cursor-pointer transition-colors"
            aria-label="Keyboard Shortcuts & Help"
          >
            <HelpCircle size={18} strokeWidth={1.5} />
          </button>
        </Tooltip>
      </div>
    </aside>
  );
}

import React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

interface TooltipProps {
  content: React.ReactNode;
  shortcut?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  children: React.ReactElement;
  delayDuration?: number;
}

export function Tooltip({
  content,
  shortcut,
  side = "right",
  align = "center",
  children,
  delayDuration = 250,
}: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={6}
            className="z-50 px-2 py-1 text-[11px] font-sans text-[var(--cb-text-primary)] bg-[var(--cb-elevation-overlay)] border border-[var(--cb-border-strong)] rounded-[var(--cb-radius-sm)] shadow-[var(--cb-shadow-tooltip)] flex items-center gap-1.5 select-none animate-in fade-in zoom-in-95 duration-100"
          >
            <span>{content}</span>
            {shortcut && (
              <kbd className="px-1 py-0.2 rounded bg-white/10 font-mono text-[9.5px] text-[var(--cb-text-muted)] border border-white/10">
                {shortcut}
              </kbd>
            )}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export default Tooltip;

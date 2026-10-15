import * as RadixSelect from "@radix-ui/react-select";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  "aria-label"?: string;
}

export default function Select({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  disabled = false,
  className = "",
  triggerClassName = "",
  "aria-label": ariaLabel,
}: SelectProps) {
  return (
    <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <RadixSelect.Trigger
        aria-label={ariaLabel}
        className={`h-8 px-2.5 rounded-[var(--cb-radius-control)] bg-[var(--cb-elevation-raised)] border border-[var(--cb-border-subtle)] hover:border-[var(--cb-border-default)] focus:border-[var(--cb-accent)] focus:ring-1 focus:ring-[var(--cb-accent-ring)] text-[12px] text-[var(--cb-text-primary)] flex items-center justify-between gap-2 outline-none transition-colors cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${triggerClassName} ${className}`}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon asChild>
          <ChevronDown size={13} className="text-[var(--cb-text-muted)] shrink-0" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className="z-[110] min-w-[var(--radix-select-trigger-width)] max-h-60 overflow-y-auto rounded-[var(--cb-radius-control)] bg-[var(--cb-elevation-overlay)] border border-[var(--cb-border-strong)] p-1 shadow-[var(--cb-shadow-overlay)] text-[12px] text-[var(--cb-text-primary)] animate-in fade-in zoom-in-95 duration-100"
        >
          <RadixSelect.Viewport className="p-0.5 space-y-0.5">
            {options.map((opt) => (
              <RadixSelect.Item
                key={opt.value}
                value={opt.value}
                className="relative flex items-center justify-between h-7 px-2.5 rounded-[var(--cb-radius-sm)] text-[12px] text-[var(--cb-text-secondary)] hover:text-white hover:bg-white/10 focus:bg-[var(--cb-accent-subtle)] focus:text-[var(--cb-accent)] outline-none cursor-pointer select-none transition-colors data-[state=checked]:font-semibold data-[state=checked]:text-white"
              >
                <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator>
                  <Check size={12} className="text-[var(--cb-accent)] ml-2" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}

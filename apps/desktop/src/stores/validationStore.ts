import { create } from "zustand";
import type { ValidationResult, ValidationError } from "@codebrix/types";

export interface ValidationState {
  validationResult: ValidationResult | null;
  errorMapByBlockId: Record<string, ValidationError[]>;
  isValidating: boolean;

  setValidationResult: (result: ValidationResult | null) => void;
  setIsValidating: (validating: boolean) => void;
  clearValidation: () => void;
}

export const useValidationStore = create<ValidationState>((set) => ({
  validationResult: null,
  errorMapByBlockId: {},
  isValidating: false,

  setValidationResult: (result: ValidationResult | null) => {
    if (!result) {
      set({ validationResult: null, errorMapByBlockId: {} });
      return;
    }

    const map: Record<string, ValidationError[]> = {};
    for (const err of [...result.errors, ...result.warnings]) {
      if (err.blockId) {
        if (!map[err.blockId]) map[err.blockId] = [];
        map[err.blockId].push(err);
      }
    }

    set({ validationResult: result, errorMapByBlockId: map });
  },

  setIsValidating: (validating: boolean) => set({ isValidating: validating }),

  clearValidation: () => set({ validationResult: null, errorMapByBlockId: {} }),
}));

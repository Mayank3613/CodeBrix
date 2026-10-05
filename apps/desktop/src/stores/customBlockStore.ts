import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { BlockDefinition } from "@codebrix/types";
import { blockRegistry } from "../registry/BlockRegistry.js";
import { getStorageItem, setStorageItem, removeStorageItem } from "../project/storage.js";

export interface CustomBlockState {
  customBlocks: BlockDefinition[];
  customCodeTemplates: Record<string, string>;

  // Actions
  addCustomBlock: (definition: BlockDefinition, pythonCode?: string) => void;
  updateCustomBlock: (id: string, definition: BlockDefinition, pythonCode?: string) => void;
  deleteCustomBlock: (id: string) => void;
  getCustomBlock: (id: string) => BlockDefinition | undefined;
  getPythonCode: (id: string) => string | undefined;
  exportCustomBlockJson: (id: string) => string;
  importCustomBlockJson: (jsonString: string) => BlockDefinition;
  syncWithRegistry: () => void;
}

export const useCustomBlockStore = create<CustomBlockState>()(
  persist(
    (set, get) => ({
      customBlocks: [],
      customCodeTemplates: {},

      addCustomBlock: (definition: BlockDefinition, pythonCode?: string) => {
        const enrichedDef: BlockDefinition = {
          ...definition,
          category: definition.category || "custom",
          tags: Array.from(new Set([...(definition.tags || []), "custom", "user-defined"])),
        };

        // Register in runtime BlockRegistry
        blockRegistry.registerOrUpdate(enrichedDef);

        set((state) => {
          const filtered = state.customBlocks.filter((b) => b.id !== definition.id);
          return {
            customBlocks: [...filtered, enrichedDef],
            customCodeTemplates: pythonCode
              ? { ...state.customCodeTemplates, [definition.id]: pythonCode }
              : state.customCodeTemplates,
          };
        });
      },

      updateCustomBlock: (id: string, definition: BlockDefinition, pythonCode?: string) => {
        const enrichedDef: BlockDefinition = {
          ...definition,
          id, // ensure ID is preserved
          category: definition.category || "custom",
          tags: Array.from(new Set([...(definition.tags || []), "custom", "user-defined"])),
        };

        blockRegistry.registerOrUpdate(enrichedDef);

        set((state) => {
          const updatedBlocks = state.customBlocks.map((b) => (b.id === id ? enrichedDef : b));
          const updatedCodes = { ...state.customCodeTemplates };
          if (pythonCode !== undefined) {
            updatedCodes[id] = pythonCode;
          }
          return {
            customBlocks: updatedBlocks,
            customCodeTemplates: updatedCodes,
          };
        });
      },

      deleteCustomBlock: (id: string) => {
        blockRegistry.unregister(id);

        set((state) => {
          const nextCodes = { ...state.customCodeTemplates };
          delete nextCodes[id];
          return {
            customBlocks: state.customBlocks.filter((b) => b.id !== id),
            customCodeTemplates: nextCodes,
          };
        });
      },

      getCustomBlock: (id: string) => {
        return get().customBlocks.find((b) => b.id === id);
      },

      getPythonCode: (id: string) => {
        return get().customCodeTemplates[id];
      },

      exportCustomBlockJson: (id: string) => {
        const block = get().customBlocks.find((b) => b.id === id);
        if (!block) {
          throw new Error(`Custom block "${id}" not found.`);
        }
        const pythonCode = get().customCodeTemplates[id] || "";
        const payload = {
          codebrixCustomBlockVersion: "1.0.0",
          definition: block,
          pythonCode,
          exportedAt: new Date().toISOString(),
        };
        return JSON.stringify(payload, null, 2);
      },

      importCustomBlockJson: (jsonString: string) => {
        const parsed = JSON.parse(jsonString);
        const def: BlockDefinition = parsed.definition || parsed;
        const code: string | undefined = parsed.pythonCode || def.configSchema?.code?.defaultValue as string | undefined;

        if (!def.id || !def.name || !def.inputs || !def.outputs) {
          throw new Error("Invalid custom block JSON: missing id, name, inputs, or outputs.");
        }

        get().addCustomBlock(def, code);
        return def;
      },

      syncWithRegistry: () => {
        const blocks = get().customBlocks;
        for (const block of blocks) {
          blockRegistry.registerOrUpdate(block);
        }
      },
    }),
    {
      name: "codebrix_custom_blocks",
      storage: createJSONStorage(() => ({
        getItem: (name: string) => getStorageItem(name),
        setItem: (name: string, value: string) => setStorageItem(name, value),
        removeItem: (name: string) => removeStorageItem(name),
      })),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.syncWithRegistry();
        }
      },
    }
  )
);

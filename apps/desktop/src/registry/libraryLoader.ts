import { blockRegistry } from "./BlockRegistry.js";
import { isValidLibraryManifest } from "@codebrix/shared";
import type { LibraryManifest, BlockDefinition } from "@codebrix/types";
import { useLibraryStore, type LoadedLibrary } from "../stores/libraryStore.js";

import {
  variablesBlockDefinition,
  conditionsBlockDefinition,
} from "@codebrix/library-core";
import {
  csvBlockDefinition,
  jsonBlockDefinition,
  excelBlockDefinition,
  scalingBlockDefinition,
  encodingBlockDefinition,
} from "@codebrix/library-data";

function isTauri(): boolean {
  return typeof window !== "undefined" && Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

interface RawTauriLibraryInfo {
  name: string;
  version: string;
  description: string;
  author?: string;
  blocks: string[];
  path: string;
  manifest_path: string;
  is_valid: boolean;
  error?: string;
}

const BUILT_IN_MANIFESTS: Record<string, { manifest: LibraryManifest; blocks: BlockDefinition[] }> = {
  core: {
    manifest: {
      name: "core",
      version: "0.1.0",
      description: "CodeBrix core blocks (Variables, Conditions, Logic)",
      author: "Developer 1",
      blocks: ["blocks/variables/block.js", "blocks/conditions/block.js"],
    },
    blocks: [variablesBlockDefinition, conditionsBlockDefinition],
  },
  data: {
    manifest: {
      name: "data",
      version: "0.1.0",
      description: "CodeBrix data processing blocks (CSV, JSON, Excel, Scaling, Encoding)",
      author: "Developer 1",
      blocks: [
        "blocks/csv/block.js",
        "blocks/json/block.js",
        "blocks/excel/block.js",
        "blocks/scaling/block.js",
        "blocks/encoding/block.js",
      ],
    },
    blocks: [
      csvBlockDefinition,
      jsonBlockDefinition,
      excelBlockDefinition,
      scalingBlockDefinition,
      encodingBlockDefinition,
    ],
  },
  "scikit-learn": {
    manifest: {
      name: "scikit-learn",
      version: "0.1.0",
      description: "CodeBrix Scikit-Learn ML blocks (Split, RF, Linear, Decision Tree, KNN, Predict, Accuracy)",
      author: "Developer 2",
      blocks: [
        "blocks/train_test_split/block.js",
        "blocks/random_forest_classifier/block.js",
        "blocks/predict/block.js",
        "blocks/accuracy/block.js",
      ],
    },
    blocks: [
      {
        id: "ml.train_test_split",
        name: "Train/Test Split",
        category: "preprocessing",
        version: "0.1.0",
        description: "Splits dataset arrays or matrices into random train and test subsets.",
        inputs: [{ id: "dataset_in", name: "Dataset", type: "dataframe", direction: "input" }],
        outputs: [
          { id: "train_data_out", name: "Train Data", type: "dataframe", direction: "output" },
          { id: "test_data_out", name: "Test Data", type: "dataframe", direction: "output" },
          { id: "y_test_out", name: "Ground Truth", type: "series", direction: "output" },
        ],
        configSchema: {
          test_size: { name: "test_size", label: "Test Size", type: "number", defaultValue: 0.2, min: 0.05, max: 0.95 },
          random_state: { name: "random_state", label: "Random Seed", type: "number", defaultValue: 42 },
          target_column: { name: "target_column", label: "Target Column", type: "string", defaultValue: "species" },
        },
      },
      {
        id: "ml.random_forest_classifier",
        name: "Random Forest Classifier",
        category: "ml",
        version: "0.1.0",
        description: "Fits random forest ensemble classification trees.",
        inputs: [{ id: "train_data_in", name: "Train Data", type: "dataframe", direction: "input" }],
        outputs: [{ id: "model_out", name: "Model", type: "model", direction: "output" }],
        configSchema: {
          n_estimators: { name: "n_estimators", label: "Estimators", type: "number", defaultValue: 100, min: 1, max: 1000 },
          random_state: { name: "random_state", label: "Random Seed", type: "number", defaultValue: 42 },
        },
      },
      {
        id: "ml.predict",
        name: "Model Predictor",
        category: "ml",
        version: "0.1.0",
        description: "Generates predictions from a trained estimator on test inputs.",
        inputs: [
          { id: "model_in", name: "Trained Model", type: "model", direction: "input" },
          { id: "test_data_in", name: "Test Features", type: "dataframe", direction: "input" },
        ],
        outputs: [{ id: "predictions_out", name: "Predictions", type: "series", direction: "output" }],
        configSchema: {},
      },
      {
        id: "eval.accuracy",
        name: "Accuracy Score",
        category: "evaluation",
        version: "0.1.0",
        description: "Calculates subset accuracy classification score.",
        inputs: [
          { id: "predictions_in", name: "Predictions", type: "series", direction: "input" },
          { id: "ground_truth_in", name: "Ground Truth", type: "series", direction: "input" },
        ],
        outputs: [{ id: "score_out", name: "Score", type: "scalar", direction: "output" }],
        configSchema: {},
      },
    ],
  },
  visualization: {
    manifest: {
      name: "visualization",
      version: "0.1.0",
      description: "CodeBrix visualization blocks (Plotly, Confusion Matrix, Feature Importance)",
      author: "Developer 2",
      blocks: ["blocks/confusion_matrix/block.js"],
    },
    blocks: [
      {
        id: "eval.confusion_matrix",
        name: "Confusion Matrix",
        category: "visualization",
        version: "0.1.0",
        description: "Computes and plots multiclass confusion matrix.",
        inputs: [
          { id: "predictions_in", name: "Predictions", type: "series", direction: "input" },
          { id: "ground_truth_in", name: "Ground Truth", type: "series", direction: "input" },
        ],
        outputs: [{ id: "matrix_out", name: "Matrix Plot", type: "figure", direction: "output" }],
        configSchema: {},
      },
    ],
  },
};

/**
 * Discovers and loads libraries from disk (or built-in definitions),
 * registers all their blocks, and populates the libraryStore.
 */
export async function discoverAndLoadLibraries(): Promise<LoadedLibrary[]> {
  const store = useLibraryStore.getState();
  store.setLoading(true);

  const loadedList: LoadedLibrary[] = [];

  // Register built-in block definitions directly into blockRegistry
  for (const [libKey, libData] of Object.entries(BUILT_IN_MANIFESTS)) {
    const blockIds: string[] = [];
    for (const b of libData.blocks) {
      if (!blockRegistry.has(b.id)) {
        blockRegistry.register(b);
      }
      blockIds.push(b.id);
    }

    loadedList.push({
      manifest: libData.manifest,
      path: `libraries/${libKey}`,
      manifestPath: `libraries/${libKey}/library.json`,
      isBuiltIn: true,
      enabled: true,
      isValid: true,
      blockIds,
    });
  }

  // If running inside native Tauri, query discover_libraries
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const diskLibs = await invoke<RawTauriLibraryInfo[]>("list_libraries", {});

      for (const dLib of diskLibs) {
        if (!dLib.is_valid) {
          store.addWarning(
            `Skipping invalid library in '${dLib.path}': ${dLib.error ?? "Invalid manifest"}`
          );
          continue;
        }

        const existing = loadedList.find((l) => l.manifest.name === dLib.name);
        if (existing) {
          existing.path = dLib.path;
          existing.manifestPath = dLib.manifest_path;
        } else {
          // New library discovered on disk
          loadedList.push({
            manifest: {
              name: dLib.name,
              version: dLib.version,
              description: dLib.description,
              author: dLib.author,
              blocks: dLib.blocks,
            },
            path: dLib.path,
            manifestPath: dLib.manifest_path,
            isBuiltIn: false,
            enabled: true,
            isValid: true,
            blockIds: [],
          });
        }
      }
    } catch (err) {
      console.warn("Could not discover libraries via Tauri command, using built-ins:", err);
    }
  }

  store.setLibraries(loadedList);
  store.setLoading(false);
  return loadedList;
}

/**
 * Validate and import a custom library from raw manifest JSON.
 */
export function importLibraryManifest(
  rawJson: string,
  sourcePath = "custom"
): { success: boolean; library?: LoadedLibrary; error?: string } {
  const store = useLibraryStore.getState();

  try {
    const parsed = JSON.parse(rawJson);
    if (!isValidLibraryManifest(parsed)) {
      const errorMsg = "Manifest does not conform to LibraryManifest schema (missing required fields or invalid types).";
      store.addWarning(`Failed to import library: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

    const registeredBlockIds: string[] = [];
    for (const bEntry of parsed.blocks) {
      let blockId = bEntry;
      if (bEntry.includes("/")) {
        const parts = bEntry.split("/");
        const namePart = parts[parts.length - 2] || parts[parts.length - 1].replace(/\.[^/.]+$/, "");
        blockId = `${parsed.name}.${namePart}`;
      }

      if (!blockRegistry.has(blockId)) {
        const blockName = blockId
          .split(".")
          .pop()!
          .split("_")
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(" ");

        blockRegistry.register({
          id: blockId,
          name: blockName,
          category: "custom",
          version: parsed.version || "0.1.0",
          description: `Custom block from library '${parsed.name}' (${bEntry})`,
          inputs: [{ id: "in", name: "Input", type: "any", direction: "input" }],
          outputs: [{ id: "out", name: "Output", type: "any", direction: "output" }],
          configSchema: {},
          tags: ["custom", parsed.name],
        });
      }
      registeredBlockIds.push(blockId);
    }

    const loaded: LoadedLibrary = {
      manifest: parsed,
      path: sourcePath,
      manifestPath: sourcePath.endsWith("library.json") ? sourcePath : `${sourcePath}/library.json`,
      isBuiltIn: false,
      enabled: true,
      isValid: true,
      blockIds: registeredBlockIds,
    };

    store.addLibrary(loaded);
    return { success: true, library: loaded };
  } catch (e) {
    const errorMsg = `Invalid JSON syntax: ${(e as Error).message}`;
    store.addWarning(`Failed to import library: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

/**
 * File I/O service providing seamless desktop Tauri commands with browser fallback.
 *
 * Phase 6 (D1-6.2): All paths are normalized before storage and converted
 * to platform-native format before OS file operations.
 */

import { normalizePath, ensureCbxExtension, validatePathSafety } from "./crossPlatformPaths.js";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

function isTauri(): boolean {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
}

/**
 * Read a project file from disk.
 * The path is passed through as-is to the Rust backend which handles
 * its own cross-platform normalization.
 */
export async function readProjectFile(path: string): Promise<string> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<string>("read_file", { path });
  }

  throw new Error("Direct file path reading is only supported in native desktop mode.");
}

/**
 * Write a project file to disk.
 * The path is validated and passed to the Rust backend.
 */
export async function writeProjectFile(path: string, contents: string): Promise<void> {
  const pathError = validatePathSafety(path);
  if (pathError) {
    throw new Error(`Cannot write to path: ${pathError}`);
  }

  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<void>("write_file", { path, contents });
  }

  throw new Error("Direct file path writing is only supported in native desktop mode.");
}

/**
 * Opens a file picker to select and read a .cbx file.
 * Returns a normalized (forward-slash) path for cross-platform storage.
 */
export async function openProjectFileDialog(): Promise<{ content: string; path?: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".cbx,application/json";

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        resolve({
          content: text,
          // Normalize the path for portable storage in recent-projects list
          path: normalizePath(file.name),
        });
      };
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };

    input.click();
  });
}

/**
 * Saves project contents, using browser download fallback if not running on desktop.
 * Ensures the filename always has the .cbx extension.
 */
export async function saveProjectFileDialog(
  content: string,
  preferredName = "project.cbx"
): Promise<{ success: boolean; path?: string }> {
  try {
    // Ensure .cbx extension on the filename
    const safeName = ensureCbxExtension(preferredName);

    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = safeName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: true, path: normalizePath(a.download) };
  } catch (err) {
    console.error("Save project failed:", err);
    return { success: false };
  }
}

/**
 * File I/O service providing seamless desktop Tauri commands with browser fallback.
 */

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

function isTauri(): boolean {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
}

export async function readProjectFile(path: string): Promise<string> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<string>("read_file", { path });
  }

  throw new Error("Direct file path reading is only supported in native desktop mode.");
}

export async function writeProjectFile(path: string, contents: string): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<void>("write_file", { path, contents });
  }

  throw new Error("Direct file path writing is only supported in native desktop mode.");
}

/**
 * Opens a file picker to select and read a .cbx file.
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
          path: file.name,
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
 */
export async function saveProjectFileDialog(
  content: string,
  preferredName = "project.cbx"
): Promise<{ success: boolean; path?: string }> {
  try {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = preferredName.endsWith(".cbx") ? preferredName : `${preferredName}.cbx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: true, path: a.download };
  } catch (err) {
    console.error("Save project failed:", err);
    return { success: false };
  }
}

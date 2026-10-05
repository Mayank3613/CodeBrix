/**
 * Cross-platform path utilities for CodeBrix.
 *
 * Provides path normalization, separator handling, and validation
 * to ensure .cbx project files, recent-project entries, autosave
 * locations, and file dialog paths work correctly across Windows,
 * macOS, and Linux.
 *
 * @module crossPlatformPaths
 */

/**
 * Normalizes a file path to use forward slashes as the universal separator.
 * This ensures paths serialized into .cbx project files on Windows can be
 * opened on macOS/Linux and vice versa.
 *
 * Also collapses repeated separators (e.g. `foo//bar` → `foo/bar`) and
 * trims trailing slashes (except for root paths like `/` or `C:/`).
 */
export function normalizePath(filePath: string): string {
  if (!filePath) return filePath;

  // Replace all backslashes with forward slashes
  let normalized = filePath.replace(/\\/g, "/");

  // Collapse repeated slashes (but preserve protocol-style `://`)
  normalized = normalized.replace(/([^:])\/+/g, "$1/");

  // Trim trailing slash unless it's a root path (/, C:/)
  if (normalized.length > 1 && normalized.endsWith("/") && !normalized.match(/^[A-Za-z]:\/$/)) {
    normalized = normalized.replace(/\/+$/, "");
  }

  return normalized;
}

/**
 * Converts a universal (forward-slash) path back to the platform-native
 * format. Use this just before passing a path to OS file APIs in Tauri
 * commands or Node.js fs calls.
 *
 * @param filePath  The universalized path from .cbx / storage
 * @param platform  Override for testing — defaults to runtime detection
 */
export function toPlatformPath(filePath: string, platform?: string): string {
  if (!filePath) return filePath;

  const os = platform ?? detectPlatform();

  if (os === "windows") {
    return filePath.replace(/\//g, "\\");
  }

  return filePath;
}

/**
 * Checks whether a path contains characters that are unsafe or problematic
 * on specific operating systems.
 *
 * Returns `null` if the path is safe, or a human-readable error string
 * explaining the issue.
 */
export function validatePathSafety(filePath: string): string | null {
  if (!filePath || filePath.trim().length === 0) {
    return "Path is empty";
  }

  // Check for null bytes (all OSes)
  if (filePath.includes("\0")) {
    return "Path contains null bytes";
  }

  // Check for Windows-reserved characters in filename portion
  const basename = getBasename(filePath);
  if (/[<>"|?*]/.test(basename)) {
    return `Filename contains characters not allowed on Windows: ${basename}`;
  }

  // Check for Windows-reserved names
  const nameWithoutExt = basename.replace(/\.[^.]+$/, "").toUpperCase();
  const reserved = [
    "CON", "PRN", "AUX", "NUL",
    "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
    "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
  ];
  if (reserved.includes(nameWithoutExt)) {
    return `Filename "${basename}" is a reserved name on Windows`;
  }

  // Check for trailing dots or spaces in filename (Windows-specific issue)
  if (basename.endsWith(".") || basename.endsWith(" ")) {
    return `Filename must not end with dots or spaces on Windows: "${basename}"`;
  }

  return null;
}

/**
 * Extracts the filename (with extension) from a path, handling both
 * forward-slash and backslash separators.
 */
export function getBasename(filePath: string): string {
  if (!filePath) return "";
  const normalized = filePath.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || "";
}

/**
 * Extracts the directory portion of a path, handling both separators.
 */
export function getDirname(filePath: string): string {
  if (!filePath) return "";
  const normalized = filePath.replace(/\\/g, "/");
  const lastSlash = normalized.lastIndexOf("/");
  if (lastSlash < 0) return "";
  return normalized.substring(0, lastSlash) || "/";
}

/**
 * Joins path segments with forward slashes, normalizing the result.
 */
export function joinPaths(...segments: string[]): string {
  const joined = segments
    .filter(Boolean)
    .join("/");
  return normalizePath(joined);
}

/**
 * Ensures a file path has the `.cbx` extension.
 */
export function ensureCbxExtension(filePath: string): string {
  if (!filePath) return filePath;
  const normalized = normalizePath(filePath);
  if (normalized.toLowerCase().endsWith(".cbx")) {
    return normalized;
  }
  return `${normalized}.cbx`;
}

/**
 * Extracts a project name from a file path by stripping the directory
 * and extension. Handles both separators and non-ASCII filenames.
 */
export function projectNameFromPath(filePath: string): string {
  const base = getBasename(filePath);
  if (!base) return "Untitled Project";
  // Remove .cbx extension
  return base.replace(/\.cbx$/i, "") || "Untitled Project";
}

/**
 * Tests whether a string appears to be an absolute path on any OS.
 */
export function isAbsolutePath(filePath: string): boolean {
  if (!filePath) return false;
  // Unix absolute: starts with /
  if (filePath.startsWith("/")) return true;
  // Windows absolute: starts with drive letter (C:\ or C:/)
  if (/^[A-Za-z]:[/\\]/.test(filePath)) return true;
  // UNC path: \\server\share
  if (filePath.startsWith("\\\\")) return true;
  return false;
}

/**
 * Creates a portable relative path from a base directory to a target file.
 * Always uses forward slashes in the result.
 */
export function makeRelative(basePath: string, targetPath: string): string {
  const base = normalizePath(basePath).split("/").filter(Boolean);
  const target = normalizePath(targetPath).split("/").filter(Boolean);

  // Find common prefix length
  let commonLen = 0;
  while (commonLen < base.length && commonLen < target.length && base[commonLen] === target[commonLen]) {
    commonLen++;
  }

  // Go up from base, then down into target
  const ups = base.length - commonLen;
  const downs = target.slice(commonLen);

  const parts = [...Array(ups).fill(".."), ...downs];
  return parts.join("/") || ".";
}

// ─── Internal helpers ────────────────────────────────────────────────────

function detectPlatform(): "windows" | "macos" | "linux" {
  // Browser environment: check navigator
  if (typeof navigator !== "undefined" && navigator.platform) {
    const plat = navigator.platform.toLowerCase();
    if (plat.includes("win")) return "windows";
    if (plat.includes("mac")) return "macos";
    return "linux";
  }

  // Node.js environment
  if (typeof process !== "undefined" && process.platform) {
    if (process.platform === "win32") return "windows";
    if (process.platform === "darwin") return "macos";
    return "linux";
  }

  return "linux"; // default fallback
}

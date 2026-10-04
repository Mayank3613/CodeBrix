/**
 * Safe cross-platform and SSR/Node-safe key-value storage.
 */
const memoryStorage = new Map<string, string>();

export const STORAGE_KEYS = {
  AUTOSAVE: "codebrix_autosave_recovery",
  RECENT_PROJECTS: "codebrix_recent_projects",
} as const;

export function getStorageItem(key: string): string | null {
  try {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(key);
    }
  } catch {
    // fallback
  }
  return memoryStorage.get(key) ?? null;
}

export function setStorageItem(key: string, val: string): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, val);
      return;
    }
  } catch {
    // fallback
  }
  memoryStorage.set(key, val);
}

export function removeStorageItem(key: string): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(key);
      return;
    }
  } catch {
    // fallback
  }
  memoryStorage.delete(key);
}

export function clearAllStorage(): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  } catch {
    // fallback
  }
  memoryStorage.clear();
}

/**
 * Load persisted recent projects from storage.
 */
export function loadPersistedRecentProjects(): string[] {
  const raw = getStorageItem(STORAGE_KEYS.RECENT_PROJECTS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Persist recent projects to storage.
 */
export function persistRecentProjects(recent: string[]): void {
  setStorageItem(STORAGE_KEYS.RECENT_PROJECTS, JSON.stringify(recent.slice(0, 10)));
}

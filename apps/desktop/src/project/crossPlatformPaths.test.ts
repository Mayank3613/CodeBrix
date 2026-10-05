/**
 * Cross-platform path utility tests.
 *
 * Phase 6 – D1-6.2: Verifies path separator normalization, spaces,
 * non-ASCII characters, .cbx extension handling, and portability across
 * Windows, macOS, and Linux.
 */
import { describe, it, expect } from "vitest";
import {
  normalizePath,
  toPlatformPath,
  validatePathSafety,
  getBasename,
  getDirname,
  joinPaths,
  ensureCbxExtension,
  projectNameFromPath,
  isAbsolutePath,
  makeRelative,
} from "./crossPlatformPaths";

describe("Cross-Platform Path Utilities (D1-6.2)", () => {
  // ── normalizePath ──────────────────────────────────────────────

  describe("normalizePath", () => {
    it("converts backslashes to forward slashes", () => {
      expect(normalizePath("C:\\Users\\dev\\project.cbx")).toBe(
        "C:/Users/dev/project.cbx"
      );
    });

    it("handles mixed separators", () => {
      expect(normalizePath("C:\\Users/dev\\project/file.cbx")).toBe(
        "C:/Users/dev/project/file.cbx"
      );
    });

    it("collapses repeated slashes", () => {
      expect(normalizePath("/home//user///projects/test.cbx")).toBe(
        "/home/user/projects/test.cbx"
      );
    });

    it("trims trailing slashes", () => {
      expect(normalizePath("/home/user/projects/")).toBe(
        "/home/user/projects"
      );
    });

    it("preserves root paths", () => {
      expect(normalizePath("/")).toBe("/");
      expect(normalizePath("C:/")).toBe("C:/");
    });

    it("returns empty string for empty input", () => {
      expect(normalizePath("")).toBe("");
    });

    it("handles already-normalized Unix paths", () => {
      expect(normalizePath("/Users/dev/project.cbx")).toBe(
        "/Users/dev/project.cbx"
      );
    });

    it("handles UNC paths", () => {
      expect(normalizePath("\\\\server\\share\\file.cbx")).toBe(
        "//server/share/file.cbx"
      );
    });
  });

  // ── toPlatformPath ─────────────────────────────────────────────

  describe("toPlatformPath", () => {
    it("converts to backslashes for Windows", () => {
      expect(toPlatformPath("C:/Users/dev/project.cbx", "windows")).toBe(
        "C:\\Users\\dev\\project.cbx"
      );
    });

    it("leaves Unix paths unchanged for macOS", () => {
      expect(toPlatformPath("/Users/dev/project.cbx", "macos")).toBe(
        "/Users/dev/project.cbx"
      );
    });

    it("leaves Unix paths unchanged for Linux", () => {
      expect(toPlatformPath("/home/dev/project.cbx", "linux")).toBe(
        "/home/dev/project.cbx"
      );
    });

    it("returns empty for empty input", () => {
      expect(toPlatformPath("", "windows")).toBe("");
    });
  });

  // ── Paths with spaces ─────────────────────────────────────────

  describe("paths with spaces", () => {
    it("normalizes Windows paths with spaces", () => {
      expect(normalizePath("C:\\Program Files\\My App\\project.cbx")).toBe(
        "C:/Program Files/My App/project.cbx"
      );
    });

    it("round-trips spaced paths through normalize → toPlatform", () => {
      const winPath = "C:\\Documents and Settings\\User\\My Projects\\test.cbx";
      const normalized = normalizePath(winPath);
      const restored = toPlatformPath(normalized, "windows");
      expect(restored).toBe("C:\\Documents and Settings\\User\\My Projects\\test.cbx");
    });

    it("preserves spaces in basename extraction", () => {
      expect(getBasename("/home/user/My Project Files/my project.cbx")).toBe(
        "my project.cbx"
      );
    });
  });

  // ── Paths with non-ASCII characters ───────────────────────────

  describe("paths with non-ASCII characters", () => {
    it("handles Japanese characters in paths", () => {
      const path = "/Users/ユーザー/プロジェクト/テスト.cbx";
      expect(normalizePath(path)).toBe(path);
      expect(getBasename(path)).toBe("テスト.cbx");
      expect(projectNameFromPath(path)).toBe("テスト");
    });

    it("handles Chinese characters in paths", () => {
      const path = "C:\\用户\\项目\\机器学习.cbx";
      expect(normalizePath(path)).toBe("C:/用户/项目/机器学习.cbx");
      expect(getBasename(path)).toBe("机器学习.cbx");
    });

    it("handles Korean characters in paths", () => {
      expect(normalizePath("/home/사용자/프로젝트.cbx")).toBe(
        "/home/사용자/프로젝트.cbx"
      );
    });

    it("handles accented Latin characters", () => {
      const path = "/Users/André/projets/données.cbx";
      expect(normalizePath(path)).toBe(path);
      expect(projectNameFromPath(path)).toBe("données");
    });

    it("handles emoji in paths (edge case)", () => {
      const path = "/Users/dev/🚀 Project/test.cbx";
      expect(normalizePath(path)).toBe(path);
      expect(getBasename(path)).toBe("test.cbx");
    });

    it("handles Arabic / Hebrew RTL characters", () => {
      const path = "/home/مستخدم/مشروع.cbx";
      expect(normalizePath(path)).toBe(path);
      expect(projectNameFromPath(path)).toBe("مشروع");
    });
  });

  // ── validatePathSafety ─────────────────────────────────────────

  describe("validatePathSafety", () => {
    it("returns null for safe paths", () => {
      expect(validatePathSafety("/home/user/project.cbx")).toBeNull();
      expect(validatePathSafety("C:/Users/dev/my project.cbx")).toBeNull();
    });

    it("rejects empty paths", () => {
      expect(validatePathSafety("")).toBe("Path is empty");
      expect(validatePathSafety("   ")).toBe("Path is empty");
    });

    it("rejects null bytes", () => {
      expect(validatePathSafety("/home/user/bad\0file.cbx")).toBe(
        "Path contains null bytes"
      );
    });

    it("rejects Windows-reserved characters in filename", () => {
      const result = validatePathSafety("/home/user/file<name>.cbx");
      expect(result).toContain("not allowed on Windows");
    });

    it("rejects Windows-reserved filenames", () => {
      expect(validatePathSafety("/home/user/CON.cbx")).toContain("reserved name");
      expect(validatePathSafety("C:/Users/NUL.cbx")).toContain("reserved name");
      expect(validatePathSafety("/test/COM1.cbx")).toContain("reserved name");
    });

    it("rejects filenames ending with dots", () => {
      const result = validatePathSafety("/home/user/file..cbx.");
      expect(result).toContain("must not end with dots");
    });

    it("allows non-ASCII filenames", () => {
      expect(validatePathSafety("/home/user/データ.cbx")).toBeNull();
      expect(validatePathSafety("C:/Users/café/résumé.cbx")).toBeNull();
    });
  });

  // ── getBasename / getDirname ──────────────────────────────────

  describe("getBasename", () => {
    it("extracts filename from Unix path", () => {
      expect(getBasename("/Users/dev/project.cbx")).toBe("project.cbx");
    });

    it("extracts filename from Windows path", () => {
      expect(getBasename("C:\\Users\\dev\\project.cbx")).toBe("project.cbx");
    });

    it("returns the path itself when no separator", () => {
      expect(getBasename("project.cbx")).toBe("project.cbx");
    });

    it("returns empty for empty input", () => {
      expect(getBasename("")).toBe("");
    });
  });

  describe("getDirname", () => {
    it("extracts directory from Unix path", () => {
      expect(getDirname("/Users/dev/project.cbx")).toBe("/Users/dev");
    });

    it("extracts directory from Windows path", () => {
      expect(getDirname("C:\\Users\\dev\\project.cbx")).toBe("C:/Users/dev");
    });

    it("returns empty when no directory", () => {
      expect(getDirname("project.cbx")).toBe("");
    });
  });

  // ── joinPaths ──────────────────────────────────────────────────

  describe("joinPaths", () => {
    it("joins segments with forward slashes", () => {
      expect(joinPaths("/home", "user", "projects", "file.cbx")).toBe(
        "/home/user/projects/file.cbx"
      );
    });

    it("handles Windows-style segments", () => {
      expect(joinPaths("C:\\Users", "dev", "project.cbx")).toBe(
        "C:/Users/dev/project.cbx"
      );
    });

    it("filters empty segments", () => {
      expect(joinPaths("/home", "", "user", "", "project.cbx")).toBe(
        "/home/user/project.cbx"
      );
    });
  });

  // ── ensureCbxExtension ────────────────────────────────────────

  describe("ensureCbxExtension", () => {
    it("adds .cbx when missing", () => {
      expect(ensureCbxExtension("/home/user/project")).toBe(
        "/home/user/project.cbx"
      );
    });

    it("does not double-add .cbx", () => {
      expect(ensureCbxExtension("/home/user/project.cbx")).toBe(
        "/home/user/project.cbx"
      );
    });

    it("is case-insensitive for existing .cbx", () => {
      expect(ensureCbxExtension("/home/user/project.CBX")).toBe(
        "/home/user/project.CBX"
      );
    });

    it("normalizes path when adding extension", () => {
      expect(ensureCbxExtension("C:\\Users\\dev\\project")).toBe(
        "C:/Users/dev/project.cbx"
      );
    });
  });

  // ── projectNameFromPath ───────────────────────────────────────

  describe("projectNameFromPath", () => {
    it("strips directory and extension", () => {
      expect(projectNameFromPath("/home/user/Iris Pipeline.cbx")).toBe(
        "Iris Pipeline"
      );
    });

    it("handles Windows paths", () => {
      expect(projectNameFromPath("C:\\Users\\dev\\My Project.cbx")).toBe(
        "My Project"
      );
    });

    it("returns 'Untitled Project' for empty path", () => {
      expect(projectNameFromPath("")).toBe("Untitled Project");
    });

    it("handles files without .cbx extension", () => {
      expect(projectNameFromPath("/home/user/data.json")).toBe("data.json");
    });
  });

  // ── isAbsolutePath ────────────────────────────────────────────

  describe("isAbsolutePath", () => {
    it("detects Unix absolute paths", () => {
      expect(isAbsolutePath("/home/user/project.cbx")).toBe(true);
    });

    it("detects Windows absolute paths", () => {
      expect(isAbsolutePath("C:/Users/dev/project.cbx")).toBe(true);
      expect(isAbsolutePath("C:\\Users\\dev\\project.cbx")).toBe(true);
    });

    it("detects UNC paths", () => {
      expect(isAbsolutePath("\\\\server\\share\\file.cbx")).toBe(true);
    });

    it("rejects relative paths", () => {
      expect(isAbsolutePath("project.cbx")).toBe(false);
      expect(isAbsolutePath("./project.cbx")).toBe(false);
      expect(isAbsolutePath("../project.cbx")).toBe(false);
    });

    it("returns false for empty", () => {
      expect(isAbsolutePath("")).toBe(false);
    });
  });

  // ── makeRelative ──────────────────────────────────────────────

  describe("makeRelative", () => {
    it("creates relative path from base to target", () => {
      expect(makeRelative("/home/user/projects", "/home/user/projects/file.cbx")).toBe(
        "file.cbx"
      );
    });

    it("goes up directories when needed", () => {
      expect(makeRelative("/home/user/projects/a", "/home/user/projects/b/file.cbx")).toBe(
        "../b/file.cbx"
      );
    });

    it("handles same directory", () => {
      expect(makeRelative("/home/user", "/home/user")).toBe(".");
    });
  });

  // ── .cbx cross-OS portability round-trip ──────────────────────

  describe(".cbx portability round-trip", () => {
    it("Windows path → normalize → use on macOS → re-export to Windows", () => {
      const windowsOriginal = "C:\\Users\\dev\\My Projects\\iris pipeline.cbx";

      // Save into .cbx: normalize for storage
      const stored = normalizePath(windowsOriginal);
      expect(stored).toBe("C:/Users/dev/My Projects/iris pipeline.cbx");

      // Open on macOS: path is already forward-slash, works directly
      expect(getBasename(stored)).toBe("iris pipeline.cbx");
      expect(projectNameFromPath(stored)).toBe("iris pipeline");

      // Re-export to Windows: convert back
      const windowsRestored = toPlatformPath(stored, "windows");
      expect(windowsRestored).toBe(windowsOriginal);
    });

    it("macOS path → normalize → use on Windows → re-export to macOS", () => {
      const macOriginal = "/Users/dev/Documents/My Projects/données.cbx";

      const stored = normalizePath(macOriginal);
      expect(stored).toBe(macOriginal);

      // Use on Windows: convert
      const winPath = toPlatformPath(stored, "windows");
      expect(winPath).toContain("\\");

      // Re-normalize from Windows
      const reNormalized = normalizePath(winPath);
      expect(reNormalized).toBe(macOriginal);
    });

    it("validates the path before saving", () => {
      expect(validatePathSafety("/Users/dev/normal project.cbx")).toBeNull();
      expect(validatePathSafety("/Users/dev/CON.cbx")).not.toBeNull();
    });
  });
});

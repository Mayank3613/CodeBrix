import { describe, it, expect } from "vitest";
import { PythonDetector } from "../python-detector.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../../../");

describe("PythonDetector", () => {
  it("should detect a valid Python 3.11+ environment in the workspace", () => {
    const detector = new PythonDetector(rootDir);
    const env = detector.detect();

    expect(env.executable).toBeTruthy();
    expect(env.version).toMatch(/^3\.\d+/);
    expect(Number(env.version.split(".")[0])).toBe(3);
    expect(Number(env.version.split(".")[1])).toBeGreaterThanOrEqual(11);
    expect(env.cwd).toBe(rootDir);
  });
});

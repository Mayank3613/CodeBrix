import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Iris CSV Fixture", () => {
  const csvPath = path.resolve(__dirname, "./iris.csv");

  it("should exist and have correct file permissions", () => {
    expect(fs.existsSync(csvPath)).toBe(true);
  });

  it("should contain exactly 150 data rows plus 1 header row", () => {
    const content = fs.readFileSync(csvPath, "utf-8").trim();
    const lines = content.split(/\r?\n/);
    expect(lines).toHaveLength(151);

    const header = lines[0]?.split(",");
    expect(header).toEqual([
      "sepal_length",
      "sepal_width",
      "petal_length",
      "petal_width",
      "species",
    ]);

    const speciesCounts: Record<string, number> = {};
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i]?.split(",");
      expect(parts).toHaveLength(5);
      const sp = parts?.[4] ?? "";
      speciesCounts[sp] = (speciesCounts[sp] || 0) + 1;
    }

    expect(speciesCounts["setosa"]).toBe(50);
    expect(speciesCounts["versicolor"]).toBe(50);
    expect(speciesCounts["virginica"]).toBe(50);
  });
});

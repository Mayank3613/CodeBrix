import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "packages/**/*.{test,spec}.ts",
      "tests/**/*.{test,spec}.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["packages/*/src/**/*.ts"],
    },
  },
  resolve: {
    alias: {
      "@codebrix/types": path.resolve(__dirname, "./packages/types/src/index.ts"),
      "@codebrix/shared": path.resolve(__dirname, "./packages/shared/src/index.ts"),
    },
  },
});

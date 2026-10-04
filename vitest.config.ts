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
      "@codebrix/graph-engine": path.resolve(__dirname, "./packages/graph-engine/src/index.ts"),
      "@codebrix/codegen": path.resolve(__dirname, "./packages/codegen/src/index.ts"),
      "@codebrix/runtime": path.resolve(__dirname, "./packages/runtime/src/index.ts"),
    },
  },
});

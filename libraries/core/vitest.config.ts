import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["blocks/**/*.{test,spec}.ts"],
  },
  resolve: {
    alias: {
      "@codebrix/types": path.resolve(__dirname, "../../packages/types/src/index.ts"),
      "@codebrix/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
});

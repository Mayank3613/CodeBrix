# CodeBrix Branching & Two-Developer Collaboration Guide

**Task Plan, Project Structure, and Merge-Safety Reference (v2)**

---

## 1. Developer Ownership Model

CodeBrix is split between two developers by **vertical capability**:

| Area | Owner | Location |
|---|---|---|
| **Developer 1 (Data & Workflow)** | `@Mayank3613` | `apps/desktop/` (UI, canvas, registry, palette, properties, project system, stores, services, output container), `libraries/core/`, `libraries/data/`, `pnpm-workspace.yaml`, `package.json`, `tsconfig.json` |
| **Developer 2 (ML & Execution)** | `@Arshit-dv` | `packages/graph-engine/`, `packages/codegen/`, `packages/runtime/`, `libraries/scikit-learn/`, `libraries/visualization/`, `python/`, `tests/fixtures/`, `tests/spikes/`, `eslint.config.js`, `vitest.config.ts`, `apps/desktop/src/panels/output/renderers/` |
| **Shared Contracts** | Both | `packages/types/`, `packages/shared/`, `.github/workflows/ci.yml`, `tests/integration/`, `examples/` |

---

## 2. Merge-Conflict Prevention Rules

1. **One Owner Per Folder (Enforced by `.github/CODEOWNERS`)**:
   - Only edit folders you own. Never push changes directly into the other developer's directory. Request changes via PR comments or issues.
2. **Protect Hot Files**:
   - `pnpm-lock.yaml`: Never hand-merge. On conflict, accept `main` and run `pnpm install`.
   - `package.json`: Scoped dependencies are added to the package that uses them (`apps/desktop`, `packages/*`, `libraries/*`), not the root.
   - `tsconfig.json`: Developer 1 maintains path aliases. All `@codebrix/*` aliases are defined upfront.
   - `vitest.config.ts`: Developer 2 maintains Vitest configuration.
   - `eslint.config.js`: Developer 2 maintains ESLint rules.
3. **Contract Changes Go Through Dedicated Contract PRs**:
   - Any edit to `packages/types` or `packages/shared` must be isolated in its own PR labelled `contract`.
   - Both developers must approve. Bump `CONTRACT_VERSION` in `packages/shared/src/constants.ts`.
4. **One Folder Per Block**:
   - Blocks live in self-contained folders with definitions, generator, tests, and documentation. Discovered via `library.json` rather than a centralized static array.
5. **Short-Lived Branches & Small PRs**:
   - Do not commit directly to `main`.
   - Work on short-lived branches off `main` (e.g., `dev1/d1-1.3-block-registry` or `dev2/d2-1.1-graph-engine`).
   - Keep PRs under ~400 lines. Review within 24 hours.
   - Merge `main` into your active branch daily.
6. **Formatting & Line-Ending Consistency**:
   - `.editorconfig`, `.prettierrc`, and `.gitattributes` (`* text=auto eol=lf`) ensure clean diffs across Windows, macOS, and Linux.
7. **Sequence Structural Changes**:
   - Structural updates and skeletons are merged before adding functional modules.

---

## 3. Daily Workflow & Commands

### Running Checks Locally
```bash
# Install dependencies across monorepo workspaces
pnpm install

# TypeScript typecheck
pnpm run typecheck

# Vitest test suites
pnpm run test

# ESLint
pnpm run lint

# Full local CI check
pnpm run ci
```

### Creating Feature Branches
```bash
# Always start from latest main
git checkout main
git pull origin main

# Create task branch
git checkout -b dev1/d1-1.3-block-registry

# Commit and push
git push -u origin dev1/d1-1.3-block-registry
```

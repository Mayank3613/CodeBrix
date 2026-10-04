# CodeBrix Branching & Two-Developer Working Guide

Based on the **CodeBrix Two-Person Working Plan** (4 October 2026).

---

## 1. Branch Strategy

We maintain two primary stream branches alongside `main`:
1. `feature/data-workflow` (Developer 1 stream: UI, canvas, blocks, project files)
2. `feature/ml-execution` (Developer 2 stream: graph engine, codegen, runtime, output)

### Golden Rules:
- **Never push directly to `main`**: All changes enter `main` through Pull Requests that pass CI.
- **Contract Changes**: Any change to `packages/types` must be isolated in a dedicated PR tagged `contract`. Both developers must review and approve before merging.
- **Keep PRs small**: Aim for under 400 lines changed per PR.
- **Monday Sync**: Merge `main` into your active feature branch every Monday to avoid drift.

---

## 2. Developer 2 (ML & Execution) Setup Commands

To start working on Developer 2 stream:

```bash
# Ensure you are on latest main
git checkout main

# Create and switch to Developer 2 stream branch
git checkout -b feature/ml-execution

# For individual tasks/PRs, create short-lived sub-branches:
git checkout -b feat/phase0-contracts-spike
```

### Running Checks Locally:
```bash
# Install dependencies
pnpm install

# Run TypeScript type check across all packages
pnpm run typecheck

# Run Vitest test suites
pnpm run test

# Run ESLint
pnpm run lint

# Run all checks before opening a PR
pnpm run ci
```

---

## 3. Developer 1 (Data & Workflow) Setup Commands

Developer 1 creates:
```bash
git checkout main
git checkout -b feature/data-workflow
```
Developer 1 builds against `@codebrix/types` and uses `MockWorkflowService` from `@codebrix/shared` until Developer 2's graph engine and validator land in Phase 1.

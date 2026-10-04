## Description
<!-- Provide a brief description of the changes and specify the task ID (e.g., D1-1.3 or D2-1.1) -->

Task ID: 

## Type of Change
- [ ] Feature / enhancement
- [ ] Bug fix
- [ ] Refactoring
- [ ] **Contract change** (`packages/types` or `packages/shared`) - *Requires both reviewers & bump of CONTRACT_VERSION*

## Pre-PR Checklist
- [ ] Branch is short-lived (e.g., `dev1/task-name` or `dev2/task-name`) and contains one task.
- [ ] Rebased on or merged latest `main` today.
- [ ] Changed only files in folders I own (check `.github/CODEOWNERS`).
- [ ] If touching `packages/types` or `packages/shared`, this PR contains *only* that change and is labelled **contract**.
- [ ] Did not hand-edit `pnpm-lock.yaml`; dependencies are scoped to their respective package/library.
- [ ] No generated files, formatting-only changes, or unrelated edits.
- [ ] Unit tests added beside source; lint, typecheck, and test pass locally (`pnpm ci`).
- [ ] PR is under ~400 changed lines.
- [ ] The other developer is requested as reviewer (24-hour SLA).

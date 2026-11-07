---
name: worktree-main-sync
description: Create and sync git worktrees from the latest remote main branch. Use when asked to create a new worktree, branch from remote main, fix a worktree that is behind origin/main, or verify worktree and main parity before starting work.
---

# Worktree main sync

Use this skill to guarantee worktrees start from the freshest `origin/main` and to sync existing branches safely. The scripts live in this skill's `scripts/` folder. Run them by the path where the skill is installed.

## Quick start

1. Create a new worktree from remote main:

```bash
<skill-dir>/scripts/create-worktree-from-origin-main.sh \
  --branch <prefix>/<name> \
  --path ../<worktree-dir>
```

2. Sync an existing branch or worktree with remote main:

```bash
<skill-dir>/scripts/sync-current-worktree-with-origin-main.sh
```

3. If the branch has local commits and must be rebased on the latest main:

```bash
<skill-dir>/scripts/sync-current-worktree-with-origin-main.sh --rebase
```

Both scripts take `--remote` and `--base` if the repo uses a remote or default branch other than `origin` and `main`.

## Rules

- Always run `git fetch --prune origin` before creating or syncing a worktree.
- For new worktrees, base from `origin/main`, not local `main`.
- Use the branch prefix the repo's instructions ask for.
- Never force reset (`git reset --hard`) as part of this flow.
- A clean automatic merge is not semantic validation. After syncing, run the repo's checks for every package or service whose files changed on main, not only the root checks. Some services have their own typecheck that a root check does not cover. Look for duplicate imports after merging a refactor on main with feature imports. If generated code (an ORM client, API types) depends on files that changed, regenerate it only after confirming its output is owned by this worktree. Generation is not permission to migrate a database or overwrite shared dependencies.

## What the scripts guarantee

- The new worktree branch is created from `origin/main`.
- Immediate ahead and behind validation against `origin/main` is printed.
- Existing worktree sync checks dirty state before merge or rebase.
- Sync uses non-destructive defaults (`--ff-only` unless `--rebase` is explicitly requested).

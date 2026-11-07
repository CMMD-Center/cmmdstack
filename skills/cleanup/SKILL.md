---
name: cleanup
description: Audit and safely reclaim local disk space used by agent worktrees, archived tasks, duplicated dependencies, build caches, and stale updater files. Use when a user invokes cleanup, reports a full SSD or low storage, or asks what archived agent work can be removed. Always summarize and request approval before deleting anything, and protect active, pinned, dirty, unpushed, untracked, or ambiguous work.
---

# Cleanup

Audit agent-related disk usage (Codex, Claude Code, Cursor, and similar tools) and recommend the safest useful cleanup. Keep this workflow manual and approval-driven.

## Default behavior

- Run the audit regardless of current disk utilization. Do not gate recommendations at 95%.
- Treat the first invocation as read-only. Do not delete, archive, unpin, stop processes, or change Git state.
- Inspect known agent and project storage locations first. Do not begin with an unbounded whole-disk scan.
- Protect anything active, open, pinned, unread, in progress, dirty, unpushed, untracked, or ambiguous.
- Do not create a worktree for this task.
- Keep the report concise: normally show no more than five safe candidates and five caution or project candidates.

Interpret follow-up requests as follows:

- `cleanup` or `$cleanup`: perform the standard read-only audit.
- `cleanup deep`: include the caution tier and project-finish recommendations even when disk use is below 95%.
- `approve`: remove only the previously reported first-tier safe candidates after revalidating every candidate.
- `review <id>`: inspect one caution candidate more deeply and explain the consequences and recovery path.
- `approve <id>`: remove that specific caution candidate only after it has been reviewed in the current conversation and the user explicitly approves it.

Plain `approve` never includes caution candidates.

## Measure disk pressure

Report total capacity, used space, free space, and utilization percentage for the relevant filesystem. Use the percentage only to decide whether to escalate after the safe tier. Always provide safe recommendations when they exist.

If a disk command or size scan runs for about 60 seconds without useful output, stop it and switch to narrower known paths.

## Inspect targeted locations

Start with the locations that apply on this machine, for example:

- the agent tool's worktree directory (such as `~/.codex/worktrees`)
- the agent tool's archived sessions directory
- the agent tool's cache directory under `~/Library/Caches` or `~/.cache`
- dependency directories such as `node_modules` inside inactive worktrees
- known build, bundler, test, browser, and package-manager caches
- stale Git worktree metadata using `git worktree prune --dry-run`

Avoid active session runtimes, current session transcripts, agent memories, credentials, settings, and configuration. Do not inspect or clean unrelated personal folders such as Downloads unless the user explicitly expands the scope.

Use exact paths and measured sizes. Avoid broad deletion patterns and wildcards.

## Apply the safety gate

Before recommending any candidate, establish as much of the following as possible:

1. Identify the related task, project, repository, worktree, and branch.
2. Confirm the task is archived or inactive and is not open, pinned, unread, or in progress.
3. Confirm no agent, preview server, build, test, watcher, shell, editor, or other process is using the path.
4. Confirm the path is not the current working directory or a primary checkout.
5. Inspect Git status for staged changes, tracked modifications, and untracked files.
6. Inspect potentially valuable ignored files, including `.env*`, local databases, screenshots, exports, generated reports, and other artifacts.
7. When network access and repository permissions allow, fetch remote state and determine whether every local commit is available remotely.
8. Classify recovery status as `merged upstream`, `pushed and restorable`, `local only`, or `ambiguous`.

Git history protects committed and pushed files only. It does not preserve untracked or ignored files. A pushed branch may be restorable without being merged, but deleting its full worktree still requires caution-tier approval.

If task mapping, process ownership, Git state, ignored-file value, or recovery status is uncertain, protect the candidate or place it in the caution tier. Never infer safety solely from age, an archived label, or a branch existing on a remote.

## Classify candidates

### Safe recommendations

Limit the first tier to clearly regenerable content with no active-use or data-loss ambiguity, for example:

- dependency directories in confirmed inactive, clean worktrees
- known build, bundler, test, or browser caches not used by a running process
- package caches whose removal only requires downloading dependencies again
- stale worktree metadata confirmed by a dry run

For every item, include a stable ID, exact path, measured size, related task or branch, why it is safe, and what regeneration will cost.

### Caution recommendations

Place these in the caution tier and never include them in plain `approve`:

- complete worktrees, even when their commits are pushed or merged
- archived transcripts or sessions, because removal permanently loses local task history
- pushed but unmerged branches
- directories containing `.env` files, databases, screenshots, exports, or artifacts
- stale updater files when process ownership or update state is unclear
- candidates with uncertain task, process, Git, or recovery state

Never delete branches, tags, remote references, Git history, credentials, or memories as part of cleanup. Never kill a process without separate explicit approval.

### Protected items

List a brief reason for protecting significant large items. Active, pinned, open, dirty, unpushed, untracked, local-only, and ambiguous work is protected by default.

## Present the initial report

Always present a summary before asking for approval. Include:

1. Current disk state.
2. Numbered safe recommendations with exact paths and sizes.
3. A short caution and protected summary.
4. Estimated space recoverable from the safe batch.
5. This approval boundary: `Nothing has been deleted. Reply approve to remove only the safe recommendations, review <id> for a deeper inspection, or cleanup deep to see the cautious tier now.`

If no candidate passes the safety gate, say so and do not manufacture a cleanup action.

## Execute an approved safe batch

On `approve`:

1. Recheck disk state and revalidate every candidate immediately before removal.
2. Skip any candidate whose task, process, path, or Git state changed, and explain why.
3. Delete only the exact approved paths. Do not broaden scope through wildcards or parent-directory removal.
4. Prefer the least destructive action: caches first, then dependencies while preserving the worktree.
5. Do not remove a full worktree or transcript through the safe-batch approval path.
6. Verify that repositories, worktrees, branches, and expected source files remain intact.
7. Remeasure disk usage and report actual space recovered.

## Escalate when space remains critical

After an approved safe cleanup, remeasure the filesystem. If utilization remains at or above 95%, automatically provide two read-only sections.

### Safe with caution

Show separately approved candidates with exact size, risk, evidence, consequence, and recovery path. Require `review <id>` before accepting `approve <id>` when meaningful local history or files could be lost.

### Projects to finish or close

Rank the largest projects or worktrees that could become removable after human completion. For each, show:

- task and branch
- approximate reclaimable space
- whether it is dirty, untracked, local-only, pushed, or merged
- the exact human action needed, such as reviewing files, preserving ignored artifacts, committing and pushing, merging, archiving or unpinning the task, stopping its preview, and rerunning cleanup

Do not delete these projects. The purpose of this section is to help the user finish or preserve work before a later cleanup.

When `cleanup deep` is requested, show these sections even below 95%.

## Preserve recoverability

Explain recovery honestly:

- Merged upstream: source can normally be recreated from the default branch.
- Pushed and restorable: the branch can normally be fetched and checked out again, but it may not be part of the default branch.
- Local only: do not remove it.
- Ambiguous: do not remove it until the ambiguity is resolved.

Before approving a complete worktree for removal, separately account for untracked and ignored files. Recommend committing and pushing appropriate project files and securely preserving required local-only configuration or artifacts. Never recommend committing secrets.

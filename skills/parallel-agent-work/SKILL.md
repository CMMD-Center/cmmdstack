---
name: parallel-agent-work
description: Decide whether to split work across subagents or agent teams, and run the split safely. Use when dispatching parallel agents, or when deciding whether to parallelize at all. Covers branch isolation, when not to split, and what a dispatched agent owes when it finishes.
---

# Parallel agent work

Split work when a task has two or more genuinely independent parts. One writer per branch, never two agents editing the same checkout. For fan-out that returns one merged report, see the `swarm` skill.

## Isolation mechanisms differ by client

Flags such as `isolation:` and `run_in_background:`, and helper commands that create worktrees, belong to specific agent clients. Another client may have none of them. Check what yours supports before relying on a flag, and look in the repo's agent instructions (for example its `AGENTS.md`) for any client-specific notes.

**The portable requirement is the outcome: one writer per branch.** Reach it however your client allows: `git worktree add ../<name> -b <branch> origin/main`, or a plain branch in the main checkout. Do not treat a flag as the rule.

When isolation is available, prefer it for agents that write. It makes one-writer-per-branch structural instead of remembered. When it is not, a branch does the same job by hand. For creating the worktree itself, see the `worktree-main-sync` skill.

Without built-in isolation you also lose any setup its hook did, such as copying untracked local env files into the new tree or linking installed dependencies. On a branch in the main checkout you already have them. In a manual worktree, copy the env files yourself and symlink dependency directories instead of reinstalling.

## When to split

- **Independent file edits** that do not depend on each other.
- **Research.** Dispatch an exploring agent while you keep planning. It is cheaper than ten search and read calls in your own context.
- **Review or test-writing** on code that is already done, while you start the next thing.
- **Backend and frontend** where the contract is agreed up front.
- **Bulk mechanical work**, such as the same change across many files.

## When not to

- **Changes that depend on each other.** The API must exist before the UI can call it.
- **Schema migrations.** One at a time, always.
- **The same file.** You are choosing a merge conflict.
- **Anything you cannot describe precisely enough to hand over.** If the brief is vague, the agent will fill the gap with invention, and you will spend longer reading the result than doing it yourself.

## While agents are running

- **Do not switch branches in the main checkout.** Their branches may be cut from your HEAD.
- **Branches usually share one local database.** Migrations are cumulative, and there is no per-branch database unless the repo sets one up.
- **One dev server per port.** A second needs its own port.
- **Do not measure the repo.** A gate run while an agent is writing reports a tree halfway through being changed.

## What a dispatched agent owes when it finishes

A dispatched agent finishes by reporting, not by publishing. Publishing is an action the repository owner reserves, and a brief that does not grant it means the agent must not take it.

1. **Verify what you wrote**, at the layer the behavior lives in. Run the checks the surface requires and report their real output.
2. **Write the deliverable to a file** at a path the caller named. A report that exists only as a chat message does not survive the session.
3. **Say what you did not verify**, explicitly, rather than implying it passed.
4. **Leave the working tree as you found it, plus your changes.** No `add`, no `commit`, no `stash`, no `checkout`, no `reset`, no `push`. Read-only inspection is fine.
5. **If you are blocked, say so** with what you found and what would unblock you. A well-founded blocker is a deliverable. A guess dressed as a result is not.

The caller commits. They can see the diff, they know what else is in flight, and it is their branch.

## Dispatching well

Put in the brief what the agent cannot infer: the outcome you want, the surface it may touch, the surfaces it may not, what "done" means, and where to write its report. Name the files it must not touch if others are working nearby.

Do not restate the repo's rules in the prompt. The agent reads the repo's instructions and routes from there. A prompt that paraphrases rules competes with them, and when they disagree the agent has to guess which one you meant.

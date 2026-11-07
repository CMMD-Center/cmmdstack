---
name: alex-mode
description: "This skill should be used when the user says Alex, /alex-mode, or asks to work in their style."
---

# Alex mode

Follow these rules on the user's own work. For playbooks, principles, and review mechanics, read [`cmmd-mode`](../cmmd-mode/SKILL.md) and follow it. Do not restate it here.

On Codex, read [`../cmmd-mode/references/codex-tools.md`](../cmmd-mode/references/codex-tools.md) before a step that names a Claude tool. On GitHub Copilot, read [`../cmmd-mode/references/copilot-tools.md`](../cmmd-mode/references/copilot-tools.md). On Muse, read [`../cmmd-mode/references/muse-tools.md`](../cmmd-mode/references/muse-tools.md). On Pi, read [`../cmmd-mode/references/pi-tools.md`](../cmmd-mode/references/pi-tools.md). On Cursor, use the session's own tools for the same steps.

## Autonomy

Do the work on this machine. Use the terminal, a CLI that is already logged in, and the browser. Return only when a step needs the user, such as a login, a physical action, or a product call no check can settle.

Do not wait for permission on reversible work. Commit, and when the user or the repo asks for a pull request, open it and stay with it until it is merge-ready: green checks, an independent review of the published head with no actionable findings, no open threads. Then stop and hand it to the owner. Merging, enabling auto-merge, and `--admin` need the owner's explicit word for that pull request, as in `full-stop`. When the repo says to keep work local, commit locally and do not push.

## Verify

Done is a live check on the real surface. Use a call, staging, the browser, or an end-to-end run. Then leave the work ready for the user to QA, and name what they should look at.

Fix every failing check you meet: a test, type check, lint, build, or CI job. This holds when it failed before your change and when it sits outside your files. "Pre-existing", "unrelated", and "flaky" do not close it. Find the root cause. If the fix needs the user's decision or a credential you lack, stop and show the evidence. Never report work done while a check is red.

## Review

Send review to a separate agent on a different model from the author. Point it at the published head. It does not edit. It returns PASS, PASS+NOTES, or FAIL from checks it ran itself.

## Working

Fan independent work out in parallel. Park a decision only the user can make, and keep the other work moving.

When the T3 Code MCP is present, put each independent change or PR in its own T3 thread. Use `delegate_task` with `isolation: "worktree"` for each independent change or PR. Set the provider instance on every call, using the instance names `orchestrator_capabilities` lists. Open the first message to each idle thread with T3's `goal` slash command, naming the objective and a stop condition, and invoke `/cmmd-mode`. Send later messages to a running thread as plain steers without the goal command. Without the T3 MCP, use native subagents as cmmd-mode's Subagents section says.

When a plan is hard to follow, put it in a shareable artifact with the comparison, the phases, and the checklist.

Lead the reply with the result. Name what finished and what is left.

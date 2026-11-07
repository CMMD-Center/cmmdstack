---
name: ask-alex
description: Say what Alex would do in the current situation, which workflow fits, and which cmmdstack skills to run in what order, then hand back a prompt the user can send. A router over cmmdstack. Use for /ask-alex, "what would Alex do", "which skill should I use", or "how should I start this".
---

# Ask Alex

Answer three things for the situation in front of you: what Alex would do, which flow that is, and the exact prompt to send. Do not start the work. The user asked how, and a cmmdstack run spends real tokens, so they decide when to send it.

A message that asks for the work itself ("ask-alex, fix this bug") is not a help question. Run [`cmmd-mode`](../cmmd-mode/SKILL.md) and do the work under [`alex-mode`](../alex-mode/SKILL.md).

## How Alex works

These are the habits behind every answer. Read [`alex-mode`](../alex-mode/SKILL.md) for the full rules.

- Every task of more than one file goes through `cmmd-mode`, which picks the playbook.
- Facts come from running something. A question a check can settle never goes to the human.
- Every bug ends in a guard. After the fix, a lint, type or static check makes the same mistake fail the build, through `correct`. A fix with no guard is half done.
- Done means proven on the real surface: the browser, the API, the CLI, an end-to-end run. Green unit tests are not proof.
- Review comes from a different model than the author, and never from the author.
- Independent work runs in parallel, each piece in its own worktree.
- The repo's own `AGENTS.md` wins over any of this. If it says keep work local, or never merge without the owner, that holds.

## Pick the flow

Match the situation to one row. Read the named skill before you answer, because its own steps beat this summary.

| Situation | Flow |
|---|---|
| A new idea or plan, not yet clear | `debrief` until the frontier is empty, then `cmmd-mode` Feature |
| Not sure the work is worth doing | `ask-zack` first. If it says OFF TRACK, stop |
| A bug with an unknown cause | `cmmd-mode` Bug fix: reproduce first, root cause, fix, then `correct` adds the guard |
| An agent made a mistake someone already corrected once | `correct` |
| Design or module shape that crosses files | `architect`, then `interrogate` if it is contested |
| Several candidate designs or fixes | `arena` |
| Many similar checks, a sweep, or a race | `swarm` |
| Docs, API or library facts | `research` |
| How does X work, why was Y built | `how`, `why` |
| A large migration or a plan you will review later | `figure-it-out`, with `show-me-your-work` for the trail |
| Proving UI or CLI behavior with no driver yet | `create-verification-skill`, later `maintain-verification-skill` |
| A race, invariant or state machine tests rarely hit | `create-formal-verification-skill` or `statechart` |
| A PR to open | `file-pr` or `pr`, then `babysit-pr` |
| A PR to get green or merged | `babysit`, `fix-ci`, `fix-merge-conflicts` |
| Hand the whole thing off and walk away | `full-send` (merges) or `full-stop` (stops at ready) |
| Taking over someone else's branch or PR | `takeover`, which uses `modernize` |
| A review from several providers | `council` or `sol-loop` |
| Prose: a PR body, doc, comment or message | `unslop`, plus `technical-writing` for docs |
| Catching up after time away | `ketchup`, `what-did-i-get-done`, `recall` |

When no row fits, say so and route to `figure-it-out`.

## Reply

Lead with what Alex would do, in one or two sentences. Then the flow as a numbered list of skills with one line each on why. Then one prompt in a code block that states the goal and a check that can pass or fail, and does not list the skills, because `cmmd-mode` picks them. Link the skill files you read.

---
name: pr-protocol
description: Publish a branch or PR safely by reconciling with main, choosing validation by blast radius, and following push rules and browser QA. Use before any push, PR, or merge. Running the repo's local gate is a separate step, and opening the PR text is covered by file-pr and pr.
---

# PR protocol

A fixed order for publishing a branch, with validation sized to the risk of the diff. Related skills: `file-pr` opens the PR, `pr` writes its body, `fix-merge-conflicts` handles conflicts, `babysit-pr` and `fix-ci` follow it through checks.

## Mode control

- If the user asks for planning, review, strategy, architecture guidance, brainstorming, debugging analysis, or draft copy, do not start implementation.
- Stay in the requested mode until the user explicitly approves coding.
- If a request implies pushing, opening a PR, updating the remote, or shipping a branch, follow the push protocol below before mutating remote state.
- If a request is ambiguous, make the safest useful assumption and state it. Ask only when the answer materially changes the solution.

## Push protocol

Before publishing a branch or PR:

1. Read the applicable repo instructions: `AGENTS.md` or `CLAUDE.md`, the rules they route to for the surface you touched, and the standards documents for that area.
2. Run `git fetch --prune origin`.
3. Identify the active branch and base. If the checkout is detached, create or switch to a proper feature branch.
4. Reconcile with the latest `origin/main`, or the repo's integration branch if it names one.
5. Resolve conflicts properly. Do not delete functionality, weaken tests, or use shortcuts just to make conflicts disappear.
6. Inspect the final diff and confirm the intended change is still present.
7. Classify the final diff into a validation tier below.
8. Run tier-appropriate validation.
9. Prove the change at the layer its behavior lives in. Behavior that depends on layout, scroll, viewport, or observers must be proven in a real browser against a real local stack, with the regression test watched failing on the pre-fix code first. Report the layer, the command, and the result. Name anything you could not verify instead of letting adjacent green checks imply it.
10. Stage only intended files.
11. Commit with a clear message that follows the repo's commit conventions.
12. Push according to the risk-tiered push rules.
13. Create or update the PR.
14. Report the PR URL, branch, commit, diff summary, validation tier, passed checks, skipped checks, failed checks, blocked or stalled checks, hook bypasses, browser QA status, and remaining risks.

Before calling a PR ready, bind the observed checks to the current PR head SHA. Fetch the check runs for that exact SHA (for example with `gh pr checks` or the checks API) and confirm none are missing or attached to another commit. A green notification for an ancestor commit does not qualify.

If the repo has extra publish gates for user-visible work, such as a design review, a visual regression pass, or a UI feedback standard, run them before publishing. Browser correctness alone does not show the interface is good. Do not publish placeholder-quality UI as complete.

A request to "push to main" means prepare and push a branch or PR targeting `main`, unless the user explicitly says to merge directly into `main`.

Do not push a PR branch that has not fetched and reconciled with the base in the current session. If the base moves repeatedly, do not chase it indefinitely. Push the current branch, leave the PR as a draft if needed, and report that it may need one more update.

## After an approved merge

A merge, green PR checks, or a health endpoint response alone is not verified production availability. After merge, follow the repo's release pipeline to the actual deployed revision. Report the exact candidate, the run that built it, the revision actually serving traffic, and any remaining acceptance. Do not hand the owner a manual test suite in place of that proof.

## Risk-tiered validation

Classify the final diff by blast radius. The goal is to run checks that cover the real risk, not every possible check for every change. Use the repo's own commands for each check. Its `AGENTS.md` or contributor guide names them.

### Tier 0: docs, copy, CSS or class-only, visual-only UI

Required:

- Run `git diff --check`.
- Verify user-visible UI in a browser when a local preview is feasible.
- Run lint on the touched files only if file-scoped lint is available without falling into a full-project lint.

Before publishing, run the repo's full pre-push gate. That gate is the final required check.

Do not use this fast path if runtime code, imports, package files, config, routing, API clients, shared types, server code, migrations, auth, permissions, billing, storage, background jobs, or data access changed.

### Tier 1: isolated frontend component or interaction

Required:

- Run lint on the touched files.
- Run targeted unit or component tests if they exist.
- Verify user-visible behavior in a browser when a local preview is feasible.

Run the frontend typecheck if props, exported types, routing, imports, shared hooks, shared UI contracts, or module boundaries changed.

Before publishing, run the repo's full pre-push gate.

### Tier 2: shared frontend logic, API clients, server routes, repositories, services, cross-module behavior

Required:

- Run targeted tests.
- Run lint on the touched files.
- Run the relevant typecheck for each package touched.
- Run any additional focused checks the repo's standards document for this area.

Usually skip full repo suites unless the diff risk justifies them.

Push rule: if a required check is blocked, stalled, or failing, stop and report the command, elapsed time, last output, and safest next option. Never publish with a skipped gate.

### Tier 3: auth, permissions, billing, data access, migrations, security, storage, background jobs, shared contracts

Required:

- Run targeted regression tests.
- Run the relevant typechecks.
- Run the repo's required pre-push checks before the final push.
- Run any additional security or platform checks the repo documents.

Push rule: if local required checks are blocked, keep the PR as a draft and label the blocker clearly in the PR body or a comment. Do not mark it ready for review unless required validation passed or the user explicitly accepts the skipped or failed checks.

## Validation churn

- If a Tier 0 or Tier 1 validation command runs longer than 2 minutes without useful output, stop it and report it as stalled.
- If browser verification fails twice because of the browser runtime, a stale local preview cache, local database or environment issues, or login flakiness, report browser QA as blocked. Continue with curl, API, or static checks when appropriate.
- If a tool or environment issue blocks validation, retry once only when there is an obvious quick fix. If it fails again, stop retrying and report the blocker.
- Do not keep retrying local tooling unless the user asks.
- Do not rerun checks that already passed in this session after the latest base reconciliation unless files changed, dependencies changed, conflicts were resolved, or the check covers newly touched code.

## Browser QA

- For browser QA, visual review, login testing, localhost inspection, and user-visible app verification, use the browser tooling your client provides (a built-in browser, a browser automation MCP, or a headless CLI).
- If the primary browser tool is unavailable, say so explicitly, then use the next available one before falling back to a regular desktop browser.
- For UI changes, do not claim the fix works until it is rendered or visually verified, when local preview is feasible.
- If local preview is blocked by missing environment variables, a dead server, a stale bundler cache, a browser runtime failure, login flakiness, or local database issues, report that specifically.

## Fast-track language

When the user says "get this up", "move fast", "don't waste time", "quick PR", "just push this", or "is this enough", prioritize the smallest safe validation for the tier.

Fast-track language does not downgrade Tier 2 or Tier 3 work. It only prevents unnecessary extra checks and local-tooling loops.

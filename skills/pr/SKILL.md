---
name: pr
description: Write or update a pull request body from the repo's PR template, with evidence and validation traced to commands actually run. Use when writing or updating a PR body. To open the PR itself, use file-pr.
metadata:
  credits:
    skill: show-me
    author: Dex Horthy
    organisation: Humanlayer
    url: "https://github.com/humanlayer/skills/blob/main/plugins/show-me/skills/show-me/SKILL.md"
---

The repo's pull request template (usually `.github/pull_request_template.md`) is the one definition of a PR body. This skill fills it and never restates its sections. If the repo has no template, use the sections below as the template. To file the PR after the body is written, use `file-pr`.

## Steps

1. Read the template. Its comments say what each section holds and when a section is deleted.
2. Read the primary sources: the issue or spec the PR closes, and the evidence and check output you actually produced this session. The diff is the last thing you read, not the first.
3. Fill every section in template order, using the guidance below. Use the domain language from the repo's glossary or context file if it has one (for example `CONTEXT.md`).
4. Run the **unslop** skill on the finished body.
5. If the PR is bound to a tracker item, link the PR to it right after the PR is open, using the tracker's own tool or API, then confirm the link is recorded on the item. Nothing else may record the PR there.

Done when every section is filled or deleted as its comment directs, and every claim in Evidence and Validation traces to a command you ran or a screenshot you took.

## Section guidance

### How to reach it

Required when the PR ships or changes a user-facing surface, such as a feature flag, a new route, an agent tool, or a view. If the repo has a skill or checklist for shipping surfaces, use it to generate this section.

State four parts:
- **Gate:** the flag or permission that controls it, its audience, and whether it is on at first deploy.
- **Surface:** the exact route, tab, command, or tool name the user interacts with.
- **Seed:** the migration or config that plants the data the surface needs.
- **Proof:** a screenshot that starts from the entry point a person would use, not from an admin page or the feature's own route.

If nothing changed: `No new production surface. Existing paths unchanged.`

### Summary

Two or three sentences on what changed and why, in the issue's terms. When prose alone leaves the shape of the change unclear, add the smallest visual that shows it: pseudocode, a call tree, a file tree, a diff sketch or Mermaid. Pick one from [`references/visuals.md`](references/visuals.md).

### Evidence

A before and an after, at the layer the behavior lives in. If the repo has a proof-of-work standard, follow it. Screenshots rank first when the change is visual and the environment can render it. Execution evidence ranks next: the exact test that failed on the pre-fix code and passes now, shown as its name and the assertion that flipped.

### Validation

Copy commands and results from this session's output. A check you did not run goes under Skipped with the reason. A check that ran red goes under Blocked or failing. "Not verified" names what a reader might assume the green checks cover when they do not.

### Merge danger

A two-way door is cheap to walk back: revert the commit and nothing is lost. A one-way door is not: a destructive migration, a deleted column, a message already sent, a contract a consumer already depends on. The blast radius is everything the change could break if it is wrong: layout shift, consumers of an API, mobile clients, other tenants' data. Name every area the diff touches, not only the one the PR is about.

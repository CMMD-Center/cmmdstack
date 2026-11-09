# cmmdstack

cmmdstack is CMMD's skill library for AI coding agents. The same skills run on Claude Code, Codex and Cursor. Every CMMD repo installs it, and anyone else can too.

Start every non-trivial task with `cmmd-mode`. It matches the task to a playbook (bug fix, feature, refactor, perf, PR, autonomous run and more), copies the steps into the todo list, and calls the other skills as the steps need them. Not sure where to start: `/ask-alex`. Not sure the work is worth doing: `/ask-zack`.

## Hard rules every skill follows

- Every bug fixed or caught ends with a lint, type check or static check that fails on the bad code, in the same change (`correct`).
- Done means proven on the real surface: the browser, the API, the CLI, an end-to-end run.
- Review comes from a different model than the author.
- Prose follows `unslop`. The build fails on an em or en dash.

## Install

**In a CMMD repo.** Run the repo's installer, which copies a tagged release into `.agents/skills/` and mirrors it for every tool:

```sh
node scripts/install-cmmdstack.mjs            # latest tag
node scripts/install-cmmdstack.mjs v0.1.0     # a specific tag
```

**Claude Code plugin**, for repos that do not vendor it:

```
/plugin marketplace add CMMD-Center/cmmdstack
/plugin install cmmdstack@cmmdstack
```

**Codex plugin:** `codex plugin marketplace add CMMD-Center/cmmdstack`, then enable `cmmdstack` in `/plugins`.

**Any tool, skills only:** `npx skills@latest add CMMD-Center/cmmdstack --skill '*' --copy -y`

Install one way per repo. A plugin plus a vendored copy shows every skill twice.

## Skills

| Area | Skills |
|---|---|
| Entry and routing | `cmmd-mode`, `ask-alex`, `ask-zack`, `alex-mode`, `cmmd-help`, `setup-cmmdstack` |
| Planning and design | `debrief`, `architect`, `arena`, `interrogate`, `figure-it-out`, `statechart`, the `principle-*` skills |
| Investigation | `how`, `why`, `research`, `blast-radius`, `recall` |
| Fixing mistakes for good | `correct`, `deslop`, `no-comments`, `thermos`, `thermo-nuclear-review`, `thermo-nuclear-code-quality-review` |
| Verification | `create-verification-skill`, `maintain-verification-skill`, `create-formal-verification-skill`, `maintain-formal-verification-skill`, `benchmark-checklist`, `test-assertion-quality`, `tdd` |
| Parallel work | `swarm`, `parallel-agent-work`, `worktree-main-sync`, `durable-workflow-review` |
| PRs and shipping | `pr`, `pr-protocol`, `file-pr`, `babysit`, `babysit-pr`, `fix-ci`, `fix-merge-conflicts`, `get-pr-comments`, `leaving-pr-comments`, `make-pr-easy-to-review`, `full-send`, `full-stop`, `takeover`, `modernize`, `council`, `sol-loop` |
| Writing | `unslop`, `technical-writing`, `in-your-own-words`, `sharpen`, `teach` |
| Catching up | `ketchup`, `ketchup-video`, `what-did-i-get-done`, `show-me-your-work`, `reflect`, `bro` |
| Upkeep | `cleanup`, `automate-me`, `karpathy-guidelines`, `typescript-best-practices` |

## Tip sheet

`docs/tip-sheet.pdf` is a one-page, front-and-back tip sheet in the CMMD V11 style, with CMMD's own colors, type, logo and app icons. Print it double-sided on letter paper. To change it, edit `docs/tip-sheet.src.html` and run `node scripts/build-tip-sheet.mjs`, which rebuilds the HTML, PDF and page images and fails if the sheet runs past two pages or the CMMD fonts did not load.

## Working on cmmdstack

- `node scripts/check.mjs` must pass before every commit. It checks frontmatter, Codex prompts, relative links, dashes and manifest versions. `--fix` writes missing Codex prompts.
- `node scripts/release.mjs 0.2.0` bumps every manifest, runs the check, commits and tags `v0.2.0`. Push the tag to publish. CMMD's weekly update job opens a PR when it sees the new tag.
- Edit a skill in place. Keep skills free of any one repo's paths, services and private details. Those belong in that repo's own `.agents/skills/`. CMMD-wide conventions (CMMD Brain, the V11 tip sheet, the ask-alex and ask-zack habits) are fine here.

## Data handling

cmmdstack has no server or telemetry. Anything a skill asks the agent to read, including session transcripts, goes to your model provider. Scripts run locally, and PR tools use your GitHub CLI login.

## License

MIT. cmmdstack starts from boonstack and also includes skills from pstack, tstack and mattpocock/skills, all MIT. See [LICENSE](LICENSE) and [NOTICE](skills/cmmd-mode/references/licenses/NOTICE.md).

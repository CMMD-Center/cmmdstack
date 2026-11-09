---
name: ask-zack
description: Check whether the current thread or piece of work moves the company toward its stated end goal, using CMMD Brain as the only source of strategy, and push back hard when it does not. Use for /ask-zack, "is this worth doing", "are we on track", or before starting work whose business value is unclear.
---

# Ask Zack

Zack's question is always the same: does this work move the company toward where it is going, now, more than anything else we could do? You answer it from what the company has written down, not from your own sense of what sounds strategic.

cmmd-mode runs this skill as its **Strategy check** before Feature, Multi-phase plan, Autonomous run, Orchestrate and Autopilot work. When it does, give the verdict and return; cmmd-mode's Strategy check says what each verdict does to the playbook.

## Source of truth

The company's strategy lives in CMMD: the Strategy app, the Rocks, and Brain. Read it through the
`cmmd-agent` MCP server for the repository's company, in this order.

0. **Check the connection.** Run [`connect-cmmd`](../connect-cmmd/SKILL.md)'s script with `--check`. On
   any status but `OK`, stop with `BLOCKED: <status>`, the line the script printed, and the fix from
   that skill's table. `WRONG_WORKSPACE` means the token reads another company, and a verdict from it
   would judge this work against the wrong strategy. Pass `workspace_id` from that check on every call
   below, so an account-wide token reads this repository's company and not the person's default.
1. **The Strategy app.** Call `search_strategy` with no `sections`. It returns purpose, vision and
   victory, core values, horizon goals, SWOT, target markets, personas, the business model and the
   strategic items (The List). This is the strategy of record.
2. **What is being executed now.** Call `manage_rock` with `action: "search"` for the current Rocks:
   the quarter's commitments, with owners and health. Add `search_goals` for annual and quarterly goals.
3. **Brain, for the reasoning behind it.** Call `search_brain_documents` with `strategy`, `plan`,
   `roadmap`, `alpha`, then the area the work touches. It ranks by relevance, so the first hits are the
   ones to read. Read each with `get_brain_document_content`. Prefer written plans and strategy
   documents over Slack archives and meeting recordings, which match almost every search.

Read only. Never call a tool that writes strategy or goals (`update_strategy_vision`,
`add_horizon_goals`, `add_swot_items`, `add_strategic_items`, `populate_strategy`, `create_goal`,
`update_goal`, `delete_goal`, or `manage_rock` with any action but `search` or `get`). Checking work
against the strategy never changes the strategy.

If the Strategy app is empty, no Rock is open and Brain has no strategy document, stop and report
`BLOCKED: no strategy source`, with the calls you made. Tell the user that filling in the Strategy app
in CMMD (vision, horizon goals, this quarter's Rocks) unblocks the check. Do not fill the gap from
memory, repo docs or the chat. A verdict with no source is a guess.

## Steps

1. **State the work.** In two or three sentences: what the thread is building or changing, who it is for, and what the user would see when it ships. Read the thread and the diff or plan; do not ask the user for this.
2. **Pull the strategy.** Follow Source of truth above. Keep the exact lines you will cite, with the document title.
3. **Judge it.** Answer each:
   - Which Rock, horizon goal, strategic item or stated priority does this serve? Quote it with its source. "None" is a valid answer.
   - Is it the most valuable next step for that priority, or is something the strategy names as more urgent still open, such as an off-track Rock?
   - What does it cost: time, risk to what already works, attention pulled from a priority?
   - Would a customer, a buyer or the team notice it within the current planning period?
4. **Give the verdict.** One of:
   - `ON TRACK`: serves a quoted priority and is the right next step for it.
   - `DRIFTING`: serves a priority, but too large, too early, or ahead of something more urgent. Say what to cut or reorder.
   - `OFF TRACK`: serves no quoted priority, or works against one.

## When the verdict is OFF TRACK

Disagree strongly and say so first. Tell the user, or the agent that asked, to stop this work. Give the quoted priority it fails, what it costs, and the one piece of work the strategy says should happen instead. Do not soften this into a suggestion.

The user can still override. If they do, record the override and their reason in the task, the PR body or the thread, so the decision is visible later. Do not raise the same objection again in the same thread unless the work grows.

## Reply

Lead with the verdict. Then the work as you stated it, each line you relied on with its source (Strategy app section, Rock name, or Brain document title), the answers to step 3, and the recommended next action. Keep it to one screen.

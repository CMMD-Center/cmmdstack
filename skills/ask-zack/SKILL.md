---
name: ask-zack
description: Check whether the current thread or piece of work moves the company toward its stated end goal, using CMMD Brain as the only source of strategy, and push back hard when it does not. Use for /ask-zack, "is this worth doing", "are we on track", or before starting work whose business value is unclear.
---

# Ask Zack

Zack's question is always the same: does this work move the company toward where it is going, now, more than anything else we could do? You answer it from what the company has written down, not from your own sense of what sounds strategic.

## Source of truth

CMMD Brain is the only source. Search it with the `search_brain_documents` tool from the `cmmd-agent` MCP server. Look for the vision, the current company priorities (Rocks, the alpha or launch definition, the quarter's goals), the product strategy, and any document that names the area this work touches. Run several searches with different words before you conclude a topic is absent.

If the tool is missing, errors, or returns nothing usable, stop and report `BLOCKED: no strategy source`. Do not fill the gap from memory, repo docs or the chat. A verdict with no source is a guess.

## Steps

1. **State the work.** In two or three sentences: what the thread is building or changing, who it is for, and what the user would see when it ships. Read the thread and the diff or plan; do not ask the user for this.
2. **Pull the strategy.** Search Brain as above. Keep the exact lines you will cite, with the document title.
3. **Judge it.** Answer each:
   - Which stated priority does this serve? Quote it. "None" is a valid answer.
   - Is it the most valuable next step for that priority, or is something the strategy names as more urgent still open?
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

Lead with the verdict. Then the work as you stated it, each Brain line you relied on with its document title, the answers to step 3, and the recommended next action. Keep it to one screen.

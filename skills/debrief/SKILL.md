---
name: debrief
description: Interview the user about a plan, design or decision until every branch is settled, and write what it settles into the repo's glossary and ADRs as you go. Use for /debrief, "grill me", "stress-test this plan", or before building anything that needs a decision first.
---

# Debrief

A debrief questions the plan until nothing is left assumed, then leaves a written record. The record is the point: the next agent reads `CONTEXT.md` and `docs/adr/` instead of this chat.

## The design tree

Treat the plan as a **design tree**. Each decision branches into the decisions that depend on it. The **frontier** is every open decision whose prerequisites are already settled, so it can be asked now without guessing an earlier answer.

## Rounds

1. Read what exists first: `CONTEXT.md` (or `CONTEXT-MAP.md` and the context it names), `docs/adr/`, and the code the plan touches. Note every place where the user's words disagree with the glossary or the code.
2. Ask the whole frontier in one round. Number each question, give the options, and give your recommended answer under it:

   ```
   **Q1. <title>**
   <question, with the options>

   Recommended: <answer and the one-line reason>
   ```

3. Wait for the answers. Then recompute the frontier and ask the next round. A question that depends on another question in the same round waits for a later round.
4. Facts are your job. When a question needs a fact from the code, the docs or a tool, look it up or send a subagent, and keep asking the rest of the frontier while it runs. Only decisions go to the user.
5. Challenge terms as they come up. When a word conflicts with `CONTEXT.md`, say so and ask which meaning holds. When a word is vague ("account", "job", "session"), propose one exact term. When the user says how the code works, check the code, and show the line if it disagrees.
6. Test boundaries with concrete scenarios. Invent the edge case that forces a choice: two users at once, a retry after a crash, a deleted parent record.

The debrief is done when the frontier is empty and the user confirms you share the same picture. Do not start building before that confirmation.

## The record

Write as you go. Do not batch it to the end.

- **Glossary.** When a term is settled, add or fix it in `CONTEXT.md` in the format in [CONTEXT-FORMAT.md](CONTEXT-FORMAT.md). The glossary holds only domain language: no implementation detail, no plan, no task list. Create the file when the first term settles.
- **ADR.** Offer an ADR only when the decision is hard to reverse, would surprise a future reader, and came from a real trade-off. If any of those is missing, skip it. Use [ADR-FORMAT.md](ADR-FORMAT.md) and the next free number in `docs/adr/`.
- **Guards.** When a settled decision can be checked by a machine (a banned import, a required field, a naming rule), name the lint, type or test that would enforce it, and hand it to the **correct** skill. A rule nothing enforces gets broken.

## Reply

Close with the settled decisions, the files you wrote or changed, the guards you proposed, and anything still open with who owns it. If the runtime can publish a page (for example a Claude artifact), publish one page with the flow and the user journey the debrief settled, and link it.

---
name: research
description: Answer a question from primary sources (official docs, source code, specs, first-party APIs) in a background agent, and save the cited findings as one Markdown file in the repo. Use for /research, "look into", "what does the API say", or reading work you want off the main thread.
---

# Research

Send the reading to a background agent so the main thread keeps working. Do not answer the question yourself while it runs.

## Brief the agent

The brief stands alone. Include:

1. The question, in one or two sentences, and why it matters for the current task.
2. What is already known or ruled out, so the agent does not redo it.
3. The source rule. Primary sources only: the official docs page, the source file at a commit, the spec section, the API response. A blog post or a summary is a lead to the primary source, never the citation. Every claim cites the URL, file path or commit that owns it.
4. The label rule. Mark each claim as confirmed (a primary source says it), inferred (follows from confirmed claims) or unconfirmed (no primary source found). Never drop an unconfirmed claim silently.
5. Where to write. Use the folder where the repo already keeps such notes, for example `docs/research/`, and name the file `YYYY-MM-DD-<topic>.md`. If there is no such folder, create `docs/research/` and say so.
6. What not to do: no commits, no edits outside the note, no installs, and no reading credential, settings or `.env` files.
7. The reply it sends back: the file path and a five-line answer.

Use the runtime's background agent (Claude Code `Agent` with `run_in_background: true`, Codex `spawn_agent`). Pick a mid-tier model for reading. Step up only when the question needs judgment across sources that disagree.

## When it returns

Read the note before you rely on it. Check two or three citations yourself. If a citation does not say what the note claims, fix the note and tell the user. Then give the user the file path, the answer, and what stayed unconfirmed.

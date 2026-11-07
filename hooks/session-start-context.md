<EXTREMELY_IMPORTANT>
You have cmmdstack.

Invoke the `cmmdstack:cmmd-mode` skill and follow its instructions when a task meets any of these:

- it touches more than one file, or changes a signature other files call
- it involves a design or architecture choice
- it is a bug whose cause is not yet known, or a performance issue

It routes to the right cmmdstack skill from there. For smaller tasks, such as a contained change to one file with an obvious test, a question, or a one-line edit, work directly and verify on the real artifact.

Every bug you fix or catch ends with a lint, type check or static check that fails on the bad code, added in the same change through `cmmdstack:correct`.

When the intent is already specific, enter that skill directly: `cmmdstack:debrief`, `cmmdstack:tdd`, `cmmdstack:architect`, `cmmdstack:how`, `cmmdstack:why`, `cmmdstack:arena`, `cmmdstack:interrogate`, `cmmdstack:swarm`, `cmmdstack:research`. Not sure which fits: `cmmdstack:ask-alex`. Not sure the work is worth doing: `cmmdstack:ask-zack`.

User instructions (CLAUDE.md, AGENTS.md, direct requests) take precedence. Other session-start mandates, such as superpowers, still apply. Their skill checks run as before, and when a task meets the criteria above they route implementation through cmmd-mode.
</EXTREMELY_IMPORTANT>

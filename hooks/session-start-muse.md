<EXTREMELY_IMPORTANT>
You have cmmdstack.

Invoke the `plugin:cmmdstack:cmmd-mode` skill and follow its instructions when a task meets any of these:

- it touches more than one file, or changes a signature other files call
- it involves a design or architecture choice
- it is a bug whose cause is not yet known, or a performance issue

It routes to the right cmmdstack skill from there. For smaller tasks, such as a contained change to one file with an obvious test, a question, or a one-line edit, work directly and verify on the real artifact.

When the intent is already specific, enter that skill directly: `plugin:cmmdstack:tdd`, `plugin:cmmdstack:architect`, `plugin:cmmdstack:how`, `plugin:cmmdstack:why`, `plugin:cmmdstack:arena`, `plugin:cmmdstack:interrogate`.

Resolve every Claude tool, model, and built-in skill a cmmdstack skill names through the Muse mapping in the `cmmd-mode` skill directory, `references/muse-tools.md`.

User instructions (AGENTS.md, direct requests) take precedence. Other session-start mandates still apply. Their skill checks run as before, and when a task meets the criteria above they route implementation through cmmd-mode.
</EXTREMELY_IMPORTANT>

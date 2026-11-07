---
name: test-assertion-quality
description: Self-review a test before pushing it against the common assertion defects, which are vacuous assertions, source-string checks standing in for behavior, branches added but never exercised, and fixtures that leak between tests. Use whenever writing or modifying a test, and before opening any PR that adds test coverage. Pairs with tdd.
---

# Test assertion quality

A green test is a claim that the behavior works. These are the ways that claim turns out false. They are the defects that automated and human reviewers raise most often on otherwise correct work, and each one costs a review round-trip. The fix is a few minutes of self-review before pushing. To write the test first, see `tdd`.

## The checklist

Run this against every test you touched. Each item names the defect, the tell, and the fix.

### 1. Would this test fail if the fix were reverted?

This is the only question that matters. A test written after the code that has only ever been green describes current behavior. It does not defend it.

Break the line you are defending, run the test, watch it go red, and put the line back. If it stayed green, the test is decorative. When you revert with `git stash`, check that you are not reverting to a `HEAD` that already contains your fix. Revert the specific lines, or check out the parent commit's version of the source file.

### 2. Did you add a branch and test only one side of it?

Every `?:`, `??`, `if`, and `||` you introduce is two behaviors. A fallback exists because the primary path can be absent, so the fallback is the half most worth asserting.

Example: `groupId === null ? '/items' : \`/items/groups/${groupId}\`` ships with the `null` arm uncovered. Untested, it silently produces the string `"/items/groups/null"` when the id is missing.

Grep your own diff for `?`, `??`, and `if (` and count the arms against your test names.

### 3. Is the assertion about the source text rather than the behavior?

Asserting that a file contains a string, or that a `className` includes a token, proves the characters exist. It does not prove the browser did anything with them.

```ts
expect(source).toContain('bg-[var(--card-bg)]');                          // proves nothing rendered
expect(getComputedStyle(el).backgroundColor).toBe('rgb(28, 28, 30)');    // proves the style applied
```

A class that names a color key the style config does not define can compile to nothing, silently, past the linter and the type checker. Prove color, spacing, depth, and layout with computed styles in a real browser.

### 4. Is the assertion vacuous?

A vacuous assertion passes no matter what the code does. The recurring shapes:

```ts
expect(result).toBeDefined();               // true for {} and for the wrong object
expect(spy).toHaveBeenCalled();             // says nothing about the arguments
expect(rows.length).toBeGreaterThan(0);     // true for any non-empty result
expect(() => render(<X />)).not.toThrow();  // "it mounted" is not a feature
```

Assert the value, not its existence: `toEqual`, `toHaveBeenCalledWith`, the specific row. If you cannot name the expected value, you do not yet know what the test is for.

### 5. Is it testing the implementation instead of the outcome?

Asserting that an internal function ran couples the test to the shape of the code. A correct refactor turns it red, and a broken rewrite can keep it green. Assert the observable outcome: the database row, the HTTP response, the rendered text, the side effect.

For a service with an HTTP surface, drive it through that surface, for example a heartbeat endpoint exercised by a real request, using the HTTP client the repo's integration tests already use.

### 6. Does the test own its fixture, and leave nothing behind?

Three distinct failures, all of which look like a pass:

- **Ordering dependence.** The test reads state an earlier test created. Run it alone (for example `-t '<name>'`). If the verdict changes, it was never testing what you thought.
- **Non-deterministic fixture.** `Date.now()`, `Math.random()`, or a live-clock timestamp in the expected value. Pin it.
- **Leaked global.** A mutated `process.env` key, a monkey-patched module, an open handle. Capture the original in `beforeEach` and restore it in `afterEach`, including on the failure path.

Shapes the server produces get one extra rule: copy the field meanings from the repository method, not the field names. A fixture that sets `assigneeName: 'Ada Lovelace'` next to `assigneeLastName: null` is a shape the real query can never return. It lets many tests pass while every card in the real UI renders a surname alone.

When you change a shared hook's transport or scope (for example from an ambient client to a tenant-scoped client), update the older rendered suites that consume it, not only the new scope test. Assert the owning tenant as well as the request path and the rendered outcome. Keep seeded query keys aligned with the actual scoped lookup. A stale key can silently exercise an empty fallback instead of the supplied fixture.

### 7. Is the test at the layer the behavior lives in?

jsdom has no layout. It reports every element at 0×0, has no real `IntersectionObserver`, and cannot scroll. A green jsdom test proves a callback fired, never that a user saw anything. Match the layer to the defect: layout, scroll, and visual checks belong in a real browser, and SQL behavior belongs in the real database engine, not a mock.

### 8. Will this assertion survive the code moving?

A source-string assertion is the cheapest way to pin a contract no rendered test can reach. It has one failure mode: someone extracts a hook or splits a page, the string is still somewhere in the codebase, and the test reports a missing substring while printing the top of a file. Finding the new home is a manual search every time.

If the repo has a helper for source-contract assertions, use it instead of a bare `expect(read(file)).toContain(needle)`. A good helper searches the repository on a miss and names the files that now contain the string. If it has none, consider adding one, because the helper pays for itself on the first refactor.

When one fails, repoint it at the file that owns the behavior now. Delete it only when nothing anywhere contains the string.

Splitting a file can also break test module mapping. A test runner config with a catch-all alias (such as a `^@/(.*)$` mapper that answers with a generic mock) makes a new module without its own entry import as `undefined`, and the failure reads as if you forgot to export. After splitting or adding modules, check the test config's path mappings.

## Before you push

For a bounded rerun, prefer explicit file paths over name patterns. Some runners match patterns against the absolute path, so a short pattern like `home` also matches every test in a sibling worktree named `home-main-*`. Confirm the selected file count before a heavy run, and use the CLI option your installed runner version supports.

- [ ] Every test you touched has been watched failing against the unfixed code
- [ ] Every branch you added has a test per arm
- [ ] No assertion is `toBeDefined`, `toHaveBeenCalled`, `.not.toThrow`, or a bare source-string check
- [ ] Every source-string assertion goes through a helper that names the new home after a move
- [ ] Every module you added or split has the test config mapping it needs
- [ ] Each new test passes when run alone, and the suite passes when run twice in a row
- [ ] Any env var or global the test mutates is restored in `afterEach`
- [ ] Anything layout-, color-, or SQL-dependent was proven in a real browser or real database

## Related

- `tdd` for writing the failing test first
- The repo's own testing standards (see its `AGENTS.md`) for end-to-end conventions such as page objects and avoiding fixed sleeps

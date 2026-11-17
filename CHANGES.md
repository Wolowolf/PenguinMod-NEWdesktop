# CHANGES.md — open points and the last session

Printed by `tweak.mjs start`; kept short on purpose. Grep-only: `docs/STATE.md` (current state of the app, build, releases and tools), `docs/CHANGES-archive.md` (every session in full, newest first), the other docs listed in `CLAUDE.md`.

## Open points

- **Not verified yet:**
  - The updater's window and its downloads from a real release while installing a new offline library or packager Electron (its install steps are checked by the local `updater-check.cjs`, Session 116; an update itself worked end to end in Session 30).
  - Opening a `.pmp` by double-click (the test app cannot be started by Windows with a file; a second start of the test app with a file opens it in a new window, Session 235; a saved file's bytes loaded in a fresh app keep the category order, Session 116).
- **Ideas offered, not applied** (offer when relevant):
  - Make the stage's WebGL context after the rest of the first render: at most ~700 ms off the editor's start (`docs/BENCH-BASELINE.md` "Start-up").
  - Loading like a game engine: "load on first use" is done (sections 162, 164, 165). Not chosen so far: scenes, asset groups, sprites on demand, streaming.
  - Square off the block shapes (needs a `scratch-blocks` patch, riskier).

## Last session (written by `tweak.mjs finish`; the full entry is at the top of the archive)

### Session 296 — "or else" answers the same compiled and interpreted (2026-11-17)
- Asked: fix Operators Expansion's "A or else B" and its sibling answering a number compiled but text interpreted for typed text (found in Session 294); start automatically after the modular-switch conversation merged (PR 339).
- Cause: the blocks' own compiler code used `asUnknown()`, which writes typed text that looks like a number as a number (test app before the fix: compiled "0 or else b" = b, interpreted 0). Also: interpreted, inputs were turned into text first, so a variable holding the number 0 counted as filled in.
- Changed: section 280 (VM aa11edc), `pm_operatorsExpansion/index.js`: typed text stays text when compiled; inputs are passed on unchanged when interpreted. To reverse: `git revert` the merge.
- Verified: test app, 100 blocks (typed texts, variables, nested, inside + and join): value and type as expected in compiled, no-inline, no-folding and interpreted, 100/100 each (78/100 compiled before); block-eq for the extension: 25 blocks identical in every mode; after a power cut mid-build git fsck clean, rebuilt. · Not verified: the full block-eq (auto wanted everything only because built-in extensions have no `source` in the inventory).
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

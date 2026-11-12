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

### Session 262 — Token savings: smaller start, fewer steps (2026-11-12)
- Asked: build the token audit's options 1, 2, 4 to 12, 14 and 16, plus two new rules (unrelated request after a merge; several changes in one prompt).
- Changed: `CLAUDE.md` tightened and the two rules added; "Current state" moved to `docs/STATE.md`; `CHANGES.md` keeps the open points and one short last session; `docs/SECTIONS.md` is the index only (details in `docs/SECTIONS-details.md`); local tools: `tweak.mjs finish` (and `start` prints `CHANGES.md`), `bench\verify-compiler.mjs`, `cdp.mjs steps-file`, `run-local-test.ps1 -StepsFile`; `.claude/settings.local.json` (not in git) with 5 environment variables. To reverse: `git revert` the merge; the old scripts are in the archive entry's note.
- Verified: `finish` dry run on a throwaway copy (twice, 7 bad inputs), steps file in the test app, all 10 steps of `verify-compiler` · Not verified: whether the desktop app honours the environment variables; the savings themselves.
- Result after build: builds nothing (`.md` only)

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

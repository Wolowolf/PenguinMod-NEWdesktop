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

### Session 310 — Shared definitions for Sensing, Control (2026-11-18)
- Asked: section 291's mechanism for Events, Control, Sensing and My Blocks, identical timing in every mode, blocks left where sharing costs speed or timing; unused code removed, compiler proofs, equality test, speed vs BENCH-BASELINE.
- Changed: section 293 (VM 08d1ed3): shared/sensing.js (28), control.js (8); 35 methods + 7 helper strings removed (VM diff +218 −367 incl. new files). Left: all Events and My Blocks, Control branches / loops / waits / stops, delete clone, throw, "of" / "set of", ask and wait. Docs: EXTENSION-INTEGRATION, EXTENSION-RISKS, BENCH-BASELINE. To reverse: `git revert` the merge.
- Verified: compiled code of 108 of 109 bench projects identical (project 8: "distance to" passes the sprite); new core-eq.mjs --sc before = after (same 39 known differences, state, clones, no errors); verify-compiler s293 all 6 ok; block-eq found Hyper Sense V2 calling getAnswer (kept, rerun 0 differ); unit tests ok except 2 that fail on the old code too; ScratchBench geomean 1.002 / 0.994. · Not verified: packaged games with the compiler off.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

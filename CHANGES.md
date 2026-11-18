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

### Session 308 — Shared block definitions (2026-11-18)
- Asked: one shared mechanism so each Operators and Variables/Lists block is defined once for interpreter and compiler, compiled code no slower, unused code removed, proofs, equality test, speed, docs.
- Changed: section 291 (VM fd237cc): `src/blocks/shared/`; interpreter, jsgen.js and jsexecute.js use it; ~320 lines fewer. Rules in `docs/EXTENSION-INTEGRATION.md` "Shared block definitions". To reverse: `git revert` the merge.
- Verified: compiled code of 109 bench projects byte-for-byte identical before/after; compiler proofs all 6 steps ok (regression fails = baseline's); block-eq auto: new vs interpreted 0 differ (one new-vs-old difference was random, gone on rerun); VM unit tests 255 ok; ScratchBench 72.8k (s272: 69.6k), project 41 204 ms (older 241). · Not verified: packaged games with the compiler off (interpreter now needs `new Function`, as the compiler always did).
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

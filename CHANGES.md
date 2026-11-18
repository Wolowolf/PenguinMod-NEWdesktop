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

### Session 309 — Shared definitions for Motion, Looks, Sound (2026-11-18)
- Asked: section 291's mechanism for the Motion, Looks and Sound blocks; no slower compiled code, unused code removed, compiler proofs, equality test, speed vs BENCH-BASELINE.
- Changed: section 292 (VM e0c2d65): shared/motion.js, looks.js, sound.js; index.js format extended; 46 methods + 6 helper strings removed (VM diff −238 lines). Docs: EXTENSION-INTEGRATION, EXTENSION-RISKS, BENCH-BASELINE. To reverse: `git revert` the merge.
- Verified: compiled code of 109 bench projects and of all moved blocks (22.8 MB) byte-identical, both dumped in freshly built apps; new core-eq.mjs --mls: compiled = old, vs interpreted only the 132 known "pick random" inputs (7 layer differences gone); verify-compiler s292 all 6 ok, block-eq auto 0 in every pair; unit tests ok (blocks_sound_tw fails as before); ScratchBench non-scheduler geomean 0.999 / 1.004. · Not verified: packaged games with the compiler off (as section 291).
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

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

### Session 263 — Variable types kept across calls to custom blocks that cannot pause (2026-11-12)
- Asked: after a call to a custom block that cannot pause, the variables it can set take the types it leaves them with, the others keep theirs; recursion and custom blocks that can pause as before; behind a test switch; prove with compile-eq, the fuzz test and the regression projects. Started at 8:31 as asked, PC kept awake.
- Changed: section 244 (VM `9452686`, `upstream.json`): see `docs/SECTIONS.md`; switch `runtime.pmNoCallTypes`. Only custom blocks made of section 242's block kinds (no extension blocks). New local tool `bench\calltypes-check.cjs` (`docs/PROCEDURES.md`). To reverse: `git revert` the merge.
- Extension check: a custom block containing any extension block is treated as before, so no extension block is affected; `block-eq auto`: 0 of 638 blocks differ in every mode.
- Verified: fuzz test 5 runs of 8000 cases (fixed and random seed, timer on, with "stop"): nothing; regression set: 0 verdicts changed (both modes, timer off); compile-eq with the switch: 3 of 328 regression scripts differ (timer off 19), ScratchBench 10 of 85; `calltypes-check.cjs` 19 cases ok; 2 planted mistakes caught (one by the fuzz test, one only by the new check) · Not verified: speed gain (not measured); returning custom blocks against the interpreter (it has no "return"; expected values instead).
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

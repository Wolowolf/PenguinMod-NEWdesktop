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

### Session 268 — The compiler is looked up once, not on every thread start (2026-11-13)
- Asked: in the VM, resolve `require('../compiler/compile')` once instead of on every thread start (cause 2 of the MistWarp scheduler study).
- Changed: section 249 (VM dbe141c, `upstream.json`): `thread.js` keeps the compile function in a module variable, filled on the first `tryCompile()`. To reverse: `git revert` the merge.
- Measured: sched-study `ablate.sh` 6 rounds, ours before → after (runs/s): fanout 496 → 682 (+37%), fanwait 562 → 732 (+30%), pingpong 262 → 271, clonechurn 107 → 112, threads 9663 → 9696.
- Extension check: no calculation, timing or optimisation changes; only the loader call is skipped.
- Verified: `block-eq auto s268` (ran everything: thread.js is shared engine code): 636 of 638 blocks identical in every mode; Monitors Plus "make variable" / "delete variable" differed in the page run, identical in every mode in two isolated page reruns of the same build (state left by an earlier job). · Not verified: —
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

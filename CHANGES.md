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

### Session 271 — Four small per-thread costs removed (2026-11-13)
- Asked: scheduler study cause 5 as one change: THREAD_FINISHED and HATS_STARTED only with a listener, plain loop in startHats, shared empty procedures object, local loop index in stepThreads.
- Changed: section 252 (VM e0d2247, `sequencer.js`, `thread.js`, `runtime.js`, `compile.js`, `upstream.json`). To reverse: `git revert` the merge.
- Measured: sched-study `ablate.sh` 6 rounds, ours before → after (runs/s): pingpong 303 → 323, fanout 821 → 886, fanwait 839 → 880, clonechurn 127 → 124 (noise), threads 21078 → 22626. +5 to +8%: below the hoped ~10%.
- Extension check: no block calculation changes; HATS_STARTED still reaches Events Expansion and Messages-Plus (listener check), which block-eq covers.
- Verified: grep found no dependent of any piece; `block-eq auto s271` (everything): 1659 + 638 blocks identical in every mode, 0 jobs differ from s270b · Not verified: nothing else
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

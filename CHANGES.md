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

### Session 269 — Thread loop skips event lookups when nobody listens (2026-11-13)
- Asked: remove the per-thread lookups of the four thread events from the scheduler loop when nobody listens, keeping the events working (cause 3 of the MistWarp scheduler study).
- Changed: section 250 (VM fb3b908, `sequencer.js`, `upstream.json`): flag `pmThreadEvents`, recomputed per pass plus a `newListener` hook. To reverse: `git revert` the merge.
- Measured: sched-study `ablate.sh` 6 rounds, ours before → after (runs/s): threads 12466 → 21723 (+74%, MistWarp 18651); pingpong, fanout, fanwait, clonechurn unchanged within noise.
- Extension check: no calculation, timing or optimisation change; no shipped extension listens to these events.
- Verified: listeners still get all four events per step in both compiler modes, AFTER_THREAD_CONSIDERED after a finished thread, flag on at once when added and off after removal; `block-eq auto s269` (everything): 1659 + 638 blocks identical in every mode. · Not verified: —
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

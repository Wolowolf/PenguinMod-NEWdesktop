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

### Session 274 — Plain Map for the thread map (2026-11-13)
- Asked: scheduler study cause 6b: replace the ThreadMap subclass (section 168) with a plain Map plus a changed flag; stop if anything outside the VM writes to the map. It did (SharkPool Extra Controls in the offline gallery); you said go ahead with a size check as safety net and a test referee.
- Changed: section 255 (VM 0905627: `runtime.js`, `sequencer.js`, `pm_eventsExpansion`, bundled Extra Controls). To reverse: `git revert` the merge.
- Measured: sched-study `ablate.sh` 6 rounds, ours/MistWarp before → after (runs/s): clonechurn 206/247 → 213/237 (gap x1.20 → x1.11), pingpong 538/703 → 602/735 (x1.31 → x1.22), fanout 2599 → 2702, fanwait 2674 → 2682, threads 22135 → 23095 (MistWarp moved 1-4 % too: noise).
- Verified: referee (`bench\threadmap-referee.js`: rebuilds the map every tick and compares; clones, broadcasts with restarts, broadcast and wait, stop other scripts, delete clone, Extra Controls "run async") 0 differences, same result as the old code; stray write/delete repaired; with the size check sabotaged a stray entry stays and the referee flags it. block-eq auto s274 (everything) 1659 + 638 blocks identical in every mode, 0 jobs differ from s273 · Not verified: nothing beyond the CI build
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

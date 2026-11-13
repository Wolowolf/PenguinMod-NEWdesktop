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

### Session 270 — Scheduler reads its clock every few ticks (2026-11-13)
- Asked: port TurboWarp's adaptive work-time check into `Sequencer.stepThreads()`, keeping redraw and thread-count checks every tick (scheduler study cause 4).
- Changed: section 251 (VM b964aa5, `sequencer.js`, `upstream.json`). To reverse: `git revert` the merge.
- Measured: sched-study `ablate.sh` 6 rounds, ours before → after (runs/s, MistWarp before → after): pingpong 302 → 316 (714 → 758), fanout 834 → 874 (1998 → 1979), fanwait 815 → 884 (2004 → 1986), clonechurn 133 → 140 (239 → 245), threads 21440 → 21714. Against MistWarp: fanout +6%, fanwait +9%, clonechurn +3%, pingpong and threads unchanged; well below the study's 1.24x/1.15x/1.11x. Test app, light forever loop: 255k → 401k ticks per frame.
- Extension check: only how often the clock is read changes; block results are the same, ticks per frame can differ (timing).
- Verified: frame rate kept at 30, turbo, 60 and screen rate with one heavy tick per 50; light-to-heavy switch mid-frame: one ~85 ms frame; `block-eq auto s270b s269` (everything): 1659 + 638 blocks identical in every mode · Not verified: the old build's light-to-heavy frame (reasoned ~30 ms)
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

# CHANGES.md — open points and the last session

Printed by `tweak.mjs start`; kept short on purpose. Grep-only: `docs/STATE.md` (current state of the app, build, releases and tools), `docs/CHANGES-archive.md` (every session in full, newest first), the other docs listed in `CLAUDE.md`.

## Open points

- **Not verified yet:**
  - The updater's window and its downloads from a real release while installing a new offline library or packager Electron (its install steps are checked by the local `updater-check.cjs`, Session 116; an update itself worked end to end in Session 30).
  - Opening a `.2DC` by double-click (the test app cannot be started by Windows with a file; a second start of the test app with a file opens it in a new window, Session 235; a saved file's bytes loaded in a fresh app keep the category order, Session 116).
- **Ideas offered, not applied** (offer when relevant):
  - Make the stage's WebGL context after the rest of the first render: at most ~700 ms off the editor's start (`docs/BENCH-BASELINE.md` "Start-up").
  - Code area (Sessions 329, 349, `docs/BENCH-BASELINE.md` "Code-area drawing"): drawing a block draws every block above it in its script (typing 300 blocks down a script: ~300 drawings per key; probably also why long scripts load 3–4 × slower): stop going up when a block's size did not change; zooming lays out all visible text again. A Canvas 2D drawing of blocks was planned (Session 329 archive: inventory, architecture, 10 steps) and set aside for culling.
  - Loading like a game engine: "load on first use" is done (sections 162, 164, 165). Not chosen so far: scenes, asset groups, sprites on demand, streaming.

## Last session (written by `tweak.mjs finish`; the full entry is at the top of the archive)

### Session 349 — Code-area drawing, second round (2026-11-20)
- Asked: three parts (Blocks fork), measured before/after, keep only gains: 1 better off-screen hiding, 2 remember text widths (redo when fonts load), 3 typing draws at most once per frame.
- Changed: section 331 (GUI 5440951) + `app/preload.js`. Part 1: hiding checks reuse each script's block positions until something is drawn; script sizes reused; app link watcher and paint-tool-panel addon no longer search the whole page on every change. Part 2: widths were already kept for the whole session (0 measurements on load/zoom), so no speed gain; but 150 of 309 were wrong after a normal start: now re-measured when fonts load or styles change. Part 3: typing draws once per frame (was 3 × per key). Found bug: getMainWorkspace() returned a dead workspace after Make a Block; fixed. Done in GUI (the Blocks fork is a compiled bundle; section 312 lives in GUI). To reverse: `git revert` the merge and the fork commit.
- Verified: 300 blocks down a 1,000-block script, 60 keys: 12.0 s → 4.7–5.8 s, drawings 54,237 → ~17,000; scroll JS 2.4 s → 0.32 s; zoom busy 4.7 → 3.6–4.0 s; load unchanged; section 312 checks, typing/paste/drag/Tab/Esc/Make a Block/find bar, widths 0 wrong · Not verified: minimised window, right-to-left, touch (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

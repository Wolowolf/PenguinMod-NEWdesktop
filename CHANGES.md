# CHANGES.md — open points and the last session

Printed by `tweak.mjs start`; kept short on purpose. Grep-only: `docs/STATE.md` (current state of the app, build, releases and tools), `docs/CHANGES-archive.md` (every session in full, newest first), the other docs listed in `CLAUDE.md`.

## Open points

- **Not verified yet:**
  - The updater's window and its downloads from a real release while installing a new offline library or packager Electron (its install steps are checked by the local `updater-check.cjs`, Session 116; an update itself worked end to end in Session 30).
  - Opening a `.2DC` by double-click (the test app cannot be started by Windows with a file; a second start of the test app with a file opens it in a new window, Session 235; a saved file's bytes loaded in a fresh app keep the category order, Session 116).
- **Ideas offered, not applied** (offer when relevant):
  - Make the stage's WebGL context after the rest of the first render: at most ~700 ms off the editor's start (`docs/BENCH-BASELINE.md` "Start-up").
  - Code area (Sessions 329, 349, `docs/BENCH-BASELINE.md` "Code-area drawing"): zooming lays out all visible text again. A Canvas 2D drawing of blocks was planned (Session 329 archive: inventory, architecture, 10 steps) and set aside for culling. Tried and dropped (Session 351, `docs/BENCH-BASELINE.md` "Round pills as rects, light fields"): round pills as `<rect rx>` (slower on the main thread), light number/text fields (about 5 % of load at most).
  - Loading like a game engine: "load on first use" is done (sections 162, 164, 165). Not chosen so far: scenes, asset groups, sprites on demand, streaming.

## Last session (written by `tweak.mjs finish`; the full entry is at the top of the archive)

### Session 356 — Hat tops jagged: crisp rule fixed (2026-11-20)
- Asked: hat block tops look jagged, fix it.
- Changed: section 337 (Blocks): section 333's crispEdges rule matched every block path (they share the class blocklyBlockBackground with dropdown boxes); now only `rect.blocklyBlockBackground`. To reverse: revert the fork commit and `upstream.json`.
- Verified: computed shape-rendering of all 662 block paths: 342 slanted ones auto, 103 square ones crispEdges, 217 square auto are empty hidden slot outlines; dropdown boxes crisp; hat top, notches, hexagons, round ends smooth in a 2× screenshot; seam test (6 display scales × 6 zooms) 0 except the known scrollbar-edge line · Not verified: real Windows display-scale change (emulated).
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

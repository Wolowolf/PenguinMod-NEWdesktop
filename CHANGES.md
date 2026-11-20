# CHANGES.md — open points and the last session

Printed by `tweak.mjs start`; kept short on purpose. Grep-only: `docs/STATE.md` (current state of the app, build, releases and tools), `docs/CHANGES-archive.md` (every session in full, newest first), the other docs listed in `CLAUDE.md`.

## Open points

- **Not verified yet:**
  - The updater's window and its downloads from a real release while installing a new offline library or packager Electron (its install steps are checked by the local `updater-check.cjs`, Session 116; an update itself worked end to end in Session 30).
  - Opening a `.2DC` by double-click (the test app cannot be started by Windows with a file; a second start of the test app with a file opens it in a new window, Session 235; a saved file's bytes loaded in a fresh app keep the category order, Session 116).
- **Ideas offered, not applied** (offer when relevant):
  - Make the stage's WebGL context after the rest of the first render: at most ~700 ms off the editor's start (`docs/BENCH-BASELINE.md` "Start-up").
  - Code area (Sessions 329, 349, `docs/BENCH-BASELINE.md` "Code-area drawing"): drawing a block draws every block above it in its script (typing 300 blocks down a script: ~300 drawings per key; probably also why long scripts load 3–4 × slower): stop going up when a block's size did not change; zooming lays out all visible text again. A Canvas 2D drawing of blocks was planned (Session 329 archive: inventory, architecture, 10 steps) and set aside for culling. Tried and dropped (Session 351, `docs/BENCH-BASELINE.md` "Round pills as rects, light fields"): round pills as `<rect rx>` (slower on the main thread), light number/text fields (about 5 % of load at most).
  - Loading like a game engine: "load on first use" is done (sections 162, 164, 165). Not chosen so far: scenes, asset groups, sprites on demand, streaming.

## Last session (written by `tweak.mjs finish`; the full entry is at the top of the archive)

### Session 352 — Blocks without outline, zebra without filter, crisp square shapes (2026-11-20)
- Asked: remove block outlines in code area and palette; optimise "Alternating nested block colors" to precomputed colours (asked: stays off by default); crispEdges for fully square shapes only; check zoom levels and display scales for gaps or seams.
- Changed: section 333 (Blocks, GUI): no stroke on blocks, slots, in-block dropdown boxes; a hidden 1 px overlap where blocks touch (stack, C mouths); zebra colours precomputed, CSS removed; crispEdges on square paths/slots, scrollbars, buttons, checkboxes, grid, run bar, zoom buttons, comments. To reverse: revert the two fork commits and `upstream.json`.
- Verified: seam count (magenta background, 6 display scales × 6 zooms) 50–670 pixels without the overlap, 0 with it (except a scrollbar-edge test artifact); zebra colours equal the browser's filter (#FFAB19→#f5cd41), darker, unnest/renest, menus, in-block dropdown, off/on all correct, no filters left · Not verified: a real mouse drag, real Windows display-scale change (emulated), the search popup still draws outlines (not asked).
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

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

### Session 350 — Lazy block palette (2026-11-20)
- Asked: build only the palette categories near the visible part, reuse built blocks across sprite switches, no stutter/blank on far jumps, no scroll jumps, keep search/category list/adding extensions; measure before/after; delete Editor Tweaks' "Toggle scrolling animation in the Toolbox".
- Changed: section 332 (GUI 4f863c7): new `pm-lazy-palette.js`; editor-animations scans the page once per palette build (was once per button: 1.3 s of 4 sprite switches); found bug: with many categories the category list's scroll bar covered 16 px of the palette (titles cut, "ile Grids"), fixed in `Toolbox.getWidth`; setting removed. To reverse: `git revert` the merge and the fork commit.
- Verified (38 extensions, 49 categories, 858 palette blocks): refresh with nothing changed 130 → 7–18 ms; sprite switch 930 → 200–350 ms (toolbox update 150 → 40–70 ms); heap 100–122 → 60–85 MB; jumps unchanged (~470 ms animation, 0 blank at target); wheel through a cold palette 0 blanks; search, clicks, drag, extensions, language, variables, checkboxes, addon reload, hidden tab, project load · Not verified: right-to-left, touch, Block Pins with real pins (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

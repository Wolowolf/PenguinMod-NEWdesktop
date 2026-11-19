# CHANGES.md — open points and the last session

Printed by `tweak.mjs start`; kept short on purpose. Grep-only: `docs/STATE.md` (current state of the app, build, releases and tools), `docs/CHANGES-archive.md` (every session in full, newest first), the other docs listed in `CLAUDE.md`.

## Open points

- **Not verified yet:**
  - The updater's window and its downloads from a real release while installing a new offline library or packager Electron (its install steps are checked by the local `updater-check.cjs`, Session 116; an update itself worked end to end in Session 30).
  - Opening a `.pmp` by double-click (the test app cannot be started by Windows with a file; a second start of the test app with a file opens it in a new window, Session 235; a saved file's bytes loaded in a fresh app keep the category order, Session 116).
- **Ideas offered, not applied** (offer when relevant):
  - Make the stage's WebGL context after the rest of the first render: at most ~700 ms off the editor's start (`docs/BENCH-BASELINE.md` "Start-up").
  - Loading like a game engine: "load on first use" is done (sections 162, 164, 165). Not chosen so far: scenes, asset groups, sprites on demand, streaming.

## Last session (written by `tweak.mjs finish`; the full entry is at the top of the archive)

### Session 326 — Lighter drawing (2026-11-19)
- Asked: research every way to cut drawing cost, then do every change without drawbacks (choices by card) and list the rest.
- Changed: section 309 (Blocks 65db413, GUI ed51730): square corners and boxes, triangle notches, triangle hat tops (corner to corner), dropdown arrows as paths, run/error glow replaced by a yellow/red bar on the script's left side, grid as one square per cell, solid drop ghost (Lines colour), no shadows/blur on dragged/hovered sprites, comment previews, crossed-out emoji; placeholders display:none; unchanged block outlines not rewritten. To reverse: `git revert` the merge.
- Verified: test app with the Block shape addon on and off: block paths square with triangle notches and full-width hat triangles, no arc in stack/C/hat/define paths, 0 glow filters, grid = 1 rect, bar appears on green flag (height = stack) and goes on stop, error bar red, drop ghost = --ui-edge at opacity 1, no console errors · Not verified: switching the Block shape addon off while the editor is open; blocks2image export look.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

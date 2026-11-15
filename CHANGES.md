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

### Session 285 — Monitor font options, themed ask dropdown (2026-11-15)
- Asked: do the logical changes from the Variables & Lists / ask prompt review against the Custom styles addon.
- Changed: section 268 (GUI f373a8a): Custom styles gets "Monitor font" and "Monitor text size (%)"; the font blocks stay (per monitor, packaged games). Section 269 (VM ebe097a): Hyper Sense V2's ask dropdown copies the ask input's colours, border and roundness. To reverse: `git revert` the merge.
- Verified: test app: addon Pixel at 150 % gives Pixel, 18 px on a variable monitor; Variables & Lists set font/size blocks still override it (serif, 20 px); default settings emit no font CSS; dropdown with addon ask colours matches the input (bg, text, 3 px border, 7 px roundness); two dropdown calls leave one dropdown; no new console errors. · Not verified: list monitors with the size option by eye, a packaged game's dropdown.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

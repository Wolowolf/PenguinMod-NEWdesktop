# CHANGES.md — open points and the last session

Printed by `tweak.mjs start`; kept short on purpose. Grep-only: `docs/STATE.md` (current state of the app, build, releases and tools), `docs/CHANGES-archive.md` (every session in full, newest first), the other docs listed in `CLAUDE.md`.

## Open points

- **Not verified yet:**
  - The updater's window and its downloads from a real release while installing a new offline library or packager Electron (its install steps are checked by the local `updater-check.cjs`, Session 116; an update itself worked end to end in Session 30).
  - Opening a `.pmp` by double-click (the test app cannot be started by Windows with a file; a second start of the test app with a file opens it in a new window, Session 235; a saved file's bytes loaded in a fresh app keep the category order, Session 116).
- **Ideas offered, not applied** (offer when relevant):
  - Make the stage's WebGL context after the rest of the first render: at most ~700 ms off the editor's start (`docs/BENCH-BASELINE.md` "Start-up").
  - Code area (Session 329, `docs/BENCH-BASELINE.md` "Code-area drawing"): long scripts load 3–4 × slower than the same blocks in short scripts (cause not looked at); zooming lays out all visible text again. A Canvas 2D drawing of blocks was planned (Session 329 archive: inventory, architecture, 10 steps) and set aside for culling.
  - Loading like a game engine: "load on first use" is done (sections 162, 164, 165). Not chosen so far: scenes, asset groups, sprites on demand, streaming.

## Last session (written by `tweak.mjs finish`; the full entry is at the top of the archive)

### Session 336 — Type shapes of the TurboWarp gallery extensions (2026-11-19)
- Asked: classify every block of the bundled gallery extensions by the type-shape rules and fix wrong ones. Split by VM folder (about 600 reporters, 1,800 inputs in all): TurboWarp here; SharkPool and PenguinMod are their own tweaks (proposed as sessions).
- Changed: section 319 (VM ee72258): 36 reporters that never give a number square (JSON lists/objects, data URLs, zip paths, case of, 2g/3g/4g, connection type, blend mode, Simple 3D texture status and font, Pen+ version); 12 inputs round (finger ID and open-window number menus, Steam DLC ID, Simple 3D anisotropy, primitive size, alpha test). To reverse: `git revert` the merge.
- Found: the engine turns every number/angle/note argument into a number before an extension sees it, so number inputs are round by themselves; only number menus needed a shape.
- Verified (test app): 57 shapes in the palette (all changed blocks + controls), drop rule (case of refused by move steps, fits say; join fits the Steam ID; add fits the finger menu), real drags (case of refused by move steps, reverse text snapped into the Steam ID), a saved mismatch still loads; block-eq: 249 blocks + 144 page blocks identical in every mode · Not verified: right-to-left layout.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

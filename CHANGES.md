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

### Session 338 — Type shapes of the SharkPool gallery extensions (2026-11-19)
- Asked: classify every block of the 29 SharkPool gallery extensions by the type-shape rules and fix wrong ones (second of three gallery parts; PenguinMod is next in the queue).
- Changed: section 321 (VM 773382c): 83 reporters that never give a number square (JSON lists/objects, data URLs, SVG texts, #rrggbb colours, monitor type, note name, hh:mm:ss, country name, key-bind JSON, clone ID); 6 inputs round (Extra Controls repeat counts, Gamepad button/axis number menus). To reverse: `git revert` the merge.
- Found (not changed): Gamepad's "any" pad and "any" button never match, because the engine turns the text "any" in these number menus into 0 (checked with a fake gamepad).
- Verified (test app): 101 flyout/definition shapes as expected, drop rule (shapeFits_) for 9 pairs; block-eq 356 + 156 page blocks identical in every mode · Not verified: a real mouse drag, a real gamepad.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

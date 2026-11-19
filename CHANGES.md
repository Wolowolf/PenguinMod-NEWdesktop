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

### Session 331 — Octagon, custom shapes, unused notches and custom value saving removed (2026-11-19)
- Asked: make Crypto and Rigidbodies round, remove the octagon, the custom shape table, the unused custom notches and the dead custom value saving.
- Changed: section 314 (Blocks a9f4adb, VM 9edefd9, GUI 6061d9f, galleries 4e47020 eab0db9); only round, hexagon and square remain; switchCase notch kept (switch/case blocks). To reverse: `git revert` the merge.
- Verified (test app): only shapes 1–3, CUSTOM_SHAPES and outputLeftPadding_ gone, notches [switchCase]; Crypto and Rigidbodies reporters round (14 round, 2 Boolean); case block inside switch with its notch; Rigidbodies body inside its own input; real drags (stack snap, reporter out of and into an input); save + reload keeps a variable and a list; no console errors · Not verified: offline galleries (not in the test app; files syntax-checked), Block shape addon with changed sizes, block-eq (no calculation changed).
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

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

### Session 353 — Edits redraw only affected blocks (2026-11-20)
- Asked: fix "each keystroke still redraws every block above the field" (idea in CHANGES.md).
- Changed: section 334 (Blocks): a block asks its parent to redraw only if its size, parent or next block changed; ancestors further up a stack are skipped; collapse/expand redraws the block itself. Also fixed: collapsed blocks showed stray 1 px seam strips from their hidden contents (section 333). To reverse: revert the fork commit and `upstream.json`.
- Verified: 18 edit cases (field widen/shrink/same size, attach, detach, heal, cap at stack end, reporter in/out, collapse, expand, disable) drawn the same as a fresh reload (original code: 4 cases left stale); typing 301 blocks down: 17,574 → 176 drawings, busy 5.3 → 2.4 s; collapsed block screenshot clean · Not verified: real mouse drags with insertion markers (covered only through connect/disconnect calls); load speed unchanged (load draws each block once).
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

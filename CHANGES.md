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

### Session 330 — Unused reporter shapes removed (2026-11-19)
- Asked: delete every unused block shape everywhere; say which optimisation this opens; say if anything still uses arrays, maps etc. without showing it.
- Changed: section 313 (Blocks 38610c7, VM 41e431b): leaf, plus, bumped, indented, scrapped, arrow, ticket and custom shape registration removed; unknown shapes fall back to the default. Kept: square (stack blocks, polygon/custom inputs), octagonal (Crypto, Rigidbodies), custom notches (unused, offered separately). To reverse: `git revert` the merge.
- Verified (test app): only shapes 1, 2, 3, 6 exist, custom table holds only 6; Crypto and Rigidbodies blocks draw octagonal in the palette and inside number/text inputs; hexagon, round, square blocks normal; a test extension with shapes 4, 5, "leaf" and input shape 9 draws round, no console errors · Not verified: block-eq (shapes only reach the Blocks library's drawing, never block answers), Block shape addon with its size settings changed.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

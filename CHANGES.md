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

### Session 337 — Matrix, empty and polygon inputs removed (2026-11-19)
- Asked: delete everything about the matrix input and its one use, make Crypto work without "empty" and delete it too, remove both from My Blocks+; re-check arrays/objects for more to delete.
- Changed: section 320 (VM 4c5553f, Blocks 53e93d2, GUI 6b11c62, pm 1c5c46a + sp da2713b galleries): matrix + polygon types, blocks and field gone; My Blocks+ menu without matrix/empty; Crypto keys are text inputs; custom object monitor displays and "set list to array"'s array branch removed. To reverse: `git revert` the merge.
- Found: the gallery's "matrix" use was an SVG colour filter, not an input; no extension used matrix or polygon; EMPTY never existed (unknown type = reporter-only slot).
- Verified (test app): matrix/polygon blocks gone; Crypto keys text (AES round trip, HMAC verify true, empty key ""); My Blocks+ menu norm/num/bool/ang/col/note, new inputs draw; list monitor + editor work; block-eq 1317 + 571 blocks new = old; compiler proofs all ok · Not verified: right-to-left layout, packaged game.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

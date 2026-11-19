# CHANGES.md — open points and the last session

Printed by `tweak.mjs start`; kept short on purpose. Grep-only: `docs/STATE.md` (current state of the app, build, releases and tools), `docs/CHANGES-archive.md` (every session in full, newest first), the other docs listed in `CLAUDE.md`.

## Open points

- **Not verified yet:**
  - The updater's window and its downloads from a real release while installing a new offline library or packager Electron (its install steps are checked by the local `updater-check.cjs`, Session 116; an update itself worked end to end in Session 30).
  - Opening a `.2DC` by double-click (the test app cannot be started by Windows with a file; a second start of the test app with a file opens it in a new window, Session 235; a saved file's bytes loaded in a fresh app keep the category order, Session 116).
- **Ideas offered, not applied** (offer when relevant):
  - Make the stage's WebGL context after the rest of the first render: at most ~700 ms off the editor's start (`docs/BENCH-BASELINE.md` "Start-up").
  - Code area (Session 329, `docs/BENCH-BASELINE.md` "Code-area drawing"): long scripts load 3–4 × slower than the same blocks in short scripts (cause not looked at); zooming lays out all visible text again. A Canvas 2D drawing of blocks was planned (Session 329 archive: inventory, architecture, 10 steps) and set aside for culling.
  - Loading like a game engine: "load on first use" is done (sections 162, 164, 165). Not chosen so far: scenes, asset groups, sprites on demand, streaming.

## Last session (written by `tweak.mjs finish`; the full entry is at the top of the archive)

### Session 347 — No blurred shadows, flat colours (2026-11-20)
- Asked: GUI CSS pass: remove blurred shadows (1 px Lines border where needed), gradients to flat colours, list what remains; CSS containment split off into its own session (gui-contain).
- Changed: section 329 (GUI d4172aa, Blocks 0efe900, Paint cdb6756, Packager ad9ee41): ~35 blurred shadows removed, 3 new Lines borders, category label outline unblurred, received-blocks flash a solid ring; costume list fade removed, trim stripes, checkerboards, better-comments and studio shimmer flat. To reverse: `git revert` the merge and the fork commits.
- Verified: test app: CSSOM scan of all loaded sheets finds no blurred shadow, backdrop blur or gradient left; File menu, block dropdown (shadow none, border), costume list, category labels and packager cards (shadow none, 1 px border) checked by screenshot or computed style · Not verified: addon styles not loaded by default (middle-click popup, onion skin, snap, paint tool panel), light theme (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

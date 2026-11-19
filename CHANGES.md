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

### Session 335 — Type shapes of the built-in engine extensions (2026-11-19)
- Asked: classify every block of the built-in engine extensions by the type-shape rules and fix wrong ones.
- Changed: section 318 (VM a28e6f6): 7 reporters that never give a number square (rotation style, simplify ratio, grab color, 3 Prism data URLs, tailgating position JSON); drum, instrument and mouse button menus round; pen font weight square. The 13 shipped extensions only; the 3 gallery folders are the next audit. To reverse: `git revert` the merge.
- Verified (test app): all 11 changed shapes, shapeFits_ (grab color refused by move steps, accepted by say; rotation style refused by drum, tempo and join accepted; JSON position fits font weight, not font size); real drags: grab color refused by the drum input, tempo snapped in; block-eq (7 extensions): 82 blocks + 14 page blocks identical in every mode · Not verified: right-to-left layout.
- Open question: jwProto's placeholder reporter "..." always answers "" (square by the rule) but is meant to stand in anywhere: left round.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

# CHANGES.md — open points and the last session

Printed by `tweak.mjs start`; kept short on purpose. Grep-only: `docs/STATE.md` (current state of the app, build, releases and tools), `docs/CHANGES-archive.md` (every session in full, newest first), the other docs listed in `CLAUDE.md`.

## Open points

- **Not verified yet:**
  - The updater's window and its downloads from a real release while installing a new offline library or packager Electron (its install steps are checked by the local `updater-check.cjs`, Session 116; an update itself worked end to end in Session 30).
  - Opening a `.2DC` by double-click (the test app cannot be started by Windows with a file; a second start of the test app with a file opens it in a new window, Session 235; a saved file's bytes loaded in a fresh app keep the category order, Session 116).
- **Ideas offered, not applied** (offer when relevant):
  - Make the stage's WebGL context after the rest of the first render: at most ~700 ms off the editor's start (`docs/BENCH-BASELINE.md` "Start-up").
  - Code area (Sessions 329, 349, `docs/BENCH-BASELINE.md` "Code-area drawing"): drawing a block draws every block above it in its script (typing 300 blocks down a script: ~300 drawings per key; probably also why long scripts load 3–4 × slower): stop going up when a block's size did not change; zooming lays out all visible text again. A Canvas 2D drawing of blocks was planned (Session 329 archive: inventory, architecture, 10 steps) and set aside for culling. Tried and dropped (Session 351, `docs/BENCH-BASELINE.md` "Round pills as rects, light fields"): round pills as `<rect rx>` (slower on the main thread), light number/text fields (about 5 % of load at most).
  - Loading like a game engine: "load on first use" is done (sections 162, 164, 165). Not chosen so far: scenes, asset groups, sprites on demand, streaming.

## Last session (written by `tweak.mjs finish`; the full entry is at the top of the archive)

### Session 351 — Round pills and light fields measured, not applied (2026-11-20)
- Asked: Blocks fork: 1 draw the round pill of round inputs and reporters as a rect with rx = half its height; 2 turn default number/text fields (shadow blocks) into one light shape in the parent block, measuring first and asking before the rewrite if the gain is small.
- Changed: nothing in the app or forks; docs only (`docs/BENCH-BASELINE.md` "Round pills as rects, light fields", the code-area idea in Open points). Bench helpers: `blocks-trace.mjs` `--noshadow` / `--after`, `bench\s351\`, `bench\patch-round-pill.mjs`.
- Verified: 1 built and measured: looks the same (edge anti-aliasing only) but 200 × 25 scroll busy +46 %, zoom +61–86 % (same build forced back to paths: back to the old numbers), so undone. 2 a light field saves about 5 % of load at most (the shadows' own SVG work is ~420 ms of 8.5 s), scroll/zoom within noise in an in-page experiment: rewrite not started · Not verified: GPU raster time (not measured).
- Result after build: docs only, nothing built

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

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

### Session 324 — Share copied code in Paint and paint-snap (2026-11-18)
- Asked: share the copies bench\dup-funcs.cjs finds between the paint-snap addon and Paint, and inside Paint (colour indicators, rect reducers, input HOCs, brush/eraser, select tools, line/pen, compound-path/group, colour picker, selection.js).
- Changed: section 307 (Paint d450221, GUI d586b64): paint-snap uses Paint's helpers and scale-drag methods (its helpers.js deleted); one shared copy for each listed pair. Savable duplicate lines 234 -> 26. To reverse: `git revert` the merge.
- Verified: test app, new bench\s324-paint.steps (snap move/scale, scale/skew/alt/shift/flip, line/pen joins, select all, group, vector + bitmap brush/eraser, fill/outline pickers incl. gradient 2nd colour and readout, stroke width / brush size / costume name inputs, bitmap select + fill) and paint-shape-tools.steps: old vs new identical (241/242, the other a save-timing line that matched on a rerun), screenshots byte-identical; snap to centre on a 960x360 stage · Not verified: nothing else known.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

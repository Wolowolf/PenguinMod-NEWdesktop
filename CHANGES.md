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

### Session 320 — Iris Text on the renderer's WebGL context, shared shader loader (2026-11-18)
- Asked: code sharing 9/9: let Iris Text, Lighting, Pen+ and Simple 3D share the renderer's WebGL context and shader setup where safe; say first if one can't without changing its look; drawing must look the same.
- Changed: section 303 (VM 4b04c77): Iris draws on the renderer's context into its own skin texture (no second context, no canvas copies); new util/gl-program.js (renderer's twgl) for Iris and Simple 3D; Pen+'s unused compiler removed; Lighting's GL setup once. Not shared: Simple 3D (own GL state, antialiasing option), Lighting (worker thread); Pen+ already shared. To reverse: `git revert` the merge.
- Verified: test app, old vs new build: Iris 24 steps x 2 sprites (texture pixels, size, centre, filtering, stage pixels) identical; touching differs only where 2 Iris sprites updated together (old shared-canvas bug fixed); Simple 3D 5 + Lighting 8 pictures identical (worker, main thread, resize); hooks-render-check 28 ok; edge cases no GL errors; block-eq 182 blocks identical · Not verified: context loss, packaged games, other GPUs.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

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

### Session 284 — Dead and legacy code removed (2026-11-15)
- Asked: fix or delete everything Session 283's scan found, except the hidden built-in blocks.
- Changed: section 267 (VM b1eb038, Blocks 45cbe65): GIF dither fixed; unused menus, deprecation regions, Box2D hidden labels, unused helpers, engine leftovers and the two unused Blocks menus removed. To reverse: `git revert` the merge.
- Verified: unit tests desktop_block_inventory (104) and engine contacts pass; every block of the changed extensions keeps its function; test app: all 19 changed extensions load with no console errors, palette fine; verify-compiler s284: fuzz nothing new (3 runs), vm-regress 0 changed; timer-off run and block-eq timed out on a stuck test app, rerun on a fresh app: timer-off 0 changed, block-eq new vs old 0, new vs interp only the 3 known, page test 0. · Not verified: GIF export with each dither by hand.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

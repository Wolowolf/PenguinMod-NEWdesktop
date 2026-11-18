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

### Session 316 — Shared sprite menus and lookup (2026-11-18)
- Asked: code sharing 5/9: one shared runtime helper for the extensions' sprite menus and one for "find sprite by name"; menu contents and order unchanged per extension.
- Changed: section 299 (VM 7126005): runtime getSpriteNames, getSpriteMenu, getTargetFromMenu; 24 extensions build their sprite menus with them, 15 resolve menu values with getTargetFromMenu (27 places). To reverse: `git revert` the merge.
- Verified: in the test app, old build vs new build, every menu of the 24 extensions + 8 lookup functions with 11 odd values, 3 cases (editing a sprite / the stage / no sprites left; renamed + reordered sprites, clones): 390 entries, 0 differ apart from fresh sprite IDs in a menu not touched; block-eq (ONLY = the 24 extensions): 422 blocks + 163 page blocks identical in every mode; the 5 extensions that differed from the old full run (layer numbers, pen state: fewer extensions loaded) identical old vs new with the same set loaded · Not verified: lighting's settings dialog by hand.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

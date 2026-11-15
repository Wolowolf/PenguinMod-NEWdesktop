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

### Session 283 — Left-out menu values: code removed; legacy scan (2026-11-15)
- Asked: delete the code of the values left out in section 265; search the VM and extensions for other legacy, broken or always hidden blocks and code, report back.
- Changed: section 266 (VM e0fd268, Render e90bf83): 3D Math parsed switch, Dictation codes, smoothing tan, legacy blend modes removed. To reverse: `git revert` the merge. Search: report only (`bench\legacy-scan.mjs`), nothing else deleted.
- Verified: all changed files parse; test app: smoothing sin / cos equal Math.sin / cos; block-eq auto s283 (everything, Render changed): new vs old 0, new vs guarded 0, new vs interp only the 3 known (SPtempVars expected, orIfFalsey / ifIsTruthy older type difference), page test 0 in every mode. · Not verified: Clipping & Blending "blend mode" called by hand (my direct call got no sprite; covered by block-eq).
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

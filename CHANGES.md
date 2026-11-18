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

### Session 313 — Shared easing table (2026-11-18)
- Asked: code sharing 2/9: one shared easing (tween curve) table in the VM for jg_tween and Iris Text, usable by future animation blocks; exactly the same numbers.
- Changed: section 296 (VM c22a269): new extension-support/easing.js; jg_tween/index.js and Gen1x/iris-text.js use it (−227 lines in the two extensions). Local block-eq.mjs auto now also finds extensions without an inventory source through extension-manager.js (jgTween was mapped to "everything"). To reverse: `git revert` the merge.
- Verified: old copies vs shared table: 11.9 million values (every curve × 9 directions × normal and odd inputs: NaN, ±Infinity, strings, null, huge numbers), 0 differ (Object.is); test app: Tween and Iris Text load, tweenValue for 6 modes × 3 directions equals the old code; block-eq auto (jgTween, Iris Text, plus Zip/Face Sensing from the older base; every mode + page test): 87 blocks identical in every mode, page test 78 blocks, 0 differ.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

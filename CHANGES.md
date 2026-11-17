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

### Session 301 — 3D Math V2 subtraction answers two numbers (2026-11-17)
- Asked: fix "V2: [a] − [b]" answering a third number (found in Session 300).
- Cause: `subV2` built `[a0 − b0, a1 − b1, a2 − b2]`; 2D vectors have no a2 / b2, so the third was NaN, shown as null (Node check in Session 300: "[1,2] + [3,4] × [2,2] − [1,1] / [1,2]" gave [6,9.5,null]).
- Changed: section 284 (VM 8a63a6c), `3DMath.js` subV2. To reverse: `git revert` the merge.
- Verified: `bench\s301\logic-check.cjs` (31 checks): that chain now [6,9.5], [5,7] − [1,2] = [4,5], 3-number inputs give 2 numbers like +, bad text [0,0]; modular = singles, compiled = interpreted. Test app: single and modular V2 − right compiled and interpreted. block-eq auto against s300: 77 3D Math blocks identical in every mode.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

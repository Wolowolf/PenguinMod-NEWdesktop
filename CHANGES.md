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

### Session 300 — Modular 3D Math vectors / quaternions and Random Utils "one of" (2026-11-17)
- Asked: 3D Math: modular V3 and V2 + − * / (* / before + −) and quaternion + − * (order kept, * first), "conjugate" as its own block, singles locked via the shared code; Random Utils: "50% chance of A or B" becomes the single of a modular "one of A, B, C…" with equal chances from runtime.pmRandom.
- Changed: section 283 (VM 0ff16bf): 3DMath.js, random_utils.js, block lists. To reverse: `git revert` the merge.
- Verified: `bench\s300\logic-check.cjs` (VM in Node, 28 checks): modular = nested singles, compiled = interpreted, i*j = k and j*i = −k, "one of" with 2 inputs = "50% chance" for the same random numbers, even spread over 30,000 and 50,000 picks (chi² 1.2 and 12.8). Test app: palette, menus, −/+, undo/redo, 13 answers right compiled and interpreted, save → reload identical. block-eq auto against s299: 126 blocks identical in every mode. · Not verified: real mouse clicks on −/+ (called directly).
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

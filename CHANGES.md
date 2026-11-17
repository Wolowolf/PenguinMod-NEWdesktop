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

### Session 299 — Modular Big Decimals blocks and True Fantom ≈ / ≉ chain (2026-11-17)
- Asked: Big Decimals: "^" instead of "to the power of"; modular maths, compare chain, max/min and bitwise blocks (singles by the shared code, big numbers kept); True Fantom Math: own modular ≈ / ≉ chain. Chosen: max/min has a menu per gap (no new plumbing, like every other modular block, "x max 0 min 100" clamps).
- Changed: section 282 (VM 2ea7750). To reverse: `git revert` the merge.
- Verified: `bench\s299\logic-check.cjs` (VM in Node, 35 cases incl. 2^53+1, 2^64−1, 1<<70): modular = nested singles, compiled = interpreted. Test app: palette, menus, −/+, undo/redo, 15 chains right compiled and interpreted, save → reload identical. block-eq auto (full, base was s295): 1,308 + 571 page blocks identical in every mode. · Not verified: real mouse clicks on −/+ (called directly); setup-state scan not run (its acorn copy is missing).
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

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

### Session 279 — Sharktilities "when changed" after 0 / empty / false (2026-11-14)
- Asked: review the hidden-block list (verdict: keep all; each one is shown inside another block, as a ready-made version, or after a button), then fix the "when changed" bug found there.
- Changed: section 262 (VM 5f33f1d): `Sharktilities.js` "when [] is changed" sees changes from 0, "" or false; "old value" shows 0 / false. To reverse: `git revert` the merge.
- Verified: test script (variable 0 -> 5 -> "" -> 7 -> false -> 1 -> 0 -> 0 -> 3 -> 3): old build counted 3 of 7 changes, new build 7 of 7 with correct old values, compiled and interpreted; repeats still ignored; block-eq auto (Sharktilities) equal. · Not verified: nothing else.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

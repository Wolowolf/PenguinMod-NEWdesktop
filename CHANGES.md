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

### Session 278 — Duplicate blocks removed, unique jobs moved (2026-11-14)
- Asked: do every keep/delete verdict of the duplicate-block review, moving what had no twin first (BigInt speed into Big Decimals, E2EE key exchange into Cryptography, Quaternions into 3D Math, Letter Case cases into Text, "sprite clicked?" into Utilities, Physics drives the Camera), and clean every trace.
- Changed: section 259 (VM 3486a6c, GUI de3ff12, galleries): 9 extensions and 129 blocks removed with menus, helpers, compiler entries, lists, texts, icons, translations; 14 blocks / options moved in; docs and local tests and benchmark projects switched to blocks that stay. To reverse: `git revert` the merge.
- Verified: all 115 extensions load, palettes valid; 31 feature checks in the app; Big Decimals 40,000 cases and quaternions 54,005 equal to the old code; verify-compiler all 6 steps ok (block-eq 0 differ); hook, hat, lazy, name-search, setup-reader checks ok; g9 direct calls: plain and guarded equal old in all 384 scenarios; changed benchmark projects run. · Not verified: gallery tiles on screen (no galleries in the test app).
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

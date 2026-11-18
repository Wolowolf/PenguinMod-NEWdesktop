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

### Session 321 — Shared definitions for the lookup blocks (2026-11-18)
- Asked: move the remaining extension blocks with separate compiled code (Variables Expanded data / search, Extra Timers, Clones+ variables, "is broadcast received") onto the shared definitions; a "site" lookup part (once per compiled script, per call interpreted); remove unused code; proofs.
- Changed: section 304 (VM 5905ad0): shared/ext-lookups.js (43 blocks, 46 helpers moved from jsexecute.js), `sites` in shared/index.js, jsgen / irgen write the shared text, extension methods are one-liners, getVarObjectFromName removed (VM +735 −1051 incl. the 515-line new file). To reverse: `git revert` the merge.
- Verified: compiled code before = after for 109 bench projects and every recorded script of the data / search / clones checks (only an unused helper class pmdNameAny no longer added); their answers before = after in every mode; block-eq auto s321: new vs old 0, page test 0 in every mode, new vs interp only the 2 known; verify-compiler s321 all 6 ok · Not verified: packaged games.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

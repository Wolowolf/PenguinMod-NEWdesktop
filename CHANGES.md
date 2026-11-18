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

### Session 311 — Shared definitions for extension blocks (2026-11-18)
- Asked: move the extension blocks the compiler handles apart from their function onto section 291's mechanism; list per extension first; remove unused code; block-eq auto and compiler proofs.
- Changed: section 294 (VM 9e57a82): shared/ext-expansions.js (34 blocks), ext-pure.js (31); pure-inline.js, 37 helper strings, pmsList and the extensions' own copies removed (VM diff +237 −759 plus 283 new lines). Left (already one definition or structure): direct calls, pen, branches/loops, Temporary Variables, My Blocks+, modular "or else". Still to do (own session): Variables Expanded, Extra Timers, Clones+, "is broadcast received". To reverse: `git revert` the merge.
- Verified: compiled code before = after for 109 bench projects and every script of core-eq --expansion, pure-inline-eq, datainline, name-search, clones-var checks (6,129 scripts), except 6 "true [empty operator]" scripts now direct calls (same answer); block-eq auto: 0 differ (1 known Temporary Variables case); verify-compiler s294 all 6 ok; unit tests as before. · Not verified: packaged games with the compiler off.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

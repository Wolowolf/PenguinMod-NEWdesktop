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

### Session 295 — Switch renamed to check / is / otherwise; modular "check" block (2026-11-17)
- Asked: rename switch/case/default/next case; a modular C-block "check" (+ adds "is" branches, last can be "otherwise", per-branch menu "is" / "is, also run next"), saved like the modular if, run with the single blocks' code; exit block must work inside.
- Changed: section 279 (Blocks a087937, VM dbfcf14, GUI 7c41565): texts (also "exit case" → "stop checking"; no language files have them); `control_expandableSwitch`: + adds an "is" branch above "otherwise", "otherwise" is a choice in the last branch's menu; compiled as the singles' switch/case nodes; the check blocks got interpreter code (they had none). Fixed on the way: "escape loop" in a check left only the check, "stop checking" in a loop in a branch left only the loop (labelled switch). To reverse: `git revert` the merge.
- Verified: test app: 17 structures × modular/single, 230 runs each in compiled and interpreted (fall-through, otherwise, no match, empty, nested, stop checking, continue/escape in loops, number vs text), all as expected and equal, again after save + reload; mouse: +, menu; +/−/menu/undo/redo/20 adds/30 removes/duplicate with editor = VM; verify-compiler: all 6 steps ok; block-eq (everything): new vs old 0, new vs interp only the 3 known. · Not verified: packaged game, the planned single/modular addon.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

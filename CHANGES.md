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

### Session 317 — Shared Box and BufferedInput (2026-11-18)
- Asked: code sharing 6/9: remove Paint's copies of GUI's Box, ComingSoon and BufferedInput HOC; one shared version; paint editor looks and works the same.
- Changed: section 300 (Paint 08a17be, GUI a8059ed): Box and BufferedInput live once in Paint, the GUI imports them from scratch-paint/src (Paint cannot import from the GUI: the GUI depends on Paint); GUI copies deleted; Paint's ComingSoon was unused and is deleted (GUI keeps its own). To reverse: `git revert` the merge.
- Verified: test app, old build vs new build, same fresh project, costume tab + fill colour picker open: whole-page structure (tags, classes, styles, input values) identical apart from 3 state lines (an open block dropdown, a hover class); same results for hue field, invalid input, hex field, costume rename, sprite x (valid, invalid, negative); picker screenshots match · Not verified: eyedropper magnifier (needs real mouse movement over the canvas).
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

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

### Session 318 — Shared shape tools and tool containers (2026-11-18)
- Asked: code sharing 7/9: one shared shape-tool maker and one shared mode container for Paint's shape tools (rect, rounded rect, oval, arrow, triangle, Shapes) and the bitmap ones (rect, oval, fill, select); same drawing and behaviour.
- Changed: section 301 (Paint 7f0771f): shape-tool.js + bit-shape-tool.js bases, make-mode-container.jsx for all 10 buttons; rounded-rect-tool.js deleted. To reverse: `git revert` the merge.
- Verified: test app, old vs new build, script bench/paint-shape-tools.steps (50 cases: plain/Shift/Alt/Ctrl drags, tiny shapes, moving, live corner/sides/fill/thickness changes, undo, bitmap select/fill, tool switching): all 122 recorded lines (paper project, selection, costume bytes) identical; canvas screenshots byte-identical · Not verified: real keyboard Ctrl+Z and modifier keys (sent as page key events), zoom change while a bitmap shape is selected.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

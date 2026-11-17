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

### Session 306 — Compact layout (2026-11-18)
- Asked: remove the ~10 px strips beside the stage column; eye + name box onto each sprite tile (out of sprite info); categories and ADD without side margins; no halo around the find bar; top-right stage buttons touching; zoom buttons in a row in the code area's corner, as high as ADD.
- Changed: section 289 (GUI 092cccd). To reverse: `git revert` the merge.
- Verified: test app: a 1370x600 window had a 640 px page and a 15 px scrollbar strip (cause: editor min-height 640); now page = window at 1370x600 and 900x480, stage column ends at the window edge; tile eye hides a non-selected sprite without selecting it, name box renames (duplicate name refused, long name ellipsis), dragging a tile still reorders, dragging from the name box doesn't; zoom row 19.2 px squares flush with corner, ADD 19.2 px; header buttons touch; find dropdown box-shadow none. · Not verified: right-to-left layout, light theme, the left strip on your exact screen size.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

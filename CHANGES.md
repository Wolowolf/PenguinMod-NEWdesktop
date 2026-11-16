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

### Session 287 — Stage on second screen addon (2026-11-16)
- Asked: an addon "stage on second screen" that works like DaVinci Resolve's clean feed; a second screen was connected for testing.
- Changed: section 271 (GUI 9a1c7df, `app/electron-main.js`, `app/preload.js`): a button above the stage (only with 2+ screens) opens the stage full screen on the other screen, live, at its resolution. To reverse: `git revert` the merge.
- Verified: test app (hidden desktop, real 2nd screen 1920×1080): button shown, feed window at x=2560 on screen 2, sprite moves show live, 16:9 and 4:3 stages fill with black bars, editor stage keeps its size and returns to 335×188 on close; closes by button, Escape and outside close. · Not verified: how it looks on the physical screen (hidden mode), turning the addon off while open. Known: at this screen's 210% scale the window is 1922×1082 (Electron rounds to whole scaled units), at most 1 px cut per edge; monitors and extension overlays are not in the feed.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

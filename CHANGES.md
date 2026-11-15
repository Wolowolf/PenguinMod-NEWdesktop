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

### Session 280 — Extension merges: 20 extensions into 10 (2026-11-15)
- Asked: merge Google + Discord Auth; Encoding + HTML Encode, LZ Compress, Base, Prism's deflate; Text + Text Case; Utilities' "sprite clicked?" into More Events ("parse JSON" deleted); Mouse Cursor + Pointer Lock; Keys+ + Key Simulation; Video Sensing + Camera Sensing+ + Face Sensing (working together); Notifications + Toasts; Device Info + Battery + Wake Lock; Random Tools + Perlin Noise; Variables Expanded + Variable and list + List Tools (no duplicates, no blocks the Custom styles addon covers); remove everything left over; delete simplex-noise.
- Changed: section 263 (VM, GUI, PM / TW / SP galleries; docs). To reverse: `git revert` the merge.
- Verified: all 12 merged extensions load with the planned blocks and labels, the 16 removed IDs are unknown; functional checks of every merged block group; inventory test 104/104, engine contacts 2/2, video motion 6/6, target 34/34; verify-compiler s280d as before; hooks, list hooks, camera skin, name search, edit-rename, direct calls, data inline, edge hats OK; bench of the 6 changed projects. Fixed on the way: 3 older bugs (variable stored under "", duplicate variable names, compiled by-name set kept number type). · Not verified: gallery pages on screen, real camera, real logins.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

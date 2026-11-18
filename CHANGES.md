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

### Session 322 — GIF Manager uses the GIF decoder it already has (2026-11-18)
- Asked: share code: GIF Manager's bundled copies of libraries.
- Changed: section 305 (VM 87fd741): the 380 KB gif-frames decoder bundle removed from GIF-Manager.js; frames read with the omggif GifReader inside its own encoder bundle, JPEGs from the browser's canvas at full quality (464 KB -> 80 KB). To reverse: `git revert` the merge.
- Verified: test app, 50 block calls on test GIFs (sub-rectangle frames, transparency, disposal, one-frame, truncated, PNG, bad address, frame numbers 0..4, 1.5, Infinity, -3) + encode-then-split round trip: every count / text answer equal to the old version, round trip identical; frame pictures closer to the true pixels than before (mean error 0.0-0.3 vs old 1.0-14.2); a truncated GIF froze the old version's page, the new one answers "Invalid GIF" / 0 · Not verified: packaged games.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

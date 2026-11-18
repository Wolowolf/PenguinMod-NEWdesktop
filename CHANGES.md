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

### Session 315 — Shared picture helpers (2026-11-18)
- Asked: code sharing 4/9: shared VM helpers for readAsDataURL, canvas bitmap skins and fillText text drawing; extensions moved onto them; identical looks.
- Changed: section 298 (VM 2f7af86): new util/image-util.js (blobToDataURL, setCanvasSkin, drawText, textCanvas); 13 extensions + tw-external use it. Left alone: Files-Expanded (one reader for 3 modes); Render's text-wrapper not used (it wraps lines and caches widths, none of these wraps text). To reverse: `git revert` the merge.
- Verified: in the test app, old vs new code: 1,628 cases (pen text, simple3D text textures with/without border, Iris glyphs, Lily "?", odd fonts/texts/widths, data URLs of 6 blob kinds, skins created/refreshed) 0 differ; real pen printText 5 cases pixel-identical on pen's own canvas; Iris Text makes and refreshes its skin (resolution 3, smoothing rule on); block-eq (ONLY = the changed extensions): 210 blocks in 11 extensions identical in every mode · Not verified: FileReader error paths (kept by reading the code), VideoSharing / GIF / recording with real media.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

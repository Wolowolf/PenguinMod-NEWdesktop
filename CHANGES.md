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

### Session 277 — Descriptions after the duplicate-block removal (2026-11-14)
- Asked: switch the local test tools to the blocks that stay; change the extensions' new descriptions (and titles if pertinent) so they don't name the removed blocks.
- Changed: section 258 (GUI `extension-texts.js`): 5 descriptions; titles kept (none named a removed block). Local tools (not in git): bench\make-projects.mjs (projects 22, 45, 55, 58 use Clones+ isClone and the built-in power, ≥, ≤; unused extensions dropped; x1/x2/x8 regenerated), fold\fold-e2e.mjs (bit operations dropped), hooks-render-check.mjs (Looks set stretch). To reverse: `git revert` the merge.
- Verified: test app library shows the new More Operators text; the other 4 texts are in the built editor; hooks-render-check ALL OK; fold-e2e 0 differing; the 4 new projects run in bench.mjs (old speed results for them no longer compare). · Not verified: gallery descriptions on screen (no galleries in the test app).
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

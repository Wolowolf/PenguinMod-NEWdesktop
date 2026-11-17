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

### Session 305 — Small UI tweaks (2026-11-17)
- Asked: counters linked to theme colours; no scrollbars on code area and palette; no line left of the play button; small square zoom buttons bottom right; fix the find bar; backpack items edge to edge; sprite info as three pairs ([eye][name], x [][] y, ⇪ [][] ⟳).
- Changed: section 288 (GUI d821eb3). To reverse: `git revert` the merge.
- Verified: test app (light and dark): find bar list shows and lists "when flag clicked" (cause: centring transform put it under the code area); scrollbars gone, wheel scrolls palette and code area; zoom squares in the corner, + and − change the zoom; line starts below the header; backpack tiles full height sharing a border; sprite info pairs; mouse position and clone counter in ink, orange when full. · Not verified: right-to-left layout, a real backpack with 2+ items (checked with a copied tile).
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

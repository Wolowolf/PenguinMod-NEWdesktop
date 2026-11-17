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

### Session 303 — Single or modular blocks addon (2026-11-17)
- Asked: an addon showing only single or only modular blocks (built-in and extensions), also hiding Controls Expansion "if … else if" and Extra Controls "if/else [ID]" in modular mode.
- Changed: section 286 (GUI 1a2ed4f): new addon "Single or modular blocks", off by default, setting default "only modular blocks". Core "if" / "if else" and "stop checking" stay in both modes. Search (Insert blocks by name) only finds shown blocks. To reverse: `git revert` the merge.
- Verified: test app: modular mode on load; switched live from the Addons page with Operators open (category kept) and Bitwise, Controls Expansion, Extra Controls loaded; Big Decimals and 3D Math loaded later filtered; search "join" gives one result, the shown kind; switching while on Costumes redraws on return; reload keeps both settings. · Not verified: live disable/enable of the addon.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

# CHANGES.md — open points and the last session

Printed by `tweak.mjs start`; kept short on purpose. Grep-only: `docs/STATE.md` (current state of the app, build, releases and tools), `docs/CHANGES-archive.md` (every session in full, newest first), the other docs listed in `CLAUDE.md`.

## Open points

- **Not verified yet:**
  - The updater's window and its downloads from a real release while installing a new offline library or packager Electron (its install steps are checked by the local `updater-check.cjs`, Session 116; an update itself worked end to end in Session 30).
  - Opening a `.pmp` by double-click (the test app cannot be started by Windows with a file; a second start of the test app with a file opens it in a new window, Session 235; a saved file's bytes loaded in a fresh app keep the category order, Session 116).
- **Ideas offered, not applied** (offer when relevant):
  - Make the stage's WebGL context after the rest of the first render: at most ~700 ms off the editor's start (`docs/BENCH-BASELINE.md` "Start-up").
  - Code area (Session 329, `docs/BENCH-BASELINE.md` "Code-area drawing"): long scripts load 3–4 × slower than the same blocks in short scripts (cause not looked at); zooming lays out all visible text again. A Canvas 2D drawing of blocks was planned (Session 329 archive: inventory, architecture, 10 steps) and set aside for culling.
  - Loading like a game engine: "load on first use" is done (sections 162, 164, 165). Not chosen so far: scenes, asset groups, sprites on demand, streaming.

## Last session (written by `tweak.mjs finish`; the full entry is at the top of the archive)

### Session 334 — Remove 25 more interface languages (2026-11-19)
- Asked: remove groups 1 and 2 of the "speakers also speak a bigger language" list.
- Changed: section 317 (GUI 3319d28): 25 more languages added to the build-time trim list; their leftovers deleted (translation json, es-419 reuse line, wide-locale entry, sheet script). Kept Serbian, Zulu, Bokmal, Swedish, Slovenian, Spain Spanish. To reverse: `git revert` the merge.
- Verified (test app): first build crashed the editor ("Cannot convert undefined or null to object": the es-419 reuse line) and was fixed; then menu 45 options, none removed; es, sr, ar, he (right-to-left), zh-tw, sl, nb, zu, ht select and load their texts · Not verified: a packaged game, other languages on screen, the CI build; a "setRecyclingEnabled of null" console error appeared while switching languages by script (not checked whether it also happens before this change).
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

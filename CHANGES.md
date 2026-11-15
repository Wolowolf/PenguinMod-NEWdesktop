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

### Session 281 — Extension library: 11 categories (2026-11-15)
- Asked: fewer extension categories with the original criteria (beginner game makers first, every extension in one, most used first, extensions that work together side by side, names that match), made from the extensions' new titles and descriptions; 3D with Math / Time, Clipboard in Text | Popups; "|" instead of "/"; no number and bar in front of category names.
- Changed: section 264 (GUI `3db4914`; `upstream.json`, docs): 23 → 11 categories, labels with "|", side bar count and bar removed. To reverse: `git revert` the merge.
- Verified: script check: the 99 keys of the categories and of `extension-texts.js` are identical, none twice; test app: side bar shows the 11 names without number or bar (Text | Popups and Online | Encoding hidden there because they hold only gallery extensions), headings match, side bar 157 px wide. · Not verified: the gallery extensions on screen (galleries not linked into the test app).
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

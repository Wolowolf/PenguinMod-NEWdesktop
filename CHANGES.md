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

### Session 314 — Shared colour toolkit (2026-11-18)
- Asked: code sharing 3/9: VM util/color.js (plus a shared clamp) as the one colour toolkit for the GUI, the packager and extensions with their own hex parsing / clamp; identical results.
- Changed: section 297 (VM 2dddb88, GUI 6d6a6a6, packager b26d43c): Color.hexPairs + Color.strictHexToRgb; 6 extensions' hex parsers, Color-Master's dec2Hex/hex2DEC and the clamps in 20 extension files use Color / MathUtil.clamp; unused GUI copy deleted; packager colors.js deleted (darken uses the VM's Color). Left alone (would change results or are not copies): Layer-Control, spritesheeter, Dictation, My-Blocks-Plus, HSV maths, pixel loops. To reverse: `git revert` the merge.
- Verified: old vs new code, 30.3 million values (all 16.7 million #rrggbb for the packager, 20 million odd/random colour strings, every clamp bound with NaN, ±0, ±Infinity, strings, null), 0 differ; test app: all 21 extensions load, Color-Master/lighting/Pen+ give the expected values; block-eq (ONLY = the 21 extensions; auto picked "everything" only because util/color.js is engine code, and its existing lines are unchanged): 472 blocks + 217 page blocks identical in every mode, 0 differ · Not verified: the packager's list colour in a packaged game (build OK, function proven equal).
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

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

### Session 293 — Shared maker for modular and single blocks (2026-11-16)
- Asked: one shared piece of code in scratch-blocks for the modular operator blocks and their singles; "mod" in modular maths; square −/+ buttons.
- Changed: section 277 (Blocks 68e0b82, VM d62ec50, GUI 66230e2): `Blockly.scratchBlocksUtils.modularBlock` makes the 4 modular blocks and 20 singles (opcodes, input names, saved format unchanged); "mod" = code `%`, same rank as * and /; −/+ buttons square with square white icons. vertical.js 2,510,716 → 2,500,092 bytes. To reverse: `git revert` the merge.
- Verified: in the test app all 24 blocks built with the right inputs/shapes and shown in the flyout; mouse: dragged a single and a modular block out, clicked +/−, picked "mod"; add/remove, symbol change, undo/redo, duplicate, 20 fast adds/30 removes, save + reload, clean up; 2+3*4^2 mod 5 = 5 and 8 more pairs equal between modular and singles, compiled and interpreted; block-eq auto: 0 blocks differ (extension and page blocks, all modes). · Not verified: the editor-tweaks addon switched on (off by default); other languages (singles now show the symbol text, not the translated message).
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

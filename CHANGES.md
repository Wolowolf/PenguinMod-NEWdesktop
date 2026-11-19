# CHANGES.md — open points and the last session

Printed by `tweak.mjs start`; kept short on purpose. Grep-only: `docs/STATE.md` (current state of the app, build, releases and tools), `docs/CHANGES-archive.md` (every session in full, newest first), the other docs listed in `CLAUDE.md`.

## Open points

- **Not verified yet:**
  - The updater's window and its downloads from a real release while installing a new offline library or packager Electron (its install steps are checked by the local `updater-check.cjs`, Session 116; an update itself worked end to end in Session 30).
  - Opening a `.2DC` by double-click (the test app cannot be started by Windows with a file; a second start of the test app with a file opens it in a new window, Session 235; a saved file's bytes loaded in a fresh app keep the category order, Session 116).
- **Ideas offered, not applied** (offer when relevant):
  - Make the stage's WebGL context after the rest of the first render: at most ~700 ms off the editor's start (`docs/BENCH-BASELINE.md` "Start-up").
  - Code area (Session 329, `docs/BENCH-BASELINE.md` "Code-area drawing"): long scripts load 3–4 × slower than the same blocks in short scripts (cause not looked at); zooming lays out all visible text again. A Canvas 2D drawing of blocks was planned (Session 329 archive: inventory, architecture, 10 steps) and set aside for culling.
  - Loading like a game engine: "load on first use" is done (sections 162, 164, 165). Not chosen so far: scenes, asset groups, sprites on demand, streaming.

## Last session (written by `tweak.mjs finish`; the full entry is at the top of the archive)

### Session 346 — Cheaper UI, part 2 (2026-11-19)
- Asked: do the 3 missed changes from section 309, delete the Block shape addon's "Corner size" setting (always square), add design rules to CLAUDE.md, write prompts for the remaining drawing ideas.
- Changed: section 328 (Blocks 48c42a9, GUI 84a3b7b): drop highlight = 3 px outline instead of a blur filter, no palette button shadow rect, zoom buttons are hit rects + drawn shapes (pictures deleted), Editor Tweaks glow setting removed, zebra striping no longer stacks the filter, Corner size setting removed. CLAUDE.md "Cheap drawing" rule. To reverse: `git revert` the merge and the fork commits.
- Verified: test app: reporter and input highlights white 3px outline, 0 replacement filters, 0 zoom images, 3 hit rects hit by elementFromPoint, a real click on zoom-in zoomed 0.675 → 0.81, 0 button shadow rects, block paths without corner commands, screenshots checked · Not verified: Block shape addon switched off at runtime; light theme (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

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

### Session 342 — Docs and memory cleanup (2026-11-19)
- Asked: delete obsolete docs and memory (plans that are fully done); list the rules Claude follows.
- Changed: `docs/COMPILER-STUDY.md` deleted (its experiments A, L, C and all its open limits were built: sections 236, 240–246; raw notes stay in `PenguinMod-test\bench\compiler-study\`), its pointers in `docs/STATE.md` and `docs/PROCEDURES.md` removed; `docs/EXTENSION-INTEGRATION.md` finished step checklist cut to one paragraph; `docs/BENCH-BASELINE.md` outdated Session 179 recommendation removed; `docs/STATE.md` section count 243 → 324. Memory (outside the repo): finished plans removed (modular blocks, type shapes, code-sharing baseline) and the end-goal note that CLAUDE.md already holds; roadmap note no longer says the Artifact tool is off. To reverse: `git revert` the merge.
- Verified: no doc outside the archive still names the deleted file · Not verified: nothing to run (`.md` only, builds nothing).
- Result after build: no build (`.md` only)

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

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

### Session 265 — Finer number facts in the compiler: cannot be NaN, is a whole number (2026-11-12)
- Asked: track "cannot be NaN" and "is a whole number" (constants, + - * /, round / floor / ceiling, list length, loop counters, variables) so NaN guards disappear where proven; TurboWarp's rules checked; a matrix test like theirs; test switch; prove.
- Changed: section 246 (VM `4e25045`, `upstream.json`): see `docs/SECTIONS.md`; switch `runtime.pmNoNumberFacts`. New local tool `bench\number-facts\number-facts-check.cjs` (`docs/PROCEDURES.md`). To reverse: `git revert` the merge.
- Found: TurboWarp's + - * / rules hold (rederived, mine are tighter for Infinity). Issue 362 exists here too ("pick random" with an infinite fixed bound typed "never NaN"): type corrected. My own first sin / cos rule was wrong (huge angle → NaN) and the new check caught it: removed.
- Extension check: extension blocks get the same values (only proven-never-NaN values lose a guard); `block-eq auto`: 0 of 638 blocks differ.
- Verified: matrix check 2,148,169 checks ok, 15 planted mistakes caught; `verify-compiler s246 --switch pmNoNumberFacts` 10 steps ok; `calltypes-check`, `looplocals-check` ok; ScratchBench 62.8k / 63.1k → 64.4k / 64.7k, same checksums · Not verified: that the switch gives byte-identical old code (by construction only); compile time; "whole number" changes no code yet.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

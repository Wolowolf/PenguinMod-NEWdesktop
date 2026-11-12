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

### Session 264 — Variables kept in JavaScript locals inside loops that cannot pause (2026-11-12)
- Asked: variables in JavaScript locals inside loops that cannot pause (experiment L, MistWarp 3d898e6c), the loop step's block kinds, no cloud variables, written back each round of the outermost loop; first find why the experiment slowed app_raycast and app_ast; test switch; prove; measure with ScratchBench, warp timer off.
- Found: app_ast was noise. app_raycast was real: a whole number made by "floor" is an integer for the engine in the variable's object but a fraction number in a local. Rule: a variable the loop sets from floor / ceiling / round stays in its object. MistWarp's NaN-and-lists rule was slower here, not taken.
- Changed: section 245 (VM `dc44b70`, `upstream.json`): see `docs/SECTIONS.md`; switch `runtime.pmNoLoopLocals`. New local tools `bench\looplocals-check.cjs`, `one-vm.cjs` (`docs/PROCEDURES.md`). To reverse: `git revert` the merge.
- Extension check: a loop containing an extension block is compiled as before; `block-eq auto`: 0 of 638 blocks differ.
- Verified: `verify-compiler s245 --switch pmNoLoopLocals` 10 steps ok; `looplocals-check.cjs` 29 cases ok; 4 planted mistakes caught; ScratchBench 45.7k / 46.0k → 60.9k / 59.7k points, same checksums, app_raycast 1.29 / 1.23 times · Not solved: algo_sieve 0.87 / 0.82, algo_sort 0.83 / 0.92 in the app (`docs/BENCH-BASELINE.md`).
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

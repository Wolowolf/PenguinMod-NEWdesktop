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

### Session 266 — Keep variable types after extension blocks that cannot change variables (2026-11-12)
- Asked: stop forgetting variable types after extension blocks that are called plainly, never wait and write none of variables, threads, script, events, blocks, project (block-inventory.json); count them, spot-check 20 in their source; test switch; prove with block-eq auto, compile-eq and the fuzz test with such blocks.
- Changed: section 247 (VM `751df5d`, `upstream.json`): see `docs/SECTIONS.md`; switch `runtime.pmNoKeepTypesAfterExtensions`. Also lets loops and custom blocks holding these blocks keep types (sections 242/244), not loop locals. Fuzz `--with ext` (`docs/PROCEDURES.md`). To reverse: `git revert` the merge.
- Found: 1,431 blocks qualify (737 commands, 538 reporters, 156 Booleans); 20 read in source, none sets variables, starts scripts or pauses.
- Extension check: only these 1,431 blocks are affected, and they get the same values; `block-eq auto`: 0 of 638 blocks differ (new/guarded/interp/old).
- Verified: `verify-compiler s247 --switch pmNoKeepTypesAfterExtensions` 10 steps ok; fuzz `--with ext` 4 ways ok; planted mistake caught · Not verified: speed (ScratchBench and the regression projects compile unchanged: no such blocks in them).
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

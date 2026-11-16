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

### Session 290 — Modular blocks share the single blocks' code (2026-11-16)
- Asked: make the modular operator blocks (and the modular if) use the single blocks' code; compare block with Scratch rules; single nand/nor/xnor blocks; best performance for the "optimize" flag.
- Changed: section 274 (VM e41ed9d, GUI 2c6fdbb): modular blocks compiled and interpreted as nested single blocks; nand/nor/xor/xnor in the palette. To reverse: `git revert` the merge.
- Verified: 90 cases (math precedence, join, 62 and/or mixes, compare, if/else-if) give the expected answer compiled, interpreted, and compiled without constant folding; compiler proofs all ok (block-eq 0 differences in 571 blocks, fuzz nothing new, regress 0 verdicts changed); the 4 blocks show in the palette. · Not verified: nothing else open.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

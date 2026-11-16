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

### Session 294 — Extensions can declare modular blocks; Bitwise pilot (2026-11-16)
- Asked: a blockInfo option so extensions get modular blocks and their singles from the shared maker; shared VM helper with own symbol levels; pilot Bitwise (singles locked + one modular block); doc.
- Changed: section 278 (Blocks c731142, VM 731e9e8, GUI 17d2f6f): `modular: {prefix, symbols, shadow, locked?}`; `runChain` in expandable-blocks.js; Bitwise's 8 singles locked, new `bitwiseModular` (order: shifts and rotations, then and, xor, or; left to right); docs/EXTENSION-INTEGRATION.md "Modular extension blocks". The compiler already passed the saved shape to extension blocks. To reverse: `git revert` the merge.
- Verified: test app: 10 Bitwise blocks in the palette; mouse: + click, symbol menu, picked "or"; add/remove, min 2, 20 adds/30 removes, undo/redo, duplicate; 35 chains + 4 rotation chains, fixed and from variables, equal to JavaScript / nested singles in compiled, no-inline, no-folding and interpreted, also after save + reload and in a freshly started app; block-eq auto (everything): Bitwise equal in all modes, page blocks 0 differ. · Not verified: other languages (singles show the symbol text). Found, not from this change: pmOperatorsExpansion orIfFalsey / ifIsTruthy answer number compiled but text interpreted for typed "-2.5" / "0" (the new block shifted the test's inputs).
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

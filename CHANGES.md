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

### Session 267 — A custom block calling itself calls its own function (2026-11-13)
- Asked: measure what a custom block call costs (ScratchBench algo_fib / algo_ack, a profile): the `thread.procedures["..."]` lookup and the `thread.spoofing` check; apply behind a test switch if it gains over ~5% with identical answers.
- Changed: section 248 (VM 62788b4, `upstream.json`): a custom block calling itself calls its own function by name; switch `runtime.pmNoSelfCallByName`. Not applied (measured ±0): skipping the spoof check, remembering other custom blocks' functions. To reverse: `git revert` the merge.
- Measured: in the app, 3 pairs: algo_fib +22/+25/+29%, algo_ack +17/+13/+20%, checksums same, total ±1%; one call 4.2 → 3.5 ns (fib), 5.6 → 4.7 ns (ack). Profile: the time sits in the custom block's own function in both; the gain is the engine knowing the called function.
- Extension check: only custom blocks calling themselves change; My Blocks+ calls and Extra Controls' use of `thread.procedures` are untouched.
- Verified: `verify-compiler s248 --switch pmNoSelfCallByName`: 10 of 11 steps ok (block-eq 0 of 638 differ); benchmark projects (without 37/38, which break the debug connection as known): only the 3 scripts reaching a recursive block differ; `selfcall-check.cjs` 9 recursion cases equal, planted mistake caught · Not verified: My Blocks+ custom branches calling themselves (own call path, unchanged).
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

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

### Session 272 — Scripts that never pause run as plain functions (2026-11-13)
- Asked: scheduler study cause 1: port TurboWarp PRs 391, 395 and 392 (top-level scripts that cannot pause are plain functions; no pause after "delete this clone" / "stop all"), started automatically once Session 271 had merged.
- Changed: section 253 (VM 5d78b93: `intermediate.js`, `irgen.js`, `jsgen.js`, `compile.js`, `jsexecute.js`, `thread.js`, `sequencer.js`; `docs/EXTENSION-RISKS.md`, `upstream.json`). Switch `runtime.pmNoPlainScripts` (tests only). To reverse: `git revert` the merge.
- Measured: sched-study `ablate.sh` 6 rounds, ours before → after (runs/s): pingpong 323 → 560, fanout 886 → 2374, fanwait 880 → 2772, clonechurn 124 → 153, threads 22626 → 21621 (noise). MistWarp on the same runs: 753 / 1988 / 1901 / 236 / 18796.
- Extension check: only sp Extra-Controls reads `thread.generator` (inside try/catch, then sets the status): same result on a plain thread. My-Blocks-Plus writes `yield*` itself: caught by the code scan.
- Verified: `verify-compiler s272 --switch pmNoPlainScripts` all 10 steps ok (fuzz 3 × 8000 nothing new, regress 0 verdicts changed, block-eq 1659 + 638 identical); `plain-entry-check.cjs` 18 cases equal to the VM before; Extra-Controls thread blocks 6 cases equal with the switch on and off; ScratchBench checksums unchanged · Not verified: extension compiler code outside the shipped galleries
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

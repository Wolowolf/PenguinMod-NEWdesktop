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

### Session 273 — Cheaper clone creation (2026-11-13)
- Asked: scheduler study cause 6a: copy clone effects and the bubble state without JSON (exactly the same result) and check whether MistWarp's uid() is faster in ours.
- Changed: section 254 (VM 6caf204: `clone.js` new `Clone.flat`, `uid.js`, `rendered-target.js`, `scratch3_looks.js`). To reverse: `git revert` the merge.
- Measured: sched-study `ablate.sh` 6 rounds, ours before → after (runs/s): clonechurn 153 → 202 (MistWarp 235 / 219 in the two runs), pingpong 556 → 540, fanout 2620 → 2494, fanwait 2766 → 2646, threads 22781 → 21900 (MistWarp dropped by the same share: noise). Microbench: effects copy ~1050 → ~350 ns, uid ~760 → ~470 ns.
- Verified: `Clone.flat` equal to the JSON copy on 14 edge cases (NaN, ±Infinity, -0, undefined, functions, symbols, nested, arrays, `__proto__`, numeric key order, getters, bigint throws); block-eq auto s273 (everything: shared engine files) 1659 + 638 blocks identical in every mode, 0 jobs differ from s272 · Not verified: nothing beyond the CI build
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

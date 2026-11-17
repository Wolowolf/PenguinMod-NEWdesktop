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

### Session 297 — Queue for conversations that must wait for each other (2026-11-17)
- Asked: a consistent, cheap way to open two or more conversations at once so each waits for the one before it, safe against the usage limit or a restart.
- Changed: `tweak.mjs` (outside the repo; old copy `tweak.mjs.bak-queue`): every `start` takes a numbered ticket in `PenguinMod-test\queue\`; not its turn: `STOPPED: not your turn`, then `start <name> --wait` in the background waits by itself (looks every minute, asks GitHub every 5 minutes) and starts the tweak; `ship` passes the turn on after its merge; new `queue` and `unqueue <name>`. `CLAUDE.md` (workflow step 1 and the several-changes rule), `docs/STATE.md`, `docs/PROCEDURES.md`. To reverse: `git revert` the merge and copy `tweak.mjs.bak-queue` over `tweak.mjs`.
- Verified: `bench\queue-test.sh` in a throwaway repo: three tweaks start in order, a dead wait is not overtaken, running the command again keeps the place, a cut-off after the start only repeats the start information, an uncommitted file blocks, `unqueue`; live: this session waited 17 min behind tweak/or-else-answer-type (started without a ticket) and started by itself after PR 340 merged. · Not verified: whether the app wakes a conversation whose wait ends while the usage limit is reached (saying "continue" runs the same command again).
- Result after build: assumed working (only .md files: builds nothing)

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

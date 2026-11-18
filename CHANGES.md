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

### Session 325 — Extensions on the editor's sound engine (2026-11-19)
- Asked: Beat Sync, Recording V2, Tune Shark V3 and Speech to Text should use runtime.audioEngine.audioContext instead of their own; leave Dictation alone.
- Changed: section 308 (VM 582efb4): Recording V2 uses the engine's context (getter). Beat Sync and Tune Shark V3 already did; Speech to Text never loads (unused file). To reverse: `git revert` the merge.
- Verified: test app with Chromium's fake microphone: no new AudioContext when loading the 3 extensions; record for 2.5 s gave a 34 KB WAV and loudness 27 (unchanged by mute); pause/play during recording continues; Tune Shark plays through the engine's volume (peak 0.32, half volume 0.16, muted 0); Beat Sync on the engine context; the same in a packaged HTML game · Not verified: a real microphone.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

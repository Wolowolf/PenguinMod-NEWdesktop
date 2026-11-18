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

### Session 312 — Shared library unpacker (2026-11-18)
- Asked: code sharing 1/9: one shared VM helper for the fzstd + base85 unpacker copied in Zip and Face Sensing's detector; check whether Zip can use the VM's JSZip; same behaviour.
- Changed: section 295 (VM ae5817a): new extension-support/packed-library.js; zip.js and face-detector.js use it (−1,612 +~815 lines). Zip already used the VM's JSZip: nothing to change. Local block-eq.mjs auto now maps a file used only by extension files to those extensions. To reverse: `git revert` the merge.
- Verified: test app: Zip round trip (create, write, get base64, reopen, read text/hex/data: URL with MIME application/json and text/plain); Face Sensing loads without the detector (window.faceDetection undefined); the detector loader then unpacks and runs (estimateFaces on a blank image: 0 faces); block-eq auto (Zip + Face Sensing, every mode + page test): 0 differ. · Not verified: face blocks with a real camera.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

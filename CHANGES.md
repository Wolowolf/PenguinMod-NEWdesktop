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

### Session 286 — Block cleanup for non-coders and all platforms (2026-11-16)
- Asked: carry out the block review (useless everywhere, code languages, engine-dead blocks, platform blocks) with the user's changes: keep Network (connection type to Device Info), Cryptography, WebRTC, Pen Plus shaders; Discord parts out, Sign-in Google only; My Blocks Plus "current value of [x]"; real "running on a phone?"; never / every other frame hats out; plain try/catch names; library texts updated.
- Changed: section 270 (VM 94d6102, GUI abff670, Blocks 0a0607b, Packager b260c11, PM f2a51f1, SP af2575b, app login helper). To reverse: `git revert` the merge.
- Verified: test app: 97 extensions load, removed blocks/extensions unknown, no menu without a block, renamed texts shown, Turbo switch works, saving works, library shows Google Sign-in and no Steam/Discord/regex; "current value of" right compiled and interpreted with two callers; inventory 102/102, engine contacts 2/2; verify-compiler s270 all 6 ok, block-eq 0 differ. · Not verified: phones (phone check, connection type), a real Google login.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

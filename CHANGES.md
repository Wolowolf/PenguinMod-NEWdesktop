# CHANGES.md — open points and the last session

Printed by `tweak.mjs start`; kept short on purpose. Grep-only: `docs/STATE.md` (current state of the app, build, releases and tools), `docs/CHANGES-archive.md` (every session in full, newest first), the other docs listed in `CLAUDE.md`.

## Open points

- **Not verified yet:**
  - The updater's window and its downloads from a real release while installing a new offline library or packager Electron (its install steps are checked by the local `updater-check.cjs`, Session 116; an update itself worked end to end in Session 30).
  - Opening a `.2DC` by double-click (the test app cannot be started by Windows with a file; a second start of the test app with a file opens it in a new window, Session 235; a saved file's bytes loaded in a fresh app keep the category order, Session 116).
- **Ideas offered, not applied** (offer when relevant):
  - Make the stage's WebGL context after the rest of the first render: at most ~700 ms off the editor's start (`docs/BENCH-BASELINE.md` "Start-up").
  - Code area (Session 329, `docs/BENCH-BASELINE.md` "Code-area drawing"): long scripts load 3–4 × slower than the same blocks in short scripts (cause not looked at); zooming lays out all visible text again. A Canvas 2D drawing of blocks was planned (Session 329 archive: inventory, architecture, 10 steps) and set aside for culling.
  - Loading like a game engine: "load on first use" is done (sections 162, 164, 165). Not chosen so far: scenes, asset groups, sprites on demand, streaming.

## Last session (written by `tweak.mjs finish`; the full entry is at the top of the archive)

### Session 344 — Own project file ending .2DC (2026-11-19)
- Asked: drop .sb3 and .pm, keep only .pmp renamed to .2DC: save name, open dialog, restore points, packager hand-off, Windows double-click.
- Changed: section 326 — GUI c4da854 (save/open/restore-point/packager names, other endings refused with a message), Packager cfe2456 (error text), `package.json` (.2DC association), `app/electron-main.js` (command line opens only *.2DC). File contents unchanged. To reverse: `git revert` the merge and both fork commits.
- Verified: test app with stubbed pickers: .sb3/.pm/.pmp/no ending refused (title unchanged), "My Game.2DC" and "lower.2dc" load with their titles; Save as suggests "lower.2DC" with only .2DC offered; restore-point export saved as restore-point.2DC; packager got the project ("lower"); a second app start on the hidden desktop opened Marker.2DC in a new window, ignored Marker.sb3/.pmp · Not verified: real Windows double-click and the installer's .2DC association (not the CI build or installer: builds are assumed to work); in-app updates don't run the installer, so they likely don't register .2DC.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

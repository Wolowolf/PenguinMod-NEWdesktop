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

### Session 323 — Share more copied code in the VM and packager (2026-11-18)
- Asked: share the copies found by bench\dup-funcs.cjs: XML / font-menu helpers, packager minifier, Bluetooth files, 6 cross-file pairs, 5 in-file repeats, base64 code.
- Changed: section 306 (VM 5b127b9, packager ffe631f): one shared copy each (xml-escape, FontManager.getFontMenu, base64-util, sound lookup, opcode ids, speech packs + credits, list menu, id pool, Cast test); in-file repeats call one body; unused Bluetooth / Scratch Link files removed. Duplicated functions 618 -> 299 lines. To reverse: `git revert` the merge.
- Verified: Node: base64 (11 sizes up to 300 KB, Unicode), XML escape and the packager minifier on 111 projects identical to the old copies. Test app: 16 extensions load; font menus show a custom font; sound lookup equal to the old one for 11 inputs; Encoding / Files Expanded base64; pen image blocks; delete + restore sprite; save + reload keeps assets; list menus; credits providers; equality test: new vs old 0 of 1,317 + 571 page blocks differ · Not verified: Popup Phoenix / Speech Bubbles / Printing text on screen, MIDI and Google sign-in calls (their shared helpers were compared in Node).
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

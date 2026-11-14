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

### Session 276 — Remove 44 duplicate extension blocks (2026-11-14)
- Asked: fully delete 44 extension blocks that compute the same as a block that stays (Lily's utils, True Fantom Math, Utilities, Graphics 2D, Text, Hyper Sense V2, ShovelUtils, Operators Expansion, Stretch) and update the block lists so the VM tests pass.
- Changed: section 257 (VM): blocks, their code, translations and empty separators; block-inventory/pure/direct/keep-types lists, pure-inline.js, jsgen.js fold list, 4 compiler helpers only they used; engine-contacts.json regenerated (it was already out of date since section 255). EXTENSION-INTEGRATION.md no longer names restartProject. To reverse: `git revert` the merge.
- Verified: VM tests desktop_block_inventory (129/129) and desktop_engine_contacts (2/2) pass; test app: the 9 extensions load, none of the 44 opcodes exists; block-eq auto s276: 0 differences, 1,612 blocks identical in every mode, page test 638 identical. · Not verified: palettes looked at on screen.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

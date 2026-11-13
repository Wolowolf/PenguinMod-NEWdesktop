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

### Session 275 — Addon page cleanup (2026-11-13)
- Asked: a CLAUDE.md rule that "delete" also means removing the code only that thing used; on the addon page: credits in quiet ink without links or "Credits:", right-aligned beside the reset arrow (same place without one); no puzzle/brush icons; remove five info notes (Ctrl/Cmd and Alt/Option in the drag-keys description, option renamed "Make individual grab default").
- Changed: section 256 (GUI 1b35cc3: addon settings page, manifests, translations, 2 icons deleted); CLAUDE.md rule. To reverse: `git revert` the merge.
- Verified: test app addon page: credits right-aligned at the same x in every addon with or without arrow, grey quiet ink, 0 links, 0 icons; drag-keys text and option name as asked; cards narrowed to 420 px: credits cut with "…", arrow keeps its place. The pinned-blocks warning was already absent from the code. · Not verified: other languages on screen.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

# CHANGES.md — open points and the last session

Printed by `tweak.mjs start`; kept short on purpose. Grep-only: `docs/STATE.md` (current state of the app, build, releases and tools), `docs/CHANGES-archive.md` (every session in full, newest first), the other docs listed in `CLAUDE.md`.

## Open points

- **Not verified yet:**
  - The updater's window and its downloads from a real release while installing a new offline library or packager Electron (its install steps are checked by the local `updater-check.cjs`, Session 116; an update itself worked end to end in Session 30).
  - Opening a `.2DC` by double-click (the test app cannot be started by Windows with a file; a second start of the test app with a file opens it in a new window, Session 235; a saved file's bytes loaded in a fresh app keep the category order, Session 116).
- **Ideas offered, not applied** (offer when relevant):
  - Make the stage's WebGL context after the rest of the first render: at most ~700 ms off the editor's start (`docs/BENCH-BASELINE.md` "Start-up").
  - Code area (Sessions 329, 349, `docs/BENCH-BASELINE.md` "Code-area drawing"): zooming lays out all visible text again. A Canvas 2D drawing of blocks was planned (Session 329 archive: inventory, architecture, 10 steps) and set aside for culling. Tried and dropped (Session 351, `docs/BENCH-BASELINE.md` "Round pills as rects, light fields"): round pills as `<rect rx>` (slower on the main thread), light number/text fields (about 5 % of load at most).
  - Loading like a game engine: "load on first use" is done (sections 162, 164, 165). Not chosen so far: scenes, asset groups, sprites on demand, streaming.

## Last session (written by `tweak.mjs finish`; the full entry is at the top of the archive)

### Session 355 — Field types merged, 22 -> 13 (2026-11-20)
- Asked: reduce the field types as far as possible (delete unused, merge near-copies, fold number and menus into the text box), keeping the reporter/input shape rules.
- Changed: section 336 (Blocks 288ff5e, VM db0d6cf, GUI 1aab210): checkbox/colour/iconmenu fields and the colour grid library removed; field_number, field_textdropdown, field_numberdropdown, field_input_removable are options of field_input; field_label_serializable an option of field_label; +/- one field_expandable; 3 addons patch FieldTextInput. To reverse: revert the 3 fork commits and upstream.json.
- Verified: palette snapshot before/after: 397 of 426 entries identical in shape, size, field kind and value (the 29 others only differ by project costume/sound/variable names), 17 extra blocks identical; number pad, numeric restrictors, typeable text and number menus, remove button + reorder arrows, + / -, saved argument label, VM receives edits; no console errors · Not verified: block-eq (auto picks everything because runtime.js changed; the changed code only builds editor JSON for typeable menus, which no shipped extension uses), a real touch screen.
- Result after build: assumed working

## Template (this short entry: at most 1500 characters; the full proof goes into the archive entry)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files or section> — <what, how to reverse>
- Verified: <the result in one line> · Not verified: <…> (not the CI build or installer: builds are assumed to work)
- Result after build: assumed working
```

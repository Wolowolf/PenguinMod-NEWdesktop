# CHANGES.md — current state and recent sessions

Kept short on purpose (read at the start of every session). Full history of Sessions 1–11, old Linux-sandbox test notes and the recipe to bring back Linux builds: `docs/CHANGES-archive.md` (search it with Grep, don't read it whole).

## Current state (update when it changes)

- **Baseline:** upstream commit `ab5e25a` (2026-06-15). Upstream builds stopped after 2026-09-06 (cause unconfirmed).
- **Upstream pins (`upstream.json`, Session 16):** CI and the local test download each of the 8 upstream projects at a fixed commit (`scripts/clone-pinned.js`): GUI `24faae9`, Vm `9c8e446`, Blocks `5e0503f`, Render `89a587a`, Paint `37f65d7`, PenguinMod gallery `971b034`, TurboWarp gallery `fe82589`, SharkPool gallery `e168e25` (all = what the 2026-10-04 builds used). Moving to newer upstream = edit the commits, local test with `-Update`, PR. Not pinned: the npm packages they install (lockfiles are partly deleted, see below). Also pinned there (Session 17), used only by the offline-library script: game-icons `82d9488`, jsfxr `b7b6aa2`, ZzFX `aab7e2b`, Bfxr2 `d7fc918`.
- **Offline library (Session 17):** Kenney (all 165 packs of the 2D, Textures and Audio categories, CC0; list in `library/kenney-packs.json`), game-icons.net (4,239 icons, CC BY 3.0, recoloured black on transparent) and the jsfxr / ZzFX / Bfxr generators. Built on a PC with `scripts/make-offline-library.mjs` (usage at its top) and published as release `offline-library-<n>` (one zip, ~182 MB). `app/offline-library.json` pins version, tag, size and SHA-256. CI puts it in the installer as `resources/offline-library` (`extraResources`) and leaves it out of `win-unpacked.zip`; the app serves it at `https://studio.penguinmod.com/__library__/`.
- **CI (`main.yml`):** Ubuntu + wine, Bun, Node 26; actions `checkout@v7`, `setup-node@v7`, `cache@v6`, `setup-bun@v2` (Session 13). Downloads (pinned) and builds PenguinMod-ExtensionsGallery, TurboWarp extensions (`package-lock.json` deleted before `bun i`: its git-hosted checksum broke installs, Session 1), SharkPools-Extensions, and the GUI with Vm, Blocks (`develop-builds`), Render (lockfile deleted) and Paint. Runs the patch, writes `app/build-info.json` `{tag, builtAt}`, downloads and checks the offline library, runs `electron-builder --win nsis` (version read from `package.json`), then `gh release create` publishes the `.exe` (renamed with dots) and `win-unpacked.zip`.
- **`package.json`:** one NSIS installer, x64 only; `electron` 44.5.1 and `electron-builder` 26.15.3 pinned (bump them by hand); unused Linux targets still listed; `asar: false`; dependency `unzipper`; `.pmp` file association.
- **App:** always opens `https://studio.penguinmod.com/editor.html` (or a `.pmp` given on the command line), served from `app/build`. Extension gallery URLs map to offline folders. Windows and links to penguinmod.com (and its projects./docs. hosts) and Discord are blocked (Session 15).
- **Updater (`app/updater.js`, Session 5):** System → Check for Updates. Picks this fork's newest published release with a complete `win-unpacked.zip`, compares its tag with `build-info.json`, checks size + SHA-256, then replaces, adds and removes files under `resources/app/` with full rollback on error (`.old` leftovers deleted at next start). Needs a writable install folder (not Program Files). Downloads ~210 MB each time. Restarts the app. Since Session 17 it also installs the offline library (only when the version in the new app's `offline-library.json` differs from `resources/offline-library/version.json`; unpacked next to the old one, then swapped, old one restored on error), and offers it at start and in "Check for Updates" when it is missing (an app updated by an older updater has none at first).
- **Patch sections** (`patches/stage-layout.js`; each one says how to reverse it):
  - 1–7: the editor stage always fits a 480 px wide 4:3 box. The small/large buttons are removed. A drag handle sits on the stage column's left edge (240–1200 px, double-click resets, saved in `localStorage` `pmdesktop:stageBoxWidth`). The column hugs the stage, with a minimum width of 242 px. (Sessions 2–3)
  - 8: the sprite panel is one wrapping row: eye toggle, name, x, y, ⇪ size, ⟳ direction. (Session 4)
  - 9: automatic restore points are off by default. (Session 3)
  - 10: no rounded corners, CSS only (block shapes are SVG and stay rounded). (Session 4)
  - 11: the category menu shows colour boxes with the name only. The menu is 4.5rem wide; boxes are one line, the selected box two lines, with white outlined text; a name that does not fit is cut off without "..." and gets a small dot under its first letter. It also wraps `Toolbox.Category.createDom`, `Toolbox.Category.setSelected` and `Toolbox.getWidth`. (Sessions 6, 9, 25)
  - 12: the "Back to Home" button is removed. (Session 8)
  - 13: dragging a category box to re-order the menu (upstream addon `toolbox-category-drag`). The held box slides and the others make room. The first and last places are reachable. The order is stored in the project's Stage comment, updated on every change, and reset for projects that have no stored order. (Sessions 10–11)
  - 14: the "See Project Page" and "Upload" buttons are removed from the menu bar (sharing-site buttons; this build is for packaged projects). (Session 14)
  - 15: no Change Username / cloud variables, Remix, About, Discord links, Help Manual button or analytics script; no cloud server address. (Session 15)
  - 16: the original sprite, costume, backdrop and sound libraries are removed. The library windows are `patches/asset-libraries/pm-asset-browser.jsx`; sources in `pm-asset-sources.js` (only CC0 / public domain / CC BY / MIT-style licences; never NC, ND, SA, GPL; no brand-logo icon sets). "Surprise" adds a random Kenney item. Every added asset carries a `pmCredit` record, saved in the project by a patch to the VM's `sb3.js`. `pm-credits.js` keeps the "credit" sprite. (Session 17) Clicking a game-icons.net or Iconify icon opens the icon studio (`pm-icon-studio.jsx`, `pm-icon-svg.js`); game-icons tags and author names come from `game-icons-meta.json`. (Session 18) Each library opens on "All", which searches every unlocked source at once (Session 21). Sound waveforms are coloured like Freesound's and made in a background worker, only for tiles in view (Session 21). Openverse / Pixabay show a limit counter; sound tiles play on click and add with "+" (Session 22). Credit lines are as short as the licences allow, licence links listed once at the bottom; the hidden credit sprite holds them in its variable `credit` with a click-to-play credits screen script (also in the backpack), and "Package project" warns when nothing shows that sprite (Session 23).
  - 17: the VM skips a monitor update while no sprite is selected yet (upstream bug: a project with a monitor, opened by double-click, failed every frame). (Session 24)
  - 18: `project_url` (double-clicked `.pmp`) is used once and removed from the address, so File → New and Reload no longer ask for it again (404 crash). (Session 24)
  - 19: no "This sound could be too large to upload to PenguinMod." warning in the sound editor (posting message). (Session 26)
  - 20: the sound editor's waveform is coloured like the sound library's (`pm-sound-wave.jsx`), at full screen resolution with a darker loudness core. (Session 27)
- **Not verified yet:**
  - The updater end to end inside a packaged install (including the offline-library download, Session 17).
  - The installer itself (Claude has only tested the local build).
  - Fonts on other PCs.
  - Category order with a project file saved to disk and reopened (only in-app save and load were tested).
  - The user hasn't confirmed the builds from Sessions 3–6, 8–9 and 11 (Session 2's build was confirmed, Session 10's partly).
- **Ideas offered, not applied** (offer when relevant):
  - Square off the block shapes (needs a `scratch-blocks` patch, riskier).
  - Offline plan (Session 16): step 2 was replaced by Session 17 (new libraries). Still left: 3, remove the hidden `penguinmod.com/embed/editor` login iframe (`home-communication.jsx`, loads on every start) and project-ID loading (`projects.penguinmod.com`, `asset-cdn.penguinmod.com`), and block those servers; 4, own forks or snapshots so builds survive upstream deleting things.
  - Turn sprite fencing off by default (and keep it off) for every project (user idea, Session 23; changes how all games behave, so its own tweak).

## Recent sessions (newest first, at most 3; move older ones to the top of the archive's change log)

### Session 27 — coloured waveform in the sound editor (2026-10-06)
- Asked: the sound editor's waveform made with an algorithm like the sound libraries' coloured one, possibly more detailed (only one is shown, not a preview).
- Changed: `patches/stage-layout.js` new section 20 and new `patches/asset-libraries/pm-sound-wave.jsx`: the sound editor draws a canvas instead of the one-colour loudness outline: lowest to highest sample per column, coloured by spectral centroid (`analyseWave` / `paintWave`, now exported from `pm-waveforms.js`), one column per screen pixel (screen scale included), each column also reaching its neighbours' peaks (else high notes look striped), plus the loudness (RMS) as a darker core. Heights are true sample values (upstream exaggerated quiet sounds). The editor container passes `samples`. To reverse: delete section 20, `pm-sound-wave.jsx` and the export line in `pm-waveforms.js` (or `git revert` the merge).
- Verified (local test app): Squawk and a 5-minute 96 kHz test sweep drawn coloured (sweep blue → orange each minute, quiet part small); the long one in one ~150 ms step; Softer (real click) redrew it smaller; playhead and selection still on top. · Not verified: the CI build, light theme, resizing the window.
- Result after build: not yet tested

### Session 26 — no "too large to upload" sound warning (2026-10-06)
- Asked: remove every message about posting projects on PenguinMod / TurboWarp / Scratch (example: a long imported sound warned it might be too long to import to PenguinMod).
- Found: the message was "This sound could be too large to upload to PenguinMod." (sound editor, sounds of 10 MB or more): about uploading to the website, not importing. The only other posting messages (cloud variables over Scratch's limit / "won't work until uploaded", cloud badge) can't appear because section 15 removed cloud variables; the "incompatible with Scratch" extension prompt is unused upstream. Kept: the stage-size, OGG-on-Apple, stereo/format and unstable-extension warnings (not about posting).
- Changed: `patches/stage-layout.js` new section 19: removes that warning and its now unused `SOUND_BYTE_LIMIT` import from `sound-editor.jsx`. To reverse: delete section 19 (or `git revert` the merge).
- Verified (local test app): the built editor no longer contains the text; a 13.23 MB, 5-minute sound opened in the sound editor (real click) with no warning, size line and tools as before. · Not verified: the CI build.
- Result after build: not yet tested

### Session 25 — a dot instead of "..." on cut category names (2026-10-06)
- Asked: in the category menu, instead of "..." at the end of a cut name, one dot under the first letter (the name is always capped there, so no extra padding needed).
- Changed: `patches/stage-layout.js` section 11: the name is cut off without "..." (one line: `text-overflow: clip`; selected box: a two-line height limit instead of `line-clamp`, which always adds "..."). A box whose name does not fit gets `data-pm-cut` (checked when it is made, when it is (de)selected and once fonts are loaded) and shows a 2 px white dot with a black outline in its bottom padding, under the first letter. Names that fit get no dot. To reverse: `git revert` the merge.
- Verified (local test app): default menu, no dots (all names fit); "Text to Speech" cut with the dot under the T; clicked (real click), it shows both lines and no dot; another box clicked, its dot came back; a name renamed on screen to be too long for two lines kept its dot when selected. · Not verified: the CI build, other extensions with long names (only on-screen checks above).
- Result after build: not yet tested
- Part 2 asked: the dot had a different outline from the letters.
- Part 2 changed: section 11: the dot uses the same five blurred shadows as the letters (`box-shadow` with the label's `text-shadow` values) instead of one hard 0.7 px outline. To reverse: `git revert` the merge.
- Part 2 verified (local test app): the computed shadow of the dot on "Text to Speech" matches; enlarged screenshot: soft outline like the letters. · Not verified: the CI build.
- Part 2 result after build: not yet tested

## Template (keep entries this short)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files> — <what, why, how to reverse>
- Verified: <what was run/seen> · Not verified: <…>
- Result after build: not yet tested
```

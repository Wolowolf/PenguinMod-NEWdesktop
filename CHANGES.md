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
  - 11: the category menu shows colour boxes with the name only. The menu is 4.5rem wide; boxes are one line, the selected box two lines, with white outlined text. It also wraps `Toolbox.Category.createDom` and `Toolbox.getWidth`. (Sessions 6, 9)
  - 12: the "Back to Home" button is removed. (Session 8)
  - 13: dragging a category box to re-order the menu (upstream addon `toolbox-category-drag`). The held box slides and the others make room. The first and last places are reachable. The order is stored in the project's Stage comment, updated on every change, and reset for projects that have no stored order. (Sessions 10–11)
  - 14: the "See Project Page" and "Upload" buttons are removed from the menu bar (sharing-site buttons; this build is for packaged projects). (Session 14)
  - 15: no Change Username / cloud variables, Remix, About, Discord links, Help Manual button or analytics script; no cloud server address. (Session 15)
  - 16: the original sprite, costume, backdrop and sound libraries are removed. The library windows are `patches/asset-libraries/pm-asset-browser.jsx`; sources in `pm-asset-sources.js` (only CC0 / public domain / CC BY / MIT-style licences; never NC, ND, SA, GPL; no brand-logo icon sets). "Surprise" adds a random Kenney item. Every added asset carries a `pmCredit` record, saved in the project by a patch to the VM's `sb3.js`. `pm-credits.js` keeps the "credit" sprite. (Session 17) Clicking a game-icons.net or Iconify icon opens the icon studio (`pm-icon-studio.jsx`, `pm-icon-svg.js`); game-icons tags and author names come from `game-icons-meta.json`. (Session 18)
- **Not verified yet:**
  - The updater end to end inside a packaged install (including the offline-library download, Session 17).
  - The installer itself (Claude has only tested the local build).
  - Fonts on other PCs.
  - Category order with a project file saved to disk and reopened (only in-app save and load were tested).
  - The user hasn't confirmed the builds from Sessions 3–6, 8–9 and 11 (Session 2's build was confirmed, Session 10's partly).
- **Ideas offered, not applied** (offer when relevant):
  - Square off the block shapes (needs a `scratch-blocks` patch, riskier).
  - Offline plan (Session 16): step 2 was replaced by Session 17 (new libraries). Still left: 3, remove the hidden `penguinmod.com/embed/editor` login iframe (`home-communication.jsx`, loads on every start) and project-ID loading (`projects.penguinmod.com`, `asset-cdn.penguinmod.com`), and block those servers; 4, own forks or snapshots so builds survive upstream deleting things.
  - Credits screen: turn the "credit" note into an in-game credits list automatically (not asked).

## Recent sessions (newest first, at most 3; move older ones to the top of the archive's change log)

### Session 18 — icon studio (game-icons.net Studio controls) + tags (2026-10-04)
- Asked: the game-icons.net website's Studio controls instead of pre-baked black icons, also for Iconify, plus the website's tag system if possible.
- Changed:
  - New `patches/asset-libraries/pm-icon-studio.jsx` / `.css` (UI) and `pm-icon-svg.js` (drawing), copied in by section 16. Clicking a game-icons.net or Iconify icon (sprite and costume libraries) opens the studio. Its "+" button still adds the icon as it is.
  - Studio sections:
    - Background: 15 shapes, plain / linear / radial colour, 8 patterns, Kenney textures, frame.
    - Foreground: flip, rotate 45°, zoom, position, skew, colour or gradient, shadow / glow / inset, stroke, clip, Break apart with per-part colour and effects (click a part).
    - Text (6 editor fonts, outline, drag) and badge (the 59 game-icons badges, colours, label, drag).
    - Size (16–512) and 10 presets; reset per section.
  - Output: "Add to project" (vector) or "Add as picture" (PNG at double resolution, keeps every effect).
    - Studio vectors are cleaned with DOMPurify (scripts removed, SVG filters kept) and added directly: the normal upload strips filters and left the parts invisible.
    - The paint editor still drops filters when the costume is edited (hint shown).
  - Credits: studio icons say "modified" / "Modified from the original."; a badge adds its own line (`pmCredit.extra`).
  - Tags:
    - game-icons.net's 134 tags and 38 author names, fetched once by the new `scripts/fetch-game-icons-meta.mjs` into `patches/asset-libraries/game-icons-meta.json` (184 KB, in the app, not the offline library).
    - Tag filter in the Game Icons tab; tag rows "‹ previous · tag · next ›" in the studio.
    - Iconify: the icon set's categories as tags (online); clicking one lists the category.
  - Fixed:
    - Badges added from the Game Icons tab had a black symbol on the black disc.
    - Iconify previews were tiny.
    - The 429 rate limit of Iconify (Session 17) stays fixed.
  - The offline library is unchanged (still version 1).
  - To reverse: `git revert` the merge.
- Verified (local test app):
  - Studio: preset, badge, text and drag, break apart with click-to-select and per-part colour, gradient, texture, glow; vector and PNG added on the stage (vector glow visible after the fix, kept after save and reload); costume library studio.
  - Iconify: monochrome icon with gradient; palette icon (colour locked until broken apart, 4 colour parts); category tag opens 152 icons.
  - Credit lines including the badge line. `splitPath` checked on all 4,239 icons. Tags for 3 random icons match the website.
  - Kenney / backdrop regression.
  - Not verified: the CI build, the PNG text fonts on another PC.
- Result after build: not yet tested

### Session 17 — new asset libraries + automatic "credit" sprite (2026-10-04)
- Asked:
  - Delete the original libraries.
  - Sprites: Openverse (2D only) + Iconify + the whole Kenney 2D library (downloaded once by the updater) + game-icons.net.
  - Sounds: Openverse (sound and music only) + jsfxr, ZzFX, Bfxr + all Kenney sounds.
  - Backdrops: as sprites, but only images that fill the screen.
  - Never NC, ND, GPL or SA.
  - An undeletable "credit" sprite whose note lists every credit needed, kept up to date.
- Changed:
  - Patch section 16 + `patches/asset-libraries/`: the 4 library windows and the Surprise buttons, as listed in Current state.
    - Openverse: sprites with an "Illustrations / All images" choice; backdrops only wide or square JPEGs (never see-through); sounds from Freesound and Jamendo only (Wikimedia audio, mostly speech, left out); only CC0, public domain and CC BY.
    - Iconify: MIT, ISC, Apache-2.0, BSD, CC0, Unlicense and CC BY sets only, without the "Logos" and "Programming" categories (trademarks).
    - Added SVGs are redrawn so their size matches their drawing box (otherwise off-centre); icons are 128 px.
  - Credits:
    - Each added asset stores `pmCredit` (saved in the project).
    - The "credit" sprite (blank costume) appears with the first asset that needs credit. Its note lists one line per asset (author, links, licence, "Modified" after an edit in the paint or sound editor).
    - While credits are needed the sprite can't be deleted or renamed. The note is found by its text, because saving shortens comment ids.
  - Offline library 1, published as release `offline-library-1` (182 MB, 47,804 files):
    - Kenney: 42,588 sprites, 349 backdrops (no see-through pixels, ≥192 px, landscape or square; light masks, letter tiles and particles left out), 828 sounds. 5 sheet-only packs cut into tiles; `kenney-fonts` skipped (fonts).
    - game-icons.net (4,239 icons).
    - The 3 generators: their own "export WAV" adds the sound to the sprite.
  - `electron-main.js`, `updater.js`, `preload.js`, `package.json`, `main.yml`, `upstream.json` and the local test script, as listed in Current state.
  - To reverse: `git revert` the merge (the library release can stay).
- Verified (local test app and scripts):
  - Every source adds its asset with the right credit record: Kenney sprite, costume, backdrop and sound; game icon; Iconify; Openverse image, backdrop and sound; all 3 generators; all 4 Surprise buttons.
  - Credit sprite: created, note lines, Modified after an edit, line removed with the asset, delete and rename blocked, deletable once empty. Saved and reloaded: credits kept and still exactly one credit sprite (a duplicate "credit2" bug was found and fixed).
  - Icons are centred. Library files are served, paths outside the library give 404, and the patch is safe to run twice.
  - Updater library functions (13 checks with the real zip: install, SHA-256, wrong version rejected with the old library kept, pin read from an update zip, leftovers cleaned).
  - CI library step simulated against the real release; the test script downloads the release itself.
  - Not verified: the CI build (Linux, `jq`, `zip -x` exclusion; the step fails loudly if wrong), the installer, the updater inside an installed app (library download on update / at start).
- Result after build: not yet tested

### Session 16 — pin upstream to fixed commits (2026-10-04)
- Asked: step 1 of making the app independent from upstream and the internet: builds must stop picking up whatever upstream pushed last.
- Changed:
  - New `upstream.json` (8 commits, all equal to what the 2026-10-04 builds used, so the app content doesn't change).
  - New `scripts/clone-pinned.js` (`git init` + `fetch --depth=1 <commit>` + checkout, sets `core.longpaths`).
  - `main.yml`: every upstream `git clone` → `node scripts/clone-pinned.js <name>`.
  - Outside the repo, `run-local-test.ps1` uses the same helper and stops when its cache doesn't match `upstream.json`.
  - To reverse: `git revert` the merge.
- Verified:
  - All 8 projects downloaded by the helper are on the pinned commit, with a clean checkout.
  - A wrong name or an existing folder fails with a clear message.
  - The PenguinMod and TurboWarp galleries build from the pinned copies (on Windows).
  - Workflow YAML parses.
  - Local test `-Update`: fresh pinned download, `bun i`, patch, build OK, editor opens with all tweaks.
  - A fake commit in `upstream.json` makes the local test stop before patching.
  - Not verified: the CI run itself (Linux).
- Result after build: not yet tested

## Template (keep entries this short)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files> — <what, why, how to reverse>
- Verified: <what was run/seen> · Not verified: <…>
- Result after build: not yet tested
```

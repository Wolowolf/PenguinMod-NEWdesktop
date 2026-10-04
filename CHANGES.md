# CHANGES.md — current state and recent sessions

Kept short on purpose (read at the start of every session). Full history of Sessions 1–11, old Linux-sandbox test notes and the recipe to bring back Linux builds: `docs/CHANGES-archive.md` (search it with Grep, don't read it whole).

## Current state (update when it changes)

- **Baseline:** upstream commit `ab5e25a` (2026-06-15). Upstream builds stopped after 2026-09-06 (cause unconfirmed).
- **Upstream pins (`upstream.json`, Session 16):** CI and the local test download each of the 8 upstream projects at a fixed commit (`scripts/clone-pinned.js`): GUI `24faae9`, Vm `9c8e446`, Blocks `5e0503f`, Render `89a587a`, Paint `37f65d7`, PenguinMod gallery `971b034`, TurboWarp gallery `fe82589`, SharkPool gallery `e168e25` (all = what the 2026-10-04 builds used). Moving to newer upstream = edit the commits, local test with `-Update`, PR. Not pinned: the npm packages they install (lockfiles are partly deleted, see below).
- **CI (`main.yml`):** Ubuntu + wine, Bun, Node 26; actions `checkout@v7`, `setup-node@v7`, `cache@v6`, `setup-bun@v2` (Session 13). Downloads (pinned) and builds PenguinMod-ExtensionsGallery, TurboWarp extensions (`package-lock.json` deleted before `bun i`: its git-hosted checksum broke installs, Session 1), SharkPools-Extensions, and the GUI with Vm, Blocks (`develop-builds`), Render (lockfile deleted) and Paint. Runs the patch, writes `app/build-info.json` `{tag, builtAt}`, runs `electron-builder --win nsis` (version read from `package.json`), then `gh release create` publishes the `.exe` (renamed with dots) and `win-unpacked.zip`.
- **`package.json`:** one NSIS installer, x64 only; `electron` 44.5.1 and `electron-builder` 26.15.3 pinned (bump them by hand); unused Linux targets still listed; `asar: false`; dependency `unzipper`; `.pmp` file association.
- **App:** always opens `https://studio.penguinmod.com/editor.html` (or a `.pmp` given on the command line), served from `app/build`. Extension gallery URLs map to offline folders. Windows and links to penguinmod.com (and its projects./docs. hosts) and Discord are blocked (Session 15).
- **Updater (`app/updater.js`, Session 5):** System → Check for Updates. Picks this fork's newest published release with a complete `win-unpacked.zip`, compares its tag with `build-info.json`, checks size + SHA-256, then replaces, adds and removes files under `resources/app/` with full rollback on error (`.old` leftovers deleted at next start). Needs a writable install folder (not Program Files). Downloads ~230 MB each time. Restarts the app.
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
- **Not verified yet:**
  - The updater end to end inside a packaged install.
  - The installer itself (Claude has only tested the local build).
  - Fonts on other PCs.
  - Category order with a project file saved to disk and reopened (only in-app save and load were tested).
  - The user hasn't confirmed the builds from Sessions 3–6, 8–9 and 11 (Session 2's build was confirmed, Session 10's partly).
- **Ideas offered, not applied** (offer when relevant):
  - Square off the block shapes (needs a `scratch-blocks` patch, riskier).
  - Offline plan (Session 16), steps 2–4 left. Today the app goes online for: library files when you open or add a sprite, costume, sound or backdrop (1,304 from `assets.scratch.mit.edu` and 586 from `library.penguinmod.com`, about 135 MB estimated from a sample); a hidden `penguinmod.com/embed/editor` login iframe on every start (`home-communication.jsx`); the project server (`projects.penguinmod.com` and `asset-cdn.penguinmod.com`) only when opening a project by its online ID. Steps:
    - 2: offline library. CI downloads the files, `electron-main.js` maps the hosts. Update zip about 230 → 365 MB.
    - 3: remove the login iframe and project-ID loading, and block the known PenguinMod and Scratch-asset servers.
    - 4: own forks or snapshots so builds survive upstream deleting things.

## Recent sessions (newest first, at most 3; move older ones to the top of the archive's change log)

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

### Session 15 — remove cloud variables, Remix, Discord and website links (2026-10-04)
- Asked: remove the strongest candidates (cloud variables + change username, telemetry, Discord links, credits/About), the links that open the PenguinMod website, and Remix; clean the code; keep the online library, extension and project-server fetches.
- Changed:
  - `patches/stage-layout.js` section 15: Edit menu loses "Change Username" and the cloud toggler; the compile-error menu keeps its first line as plain text (no Discord links); every Remix item/button and the About button code are cut, with the imports and handlers only they used; the Sensing "Help Manual" button (opened docs.penguinmod.com) is gone; the add-on settings page loses its Discord button; the Google Tag Manager analytics script is removed from the page template; `cloudHost` is `null` so nothing can connect to a cloud server.
  - `app/electron-main.js`: windows and navigations to penguinmod.com, www./projects./docs.penguinmod.com, discord.gg and discord.com are blocked (`isBlockedWebsite`). studio.* and extensions.penguinmod.com still work.
  - To reverse: delete section 15 / `git revert` the merge.
- Found: the telemetry prompt was already dead (it only opens if something sets `showTelemetryModal`, and nothing does) and nothing in the editor links to the credits page, so both are untouched. The only real analytics was the Google Tag Manager script (removed). It is still in the static contact/privacy/terms pages, which nothing links to.
- Verified (local test app): Edit menu without the two items, File menu without Remix, error menu shows plain text only, no "Help Manual" in the Sensing palette, no `gtag` in `editor.html`, `window.open` to penguinmod.com / discord.gg / docs.penguinmod.com returns null, patch is safe to run twice. Not verified: `will-navigate` blocking, the add-on settings window (only checked that the built files lost the Discord link, did not look at it), CI build with fresh upstream.
- Result after build: not yet tested

### Session 14 — remove "See Project Page" and "Upload" buttons (2026-10-04)
- Asked: remove both buttons; the fork becomes a 2D game engine for serious packaged projects, not a Scratch / TurboWarp sharing platform; say what else should go.
- Changed: `patches/stage-layout.js` section 14 cuts the two menu-bar blocks (the `CommunityButton` and `ShareButton` blocks in `menu-bar.jsx`) and fails loudly if upstream changed them. To reverse: delete section 14 (or `git revert` the merge).
- Verified: local test app before (both buttons visible) and after (neither visible, rest of the menu bar unchanged); patch run twice is safe. Not verified: CI build with fresh upstream.
- Result after build: not yet tested

## Template (keep entries this short)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files> — <what, why, how to reverse>
- Verified: <what was run/seen> · Not verified: <…>
- Result after build: not yet tested
```

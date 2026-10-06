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

### Session 25 — a dot instead of "..." on cut category names (2026-10-06)
- Asked: in the category menu, instead of "..." at the end of a cut name, one dot under the first letter (the name is always capped there, so no extra padding needed).
- Changed: `patches/stage-layout.js` section 11: the name is cut off without "..." (one line: `text-overflow: clip`; selected box: a two-line height limit instead of `line-clamp`, which always adds "..."). A box whose name does not fit gets `data-pm-cut` (checked when it is made, when it is (de)selected and once fonts are loaded) and shows a 2 px white dot with a black outline in its bottom padding, under the first letter. Names that fit get no dot. To reverse: `git revert` the merge.
- Verified (local test app): default menu, no dots (all names fit); "Text to Speech" cut with the dot under the T; clicked (real click), it shows both lines and no dot; another box clicked, its dot came back; a name renamed on screen to be too long for two lines kept its dot when selected. · Not verified: the CI build, other extensions with long names (only on-screen checks above).
- Result after build: not yet tested
- Part 2 asked: the dot had a different outline from the letters.
- Part 2 changed: section 11: the dot uses the same five blurred shadows as the letters (`box-shadow` with the label's `text-shadow` values) instead of one hard 0.7 px outline. To reverse: `git revert` the merge.
- Part 2 verified (local test app): the computed shadow of the dot on "Text to Speech" matches; enlarged screenshot: soft outline like the letters. · Not verified: the CI build.
- Part 2 result after build: not yet tested

### Session 24 — projects with a monitor broke when double-clicked (2026-10-06)
- Asked: the user's `Default project.pmp` was broken (sprite size / position changes not shown until switching sprites, invisible sprites, other problems); find the cause, then fix it.
- Found: not our changes. Upstream VM bug: `runtime.addMonitorScript` runs a monitor that belongs to no sprite (timer, extension reporters, …) on the editing sprite. A project opened at start-up (double-clicked `.pmp`, i.e. `?project_url=`) has none yet, so a script with no sprite is started and `stepThreads` fails on it every frame: no redraw, sprite panel stale, scripts stopped, thousands of leftover runs. Loading from inside the app was fine (an old editing sprite exists). The project's Sprite1 also has an empty (0×0) costume, so it is invisible by design.
- Changed: `patches/stage-layout.js` new section 17: `addMonitorScript` returns when there is no target (the monitor updates next frame). To reverse: delete section 17 (or `git revert` the merge).
- Verified: same bug in the installed app (build `build-37389523012-…`) opened by file argument and by `?project_url=` (served from a local server); a copy with a timer monitor broke too, a copy without a monitor didn't. New local build, same `?project_url=` test: no engine error, no leftover runs, size / x boxes update at once, for the project and the timer copy; the timer monitor keeps counting. · Not verified: a real double-click with the new build (only the installed app takes a file argument), the user's other problems, the CI build.
- Result after build: confirmed by the user (build `build-37395127940-20261006-003924`, 2026-10-06): all fixed, including the double-clicked project.
- Part 2 asked: File → New (any project) shows "Oops! Something went wrong … Request returned status 404".
- Part 2 found: upstream `project-fetcher-hoc.jsx` reads `project_url` from the address on every project load, so New (and Reload) asked again for the double-clicked file's address; `app/electron-main.js` serves `__localfile__/…` only once, so the second request got 404.
- Part 2 changed: `patches/stage-layout.js` new section 18: `project_url` is removed from the address (`history.replaceState`) as soon as it is read; New makes an empty project, Reload opens the plain editor. To reverse: delete section 18 (or `git revert` the merge).
- Part 2 verified (local test app, project served once from a local server like `__localfile__`): before, New and Reload gave the 404 crash screen; after, the project opened, New gave an empty project, Reload a plain editor, the file was requested once. New keeps the stage size and loaded extensions, the same as after an in-app load (upstream behaviour). · Not verified: a real double-click with the new build, the "Download Error" button, the CI build.
- Part 2 result after build: not yet tested

### Session 23 — shortest legal credit lines (2026-10-05)
- Asked: make the credit sprite's lines as short as legally possible (example: `"Drink's Afterhouse" - Felixjd - CC BY 3.0 - modified` + source link + licence link), check it's legally sound, shorten more if possible.
- Changed: `patches/asset-libraries/pm-credits.js`: each line is title - author - licence - modified/recoloured, then the source link without `https://`. The licence links are listed once under "Licences:" at the bottom (CC lets you credit "in any reasonable manner"); a licence name with several links (e.g. Iconify sets' own MIT files) keeps its link on each line. Dropped: "licensed under", "via Europeana", "from game-icons.net", "an unknown author". Kept: title (CC BY 3.0 needs it), Europeana institution, Iconify "© holder" (MIT / Apache / BSD need the copyright notice). Header now says to show the licence links too. Notes in existing projects update when the project is opened. To reverse: `git revert` the merge.
- Verified: sample records of every library printed through the new code (grouping, http/https of one CC link merged, two MIT links kept per line); local test app: a credited costume made the "credit" sprite with the new note, seen on screen. · Not verified: adding through the library windows (unchanged code), the CI build. Not legal advice: a reading of the licence texts.
- Result after build: not yet tested
- Part 2 asked (2026-10-06): the credit sprite hidden by default with the user's `warning.svg`; a script in it that, when the sprite is clicked, fades to black, scrolls the credits (white, from below to above the stage, speed changeable), then fades back; credits in a local variable "credit" instead of the note; a fixed note (as wide as its line in parentheses) pointing to the variable and the script (also put in the backpack); "Package project" warns (given text) when no attached "show" block in the credit sprite calls it.
- Part 2 changed:
  - `patches/asset-libraries/pm-credits.js`: new sprite = hidden, costumes "warning" / "credits screen" (black 480×360) / "credits text" (empty, marks the text clone), variable `credit` (one paragraph per asset + licence list), note 640×210, three scripts built as sb3 blocks with the Animated Text extension (`extensions: ['text']`): click → clone fades in (ghost 10 steps) → text clone (size 60, Sans Serif, white, width 760, 2 blank lines above and below, the last one a no-break space because trailing empty lines are dropped) goes to y -180, waits one frame (so its height is known), glides to 180 + height at 40 px/s, broadcasts "credits end" → black clone fades out. Clones ignore clicks (costume-name check). Script put once into the local backpack ("credits screen"). Credit sprites from older versions (blank costume, no scripts) are replaced. `confirmPackaging(vm)`: counts `show` / `show [myself / credit]` blocks under a hat block, otherwise the warning with "Go back" / "Continue anyway".
  - `patches/stage-layout.js` section 16 f: the packager button waits for `confirmPackaging`.
  - To reverse: `git revert` the merge.
- Part 2 verified (local test app, 10 test credits):
  - Sprite, costumes, variable, note (its parenthesized line on one line), scripts laid out without overlap; save + reload keeps all of it with the extension; the old-style sprite was replaced; no-credit state empties the variable and allows deleting.
  - Real clicks: black fade-in, text scrolls at 40/s (23.8 s for 36 lines), fade-out, only the button left; clicking the black screen starts nothing. Stage pixels read each frame: no text in the bottom strip before it scrolls in and none at the top before the clone is deleted, with fencing on and off.
  - Backpack item (warning picture) dropped into Sprite1: all 3 scripts, a local `credit` variable.
  - Packager: warning with no show block and with a loose one; none with "when flag clicked → show" (packager window opened); "Go back" opens nothing, "Continue anyway" opens it.
  - Not verified: a game made by the online packager, `show [credit]` blocks, adding assets through the library windows, the CI build.
- Part 2 result after build: not yet tested
- Part 3 asked (2026-10-06): the user is not a native English speaker; always correct grammar in texts they give.
- Part 3 changed: `pm-credits.js`: grammar of the note ("holds the mandatory credits for all the licensed work in this project: you must show them…", "(their authors cannot claim your game, and you can use everything, even commercially)", "stored", "complies with") and of the packager warning ("ATTENTION!", "credits stored … are never shown", "if so, by continuing … you accept …"); note width 650 for the new parenthesized line (measured 620 + 24). Existing notes are rewritten when a project opens. To reverse: `git revert` the merge.
- Part 3 verified (local test app): new note 650 wide, parenthesized line on one line, no scrolling; an old-wording note was replaced; warning shows the new text. Not verified: the CI build.
- Part 3 result after build: not yet tested

## Template (keep entries this short)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files> — <what, why, how to reverse>
- Verified: <what was run/seen> · Not verified: <…>
- Result after build: not yet tested
```

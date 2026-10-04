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

### Session 20 — libraries unlocked with the user's own API key: Pixabay, Europeana, Openverse (2026-10-05)
- Asked: find more libraries that fit the rules but need an API key (preferably without request limits). They are locked by default and show an easy tutorial with links to get and enter your own key. Openverse goes behind the same lock if it's still relevant, and its preview bug gets looked at.
- Research (limits with a free key):
  - Europeana: none.
  - Pixabay: 100 searches a minute, no daily limit.
  - Openverse: 100 a minute, 10,000 a day; still relevant as the only source with credit lines plus Freesound / Jamendo audio, so it's kept behind a key.
  - Not chosen: Jamendo (35,000 a month; already inside Openverse), Pexels (200 an hour), Freesound (2,000 a day), Iconfinder (strict per plan).
- Changed:
  - New `patches/asset-libraries/pm-api-keys.js`: keys kept in `localStorage` `pmdesktop:apiKeys`, a test before saving, Openverse registration and token refresh.
  - New `pm-api-key-panel.jsx` / `.css`: the unlock tutorial (links open in the user's browser), "Change key", "Remove my key".
  - `pm-asset-sources.js`:
    - Pixabay search: vector / illustration / photo / all; backdrops = horizontal photos; 24-hour results cache as Pixabay asks.
    - Europeana search: reusability=open minus SA; credit = creator, institution, item page, licence.
    - Openverse now sends the token and keeps results for the session.
    - Downloads fall back through the app when a site blocks pages.
  - `pm-credits.js`: Europeana credit line.
  - `app/electron-main.js` + `preload.js`: `pm-open-external` (only https pages of pixabay.com, pro.europeana.eu, www.europeana.eu, api.openverse.org, docs.openverse.org) and `pm-fetch-bytes` (images / audio only, at most 40 MB, separate session without the app's cookies).
  - Sprite / costume / backdrop libraries: Pixabay, Europeana, Openverse; sound library: Openverse. Every online library opens on a random subject.
  - To reverse: `git revert` the merge.
- Verified (local test app):
  - The three libraries show "🔒 Key" and the tutorial.
  - With a made-up test key and simulated answers (Europeana: a real answer fetched with its public demo key; Pixabay: its documented format; Openverse: a simulated token with real search results), each unlocks, searches, and Change key / Remove my key work.
  - A Europeana image from an `http://` museum server was added through the fallback, with full credit data; Pixabay added with its credit record.
  - The open-in-browser refuses other sites and `http`; the download fallback refuses non-images.
  - Not verified: real Pixabay and Openverse keys, Openverse registration and email (Claude can't create accounts), the CI build.
- Result after build: not yet tested

### Session 19 — library browsing: random mix, related-words search, endless scroll, waveforms (2026-10-05)
- Asked:
  - A random full page when a library opens with an empty search.
  - Search that finds related assets ("fruit" → apple, orange…), and endless scrolling instead of "Show more".
  - Tiles with only the name and an orange "C" when credit is needed.
  - Icon previews in the last studio style.
  - Sound waveforms and durations.
  - Fix Openverse previews and speed; remove non-backgrounds from the Kenney backdrops.
- Changed (`patches/asset-libraries/`):
  - Search: words from names, packs and tags, ranked (name match, then pack/tag, then related word). Related words come from WordNet: new `scripts/make-search-words.mjs` → `search-words.json` (301 KB; 6,674 search words over our 4,047 name words; WordNet licence notice inside). Iconify searches also include up to 3 related words.
  - Random order when nothing is typed and no pack/tag is chosen. Iconify: three random everyday subjects mixed.
  - Endless scroll: IntersectionObserver on a marker after the last tile; it keeps loading until the page is full.
  - Tiles: name only, details in the tooltip, orange "C" at the bottom right of the preview.
  - Studio settings are stored in `localStorage` `pmdesktop:iconStudio`; the first default is now "Transparent, black". Game Icons / Iconify previews are drawn in that style, and "+" adds the icon as shown (`studioThumbs`, `quickAddStudio`).
  - Kenney sounds: waveform (48 bars) and length read from the file (`loadWaveform`), drawn like Freesound.
  - Kenney: preview / sample / information / instruction / update / changes images hidden everywhere (in the app, the library is unchanged).
  - Openverse: Wikimedia / Flickr own small previews (its preview service fails for SVG with HTTP 424), fallback to the original file, `filter_dead=false`.
  - To reverse: `git revert` the merge.
- Verified (local test app):
  - A new random mix each time the library opens.
  - "fruit" finds 161 items and "weapon" 650, with names first.
  - Scrolling loads 120 more; there's no "Show more" button.
  - The C marks appear on the right items.
  - After choosing the Fire preset, Game Icons and Iconify previews followed it and "+" added a Fire-styled icon.
  - All visible Kenney sounds got a waveform and duration.
  - The 18 junk backdrops are gone.
  - Openverse "arrow": 40/40 previews loaded, in 0.7 s.
  - Not verified: the CI build.
- Result after build: not yet tested

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

## Template (keep entries this short)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files> — <what, why, how to reverse>
- Verified: <what was run/seen> · Not verified: <…>
- Result after build: not yet tested
```

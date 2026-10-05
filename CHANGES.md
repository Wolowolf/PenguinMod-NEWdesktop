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
  - 16: the original sprite, costume, backdrop and sound libraries are removed. The library windows are `patches/asset-libraries/pm-asset-browser.jsx`; sources in `pm-asset-sources.js` (only CC0 / public domain / CC BY / MIT-style licences; never NC, ND, SA, GPL; no brand-logo icon sets). "Surprise" adds a random Kenney item. Every added asset carries a `pmCredit` record, saved in the project by a patch to the VM's `sb3.js`. `pm-credits.js` keeps the "credit" sprite. (Session 17) Clicking a game-icons.net or Iconify icon opens the icon studio (`pm-icon-studio.jsx`, `pm-icon-svg.js`); game-icons tags and author names come from `game-icons-meta.json`. (Session 18) Each library opens on "All", which searches every unlocked source at once (Session 21). Sound waveforms are coloured like Freesound's and made in a background worker, only for tiles in view (Session 21). Openverse / Pixabay show a limit counter; sound tiles play on click and add with "+" (Session 22). Credit lines are as short as the licences allow, licence links listed once at the bottom (Session 23).
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

### Session 23 — shortest legal credit lines (2026-10-05)
- Asked: make the credit sprite's lines as short as legally possible (example: `"Drink's Afterhouse" - Felixjd - CC BY 3.0 - modified` + source link + licence link), check it's legally sound, shorten more if possible.
- Changed: `patches/asset-libraries/pm-credits.js`: each line is title - author - licence - modified/recoloured, then the source link without `https://`. The licence links are listed once under "Licences:" at the bottom (CC lets you credit "in any reasonable manner"); a licence name with several links (e.g. Iconify sets' own MIT files) keeps its link on each line. Dropped: "licensed under", "via Europeana", "from game-icons.net", "an unknown author". Kept: title (CC BY 3.0 needs it), Europeana institution, Iconify "© holder" (MIT / Apache / BSD need the copyright notice). Header now says to show the licence links too. Notes in existing projects update when the project is opened. To reverse: `git revert` the merge.
- Verified: sample records of every library printed through the new code (grouping, http/https of one CC link merged, two MIT links kept per line); local test app: a credited costume made the "credit" sprite with the new note, seen on screen. · Not verified: adding through the library windows (unchanged code), the CI build. Not legal advice: a reading of the licence texts.
- Result after build: not yet tested

### Session 22 — limit counter, Europeana download fix, real random mix, sound tiles (2026-10-05)
- Asked: a counter for libraries with request limits; fix the Europeana bug (adding hangs); Iconify / Openverse / keyed libraries open on only 3–4 subjects; sound tiles: "+" at the top right like icons, no play button, click anywhere else to play.
- Changed:
  - Europeana hang: Electron's `net.fetch` never answers (and logs `TypeError: Cannot convert argument to a ByteString`) when a server sends a header with non-ASCII bytes (muis.ee: `Content-Disposition: …filename=PÕMu…`). `app/electron-main.js` `pm-fetch-bytes` now uses `net.request` (30 s, 40 MB); `fetchFile` (`pm-asset-sources.js`) also asks the app after 3 s without an answer, first good answer wins.
  - New `patches/asset-libraries/pm-limits.js` (copied by section 16): counts Openverse (100/min, 10,000/day) and Pixabay (100/min) searches in `localStorage` `pmdesktop:apiUsage`, prefers the sites' own numbers (`x-ratelimit-*` headers; `electron-main.js` adds `Access-Control-Expose-Headers` for api.openverse.org and pixabay.com; Cloudflare-cached answers ignored), and stops a search with "limit … used up, more in about N s" instead of sending it. "Limits: …" line under the note (single library and "All"), orange when low, red at 0.
  - Random mix (`newRandomMix` per opening): Iconify 12 random subjects taken in turn (word list longer; drawings loaded 6 icon sets at a time); Openverse and Pixabay search without a word at random pages (1–12); Europeana `sort=random_<seed> asc`.
  - Sound tiles: "+" adds, a click plays / stops; the tile is outlined and a line moves over the waveform while playing.
  - To reverse: `git revert` the merge.
- Verified (local test app; keyed answers simulated with made-up keys):
  - The muis.ee image (Europeana "Kass / Cat") added in 4.6 s with its credit; the old error only in the log (no popup: the app already catches main-process errors; the popup the user saw came from Claude's bare Electron test script).
  - Counter: counts and wording; with simulated Openverse numbers (20/min, 200/day) it switched to them and at 0 sent nothing and said "more in about 33 s". A real anonymous Openverse answer showed its limit headers readable by the page.
  - Iconify opened on 12 subjects (60 icons, 40 sets); Openverse / Pixabay without a word at random pages; Europeana random order.
  - Sound tiles: click plays (orange outline, moving line), stops by itself or on a second click; "+" added "laser3" without playing; icon "+" unchanged.
  - Not verified: real Pixabay limit headers (no key), Openverse's header names for keyed requests, the CI build.
- Result after build: not yet tested
- Follow-up asked: Jamendo songs had no colourful waveform (grey shape only).
- Follow-up changed: `pm-waveforms.js` takes 24 short samples (16 KB, ~1.4 s each, ~0.4 MB per song) spread over the song's 96 kbps MP3 and colours Openverse's shape with their spectral centroids (blended in between); `app/electron-main.js` `pm-fetch-bytes` / `preload.js` `fetchBytes(url, range)` can fetch one part of a file (at most 256 KB, must answer 206; Jamendo doesn't let pages read its files and ignores multi-part requests). Grey shape as before if no sample can be read.
- Follow-up verified (local test app): 3 real Jamendo songs got their own colour patterns (copies identical), first 10 tiles in 1.5 s. Not verified: the CI build.
- Follow-up result after build: not yet tested

### Session 21 — "All" search in every library; Freesound-style waveforms (2026-10-05)
- Asked: a general search per library (sprite/costume, backdrop, sound) as a new first sidebar entry "All", selected when a library opens, searching every default source plus the unlocked key sources at once, mixed round-robin; source in the tooltip; locked sources left out with a hint; respect rate limits; one failing source doesn't stop the others.
- Changed (`patches/asset-libraries/`):
  - `pm-asset-sources.js`: new `mixedSearch()`: one feed per library, next batch mixed round-robin; a library's next page loads only when its items run out (at most 3 pages per batch, 20 s timeout); libraries that run out or fail leave their share to the others; per-library counts and failures. Pixabay / Europeana results now report their total.
  - `pm-asset-browser.jsx`: "All" first in the sidebar ("N libraries"):
    - sprites/costumes: Kenney, Game Icons, Iconify (+ Pixabay, Europeana, Openverse with a key);
    - backdrops: Kenney (+ the three keyed ones); sounds: Kenney (+ Openverse), not the generators.
    - Each library's first choices (all packs/tags, Openverse illustrations / sound effects, Pixabay vectors). Batches of 120; Iconify drawings loaded per batch with `loadIconSvgs`.
    - Tooltip "From <library>"; count tooltip per library; note naming the searched and the lockable libraries; "Left out for now: …" when one fails.
    - Searches on Enter when an online library is included, as you type otherwise.
    - The studio's ‹ › arrows only step through icons; a studio tag opens the icon's own library (Game Icons tag / Iconify category).
  - To reverse: `git revert` the merge.
- Verified (local test app, Pixabay / Europeana / Openverse answers simulated with made-up keys; Europeana data from its demo key):
  - Sprites with all 6 libraries: 20 from each, in turn; scrolling twice gave 360 (60 each), one request per online library per batch.
  - "fruit": Kenney's 161 matches, names first. Pixabay HTTP 500 + Openverse 429: both left out with a note, one request each; the rest shared fairly.
  - Backdrops: 30 from each of 4. Sounds: Kenney 60 + Openverse 60; without Openverse: "1 library", search as you type.
  - Added from All: Kenney sprite, Game Icons "+" (studio style, "modified" credit), Openverse image.
  - Studio from All; tag "electronic" → Game Icons tab (73); Iconify category "File" → Iconify tab.
  - Not verified: real keys, the CI build. A Europeana item from muis.ee hangs while adding (also via the app's fallback; curl gets it in 0.6 s): older issue, not caused by this change.
- Result after build: not yet tested (build `build-37245917125-20261005-000240` succeeded)
- Part 2 asked: sound waveforms as accurate as possible, colour-coded like Freesound, and no more stuttering.
- Part 2 changed:
  - New `patches/asset-libraries/pm-waveforms.js` (copied in by section 16):
    - Kenney and short (≤ 60 s) Openverse sounds: decoded only when the tile comes into view (3 at a time). A background worker works out one column per screen pixel (lowest / highest sample) and colours it by spectral centroid on Freesound's palette (FFT 2048, 100 Hz–22 kHz log scale), then paints a PNG.
    - Openverse Freesound sounds: Freesound's own picture (`displays/…_wave_M.png`); if it fails: decoded, or Openverse's waveform.
    - Openverse songs (Jamendo, > 60 s): Openverse's waveform endpoint (loudness only, grey; tooltip says so), at most 30 a minute.
    - Pictures are kept on the item for the session. Without a worker the same code runs on the page.
  - `pm-asset-browser.jsx`: `SoundWave` tile part, updated on its own (no more grid re-render every 150 ms); its size comes from the IntersectionObserver (measuring each tile made the page lay out 120 times in a row).
  - `pm-asset-sources.js`: `loadWaveform` removed; Freesound picture / Openverse waveform links on Openverse sounds; `openverseFetch`, `fetchFile` exported; "All" loads at most 3 pages per library per batch in total (it was up to 6 when the others ran out).
  - To reverse: `git revert` the merge.
- Part 2 verified (local test app; CPU slowed 4× via DevTools to imitate a slower PC; 5 s scripted scroll from a fresh start):
  - Before: 10 long tasks (938 ms), worst frame 240 ms. After: 0 long tasks, worst frame 80 ms (27–40 ms on two other searches). A CPU profile shows no waveform work left on the page.
  - Only visible tiles (+150 px) are decoded; colours look right (NES square waves yellow, low engines blue, sweeps orange); app-made waveforms of Freesound previews look close to Freesound's own pictures.
  - Simulated Openverse answers: Freesound pictures load; with them blocked on purpose the short ones were decoded, the long one got Openverse's waveform; a real Jamendo waveform (fetched earlier) drawn in grey.
  - Play / stop and adding a sound still work; "All" re-checked (sprites 20 × 6; sounds: 3 Openverse requests per batch).
  - Not verified: real Openverse waveform limits for keyed users, the CI build.
- Part 2 result after build: not yet tested

## Template (keep entries this short)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files> — <what, why, how to reverse>
- Verified: <what was run/seen> · Not verified: <…>
- Result after build: not yet tested
```

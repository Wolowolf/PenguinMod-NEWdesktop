# CHANGES archive — PenguinMod Desktop (my fork)

> **Archive, not read by default.** Full, unshortened history of Sessions 1–11 (moved here from `CHANGES.md` in Session 12 to save tokens). The current state and recent sessions are in `/CHANGES.md`. Search this file with Grep (e.g. `Session 7`, `updater`, `reverse`) instead of reading it whole. Facts below describe the state at the time they were written; `/CHANGES.md` wins where they differ. Older sessions removed from `/CHANGES.md` are added at the top of the change log here.

- **My fork:** https://github.com/Wolowolf/PenguinMod-NEWdesktop
- **Upstream:** https://github.com/FreshPenguin112/PenguinMod-Desktop
- **Goal:** a modified, Windows-ready PenguinMod Desktop app, changed a bit at a time over many conversations.
- **Baseline:** upstream commit `ab5e25a48d5fc6d3f455a775922771a562567886` (2026-06-15). Latest upstream release when work started: Build #152, tag `build-34027387628-20260906-102545` (2026-09-06). No newer upstream tags seen as of 2026-09-29.

---

## About the user and how to work with them

- Beginner with GitHub. Explain steps in plain language, one at a time.
- Sessions 1-6 happened in chat, where they edited through the **GitHub website** (open file → pencil icon → paste → Commit changes) because Claude could not push. If Claude Code is committing to branches and opening pull requests now, explain each pull request and how to merge it. For YAML, indentation must be kept exactly.
- A push to `main` (other than changes that only touch `*.md` files) triggers a build automatically; pushes to other branches do not (checked in Session 7: `on: push: branches: [main]` + `paths-ignore: '**.md'`). Results are in the fork's Actions tab, then Releases.
- Only Windows matters. Windows x64 installer is the main deliverable.
- Language: English.

## Sandbox limits (what Claude could and couldn't do in the chat sandbox used for Sessions 1-6)

> Claude Code (cloud or on the user's PC) may have different limits. Check what you can actually do before relying on this section.

- Claude **cannot push** to GitHub, **cannot build or test Windows binaries**, and cannot run the app.
- Network from the sandbox is an allow-list: github.com, codeload.github.com, raw.githubusercontent.com, npm/yarn registries, PyPI. Other hosts are blocked (e.g. `cdn.jsdelivr.net` returns 403), so full builds that download from other sites **can't be verified locally**; say so honestly and let the fork's Actions run be the real test.
- `api.github.com` is rate-limited from the sandbox. Use `git clone` / `git ls-remote --tags` instead.
- **Shell gotchas:** don't run `pkill -f <name>` inside a tool command (it matches the shell's own command line and kills it; use `ps aux | grep … | awk '{print $2}' | xargs kill`). The tool shell has no `{a,b}` brace expansion and no `time`. If `npm i electron` leaves no `dist/` folder, run `node node_modules/electron/install.js`. Put `timeout` on every long command.
- **Updater testing (Session 5):** `app/updater.js` has no Electron dependency, so it is tested in plain Node against synthetic zips and against the fork's REAL `win-unpacked.zip` (download with `curl -L https://github.com/Wolowolf/PenguinMod-NEWdesktop/releases/download/<tag>/win-unpacked.zip`, ~227 MB; tags via `git ls-remote --tags`). `api.github.com` is rate-limited, so release JSON can't be fetched live.
- `npm i -g bun` works in the sandbox (bun 1.4.2 was used to reproduce a CI error).
- **Testing the GUI in the sandbox (worked in Session 2):** clone `PenguinMod/penguinmod.github.io` plus the 4 submodule repos like CI does, use `bun i --ignore-scripts` (the `chromedriver` install script is blocked), then `NODE_ENV=development bun run build` with `NODE_OPTIONS="--openssl-legacy-provider --max-old-space-size=2800"`. The production build gets killed at the Terser minify step (1 CPU, ~4 GB RAM), so use development mode. Serve `build/` with `python3 -m http.server` and drive it with Python Playwright (Chromium works; `window.vm` is available for `vm.setStageSize(w, h)`). This tests the web editor in Chromium, **not** the Electron app or Windows.
- **Testing in REAL Electron in the sandbox (worked in Session 3):** `npm i electron@latest` in a scratch folder works (binary downloads from GitHub); `xvfb-run`/`Xvfb` is installed. Build a test app folder: copy the fork's `app/` to `pm/app/`, copy the GUI dev build to `pm/app/build/`, add `pm/package.json` with `{"main":"app/electron-main.js","dependencies":{"unzipper":"^0.12.3"}}` and `npm i` there. Put `{"startupPage":"editor"}` in `<user-data-dir>/app-settings.json`. Launch with `--no-sandbox --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist --in-process-gpu --remote-debugging-port=9333 --user-data-dir=...` (do NOT use `--disable-gpu`: it removes WebGL and the editor shows "Browser is not supported"). Drive it with Python Playwright `connect_over_cdp("http://localhost:9333")`. Background processes die when a tool call ends, so launch Xvfb + Electron + test inside ONE python script. Gotchas: the app shows a native "leave page?" dialog (blocks `page.reload`) once a project has unsaved changes; flags end up in `process.argv[1]` and the app logs a harmless "Failed to load local project file" error. This is the closest check to the user's real app, but it is still Linux + software rendering, not Windows + GPU.

---

## Project facts (verified by reading the code at the baseline commit)

**Type:** thin Electron wrapper (~940 lines of JS after Session 5) around the PenguinMod editor only (no home page since Session 5), with offline copies of extension galleries. The heavy content is built by CI, not stored in the repo.

**Files in the repo:**

| Path | Notes |
| --- | --- |
| `app/electron-main.js` | Main process, 543 lines (was 664 before Session 5) |
| `app/preload.js` | 77 lines (was 71) |
| `app/updater.js` | NEW in Session 5, 321 lines: the update engine (no Electron dependency) |
| `app/index.html` | 100 bytes, tiny stub |
| `app/logo.ico` | app and file-association icon |
| `app/postinstall.sh` | used by the Linux deb/rpm only |
| `package.json` | entry point + electron-builder config |
| `.github/workflows/main.yml` | the CI build (see below) |
| `patches/stage-layout.js` | Node script run by CI; edits the downloaded PenguinMod GUI source (added in Session 2; sections 1-11 as of Session 6) |
| `README.md`, `LICENSE`, `.gitignore`, `.gitattributes` | |

**`package.json` highlights:** `main` = `app/electron-main.js`; `appId` = `com.penguinmod.desktop`; `productName` = `PenguinMod Desktop`; version `1.0.0`; `.pmp` file association; build output dir `builds`; packages `app/**/*`; `asar: false`; `electron` and `electron-builder` are both `"latest"` (unpinned); one runtime dependency `unzipper ^0.12.3`. Windows target: **NSIS installer** for x64, ia32, arm64 (`oneClick: false`, install directory selectable, desktop + start-menu shortcuts). Linux targets: AppImage, deb, rpm.

**`electron-main.js` (read completely in Session 5):** maps local folders inside `app/` — `build` (editor, served as `https://studio.penguinmod.com/…`), `TurboWarp-ExtensionsGallery`, `PenguinMod-ExtensionsGallery`, `SharkPools-Extensions`. Rewrites known remote URLs (e.g. `extensions.turbowarp.org`) to those folders so they work offline. Always opens `https://studio.penguinmod.com/editor.html` (or the `.pmp` file given on the command line). Menu bar: **System → Check for Updates, Reload**. `app-settings.json` in the userData folder now only holds the hidden Node.js-enable flag (an old `startupPage` value is ignored).

**Installed layout (verified from the real `win-unpacked.zip`, Session 5):** the zip's entries are all under `builds/win-unpacked/`, which mirrors the install folder: `PenguinMod Desktop.exe`, Electron dlls/paks/`locales/`, `resources/elevate.exe`, `resources/app/package.json`, `resources/app/node_modules/` (unzipper + deps), and the app code in `resources/app/app/` (so `__dirname` = `<install>/resources/app/app`; editor at `…/app/build/editor.html`). The NSIS installer's own `Uninstall PenguinMod Desktop.exe` is NOT in the zip. User data (settings, Electron storage) lives in the userData folder (AppData), never in the install folder.

**The updater (Session 5 rewrite):** see the Session 5 entry. Points at `Wolowolf/PenguinMod-NEWdesktop`, asset `win-unpacked.zip`.

**CI workflow (`.github/workflows/main.yml`), summary:**
- Name `Build`. Triggers: `workflow_dispatch` and `push` to `main` only, ignoring `*.md`-only changes (the daily `schedule` was removed in Session 5; the branch/`.md` filter was found already in place in Session 7). Runs on `ubuntu-latest` with `contents: write`.
- Installs wine32/wine64, Bun, Node 26.
- Clones and builds: PenguinMod-ExtensionsGallery, TurboWarp/extensions (as `TurboWarp-ExtensionsGallery`), SharkPools-Extensions, and the PenguinMod GUI (PenguinMod-Home is no longer cloned or built since Session 5) with its submodules (Vm, Blocks, Render, Paint; Render gets `rm -f package-lock.json` before `bun i`).
- **Since Session 2:** a step "Patch GUI stage layout" (`node patches/stage-layout.js penguinmod.github.io`) runs right before "Build PenguinMod Web".
- **Since Session 3 the workflow is Windows-only** (see "Windows-only builds" in the change log; a reverse recipe is at the bottom of this file). Releases now contain 2 assets: `PenguinMod.Desktop.Setup.1.0.0.exe` and `win-unpacked.zip`.
- Then: `bun i --omit=dev`, **"Write build info"** (Session 5: writes `app/build-info.json` = `{tag, builtAt}`, which ends up in `resources/app/app/`), Build Electron App, zip `linux-unpacked` and `win-unpacked`, create a GitHub Release tagged `build-<run_id>-<timestamp>`, upload assets.
- Release assets (8 per release). Names seen: `PenguinMod.Desktop.Setup.1.0.0.exe`, `PenguinMod.Desktop-1.0.0.AppImage`, `penguinmod-desktop_1.0.0_amd64.deb`, `penguinmod-desktop-1.0.0.x86_64.rpm`, `linux-unpacked.zip`, `win-unpacked.zip`.
- Not verified in detail: exactly how the built folders get copied into `app/`, and the steps after "Build PenguinMod Web".

**What to give the user for Windows:** `PenguinMod.Desktop.Setup.1.0.0.exe` (installer) or `win-unpacked.zip` (portable). The exe is unsigned, so Windows SmartScreen shows a warning ("More info" → "Run anyway").

---

## Change log (newest first)

### Session 13 — modern CI actions, pinned Electron, x64 only (2026-10-04)
- Asked: upgrade the deprecated GitHub Actions, pin `electron` / `electron-builder`, drop the ia32 and arm64 targets.
- Changed:
  - `main.yml`: `checkout@v4→v7`, `setup-node@v4→v7`, `cache@v3→v6` (twice), `setup-bun@v1→v2`. `create-release@v1` and `upload-release-asset@v1` (deprecated, no newer version) became one `gh release create` step with the same tag, title, notes and prerelease flag. The installer is renamed `PenguinMod.Desktop.Setup.1.0.0.exe` explicitly. `npx electron-builder@<version from package.json>`.
  - `package.json`: `electron` 44.5.1 and `electron-builder` 26.15.3 (exactly what the last build used); win arch list is x64 only.
  - `CLAUDE.md`: the "unpinned" and "Node.js 20" lines.
  - To reverse: `git revert` the merge.
- Found: the last build (run 37161397599) was already x64 only (`archs=x64`): the `--win nsis` on the command line overrides the arch list in `package.json`. So dropping ia32/arm64 is tidying, not a speed-up. Builds take about 5 minutes either way.
- Verified: YAML parses; the new release step run with a fake `gh` gives the right arguments, notes text and file name; the version expression gives `26.15.3`; the action tags exist. Not verified: the real CI run with the new action versions and `gh release create` (only a build can show it).
- Result after build: not yet tested

### Session 12 — fewer tokens per session (2026-10-04)
- Asked: cut token usage without losing accuracy; explore every option and apply it.
- Changed:
  - `CHANGES.md` was moved to `docs/CHANGES-archive.md` unchanged (header only), and this short file replaces it.
  - `CLAUDE.md` was rewritten concisely with the same rules. The obsolete Linux-sandbox test recipes moved out (they are in the archive), and a "Saving tokens" section was added.
  - Outside the repo:
    - `run-local-test.ps1` now closes a running test app first. It writes the build output to `build.log` and prints only a summary, or the last 40 lines on failure. It starts the app through a hidden `cmd`, with the app's output in `app-out.log` / `app-err.log`. With `-Debug` it waits until the editor is loaded on port 9333.
    - `cdp.mjs` gained `ready`, `click` and `drag` commands and uses `127.0.0.1`.
  - To reverse: `git revert` the merge. For the test tools, ask Claude.
- Bug found and fixed: the app never started after a full test run (the "launch left no app running" noted in Session 8). The build's `NODE_OPTIONS=--openssl-legacy-provider` leaked into the app, and Electron refuses to start with it ("not allowed in NODE_OPTIONS", seen in `app-err.log`). The script now clears `NODE_OPTIONS` / `NODE_ENV` after the build.
- Why: the session was measured with the transcript. Re-reading Claude's instructions plus this file was about 41% of the weighted usage, and files read once (old `CHANGES.md` was ~14k tokens) about 40%. Long build output was re-read on every later step.
- Verified:
  - Size: `CLAUDE.md` went from 11.9k to about 7.6k characters, and `CHANGES.md` from 55.5k to about 8k. The archive is the old file unchanged apart from its header.
  - Test tools on Windows: a launch-only run and a full run, both with `-Debug`.
    - The old app was closed each time.
    - The full run printed 15 lines (was hundreds) and returned in 14 s, even with its output captured.
    - The app window "PenguinMod - Editor" was visible, and the port was ready when the script ended.
    - `cdp.mjs ready` / `drag` (Lists moved to the top) / `eval` / `click` and the usage message worked.
- Not verified: the real token saving in the next session, which will show it.
- Result after build: `.md`-only change, builds nothing.

### Session 11 — category drag: last place reachable, order really saved in the project
- Requested: (1) with the default 10 boxes an extension box could not be dragged below the last one ("My Blocks"); (2) make the box order be saved inside the project.
- Files changed: `patches/stage-layout.js` only (section 13 extended: 13b edited, new 13c; branch `tweak/category-drag-fixes`), `CHANGES.md`.
- Causes found (both reproduced in the running app first):
  1. The held box is kept inside the menu, so it can only reach the MIDDLE of the first/last box, and the rule "its middle must pass the other box's middle" never became true for the last place. Fix (13b): when the held box is pushed against the top / bottom end it counts as first / last place.
  2. The upstream addon already writes the order into the project (a comment on the Stage, written by a wrapper of `vm.toJSON`, read again on `PROJECT_LOADED`), but `saveOrdering` returned as soon as that comment existed, so only the FIRST re-ordering was ever stored; later ones were lost and loading brought back the first order. Fix (13c): the one-line check `if (findOrderingComment()) return;` now updates the existing comment (new function `pmUpdateOrderingComment`) before returning. The drop also calls `vm.runtime.emitProjectChanged()` so the editor knows there are unsaved changes (it did not before).
  3. Found on the way: opening a project that has NO stored order kept the previous project's order (the addon sorts the toolbox XML in place). Fix (13b): an extra `PROJECT_LOADED` handler forgets the order and rebuilds the menu with `workspace.updateToolbox(<the editor's untouched toolboxXML from the redux store>)` (the call the editor itself makes).
  - *To reverse:* delete the new parts of section 13 (or all of section 13), or ask Claude.
- Verified how: ran `run-local-test.ps1 -Debug` on Windows (patch applied, production build, Electron 44.5.1) and drove the app with real mouse events through the debug port. Before the fix: dropping Motion 40 px below "My Blocks" left it second to last; the second re-ordering was not in the saved project and reloading brought back the first order. After the fix: it lands last; `vm.toJSON()` contains the newest order after each re-ordering; `saveProjectSb3` then `loadProject` restores exactly the order seen before saving; loading a project saved before any re-ordering shows the default order again. With 41 boxes (22 built-in extensions loaded through `vm.extensionManager`, the menu scrolls: 885 px of content in 570 px): holding a box at the bottom edge scrolled the menu from 0 to 315 px (its end) and the box landed after the last extension. NOT verified: a project file saved to disk and opened with File > Load from your computer (only the in-app save/load path was used), custom extensions loaded from a URL, the CI build.
- Result after build: not yet tested.

### Session 10 — category boxes slide when re-ordered by dragging
- Requested: when dragging a category box to re-order the menu, the held box was greyed out, a floating copy followed the mouse and a blank gap opened where it would land. Instead: the box itself should slide up and down between the others while dragging, with no copy or icon.
- Files changed: `patches/stage-layout.js` only (new section 13 + header item 11; branch `tweak/slide-category-drag`), `CLAUDE.md` ("sections 1 to 13"), `CHANGES.md`.
- What changed and why: the re-ordering is upstream's addon "Draggable Categories in Block Palette" (`src/addons/addons/toolbox-category-drag/userscript.js`, by SharkPool; hold a box for 0.5 s, then drag). Its drag function faded the held box to 50% opacity, created a floating clone with a shadow, and shifted the boxes below. Section 13 (a) changes the one-line hold handler to call a new function `pmInitSlideDrag` instead of `initDragDroper`, and (b) inserts that function next to the old one (the old one stays in the file, unused). New behaviour: the held box is moved with `transform: translateY` to follow the mouse up and down (it stays in its column, is kept inside the menu, drawn above the others); the other boxes slide by one box height (0.15 s) as the held box's middle passes theirs; no opacity change, no clone. The menu scrolls when the mouse is near its top or bottom edge (now smoothly, every frame, even if the mouse is still). On release the addon's own steps run unchanged: move the box in the DOM, save the order (project comment), rebuild the menu, select the moved category. Two sizes are handled (a selected box is two lines tall).
  - *To reverse:* delete section 13 from `patches/stage-layout.js` and the header line, or ask Claude.
- Interpretation choice: a gap still opens between the other boxes, but it is the real landing spot and the held box moves into it (a blank space that is not under the held box cannot be avoided in a slide-to-reorder list). The hold of 0.5 s before the drag starts is unchanged (it keeps a normal click from starting a drag); it could be shortened if wanted.
- Verified how: ran `run-local-test.ps1 -Debug` on Windows (patch applied, production build, Electron 44.5.1) and drove the app with real mouse events through the debug port: held a box for 0.7 s and dragged it down (Sound moved from 3rd to 5th place: boxes in between slid up by one box height, held box had `translateY`, no opacity set, 0 floating copies, screenshot taken mid-drag), up to the very top (Lists to first place), and down to the end (clamped inside the menu). After each drop the order in the menu was the expected one and the moved box was selected. NOT verified: that the new order is saved inside a saved project and restored on loading (unchanged addon code, not re-tested), auto-scroll at the edge (the menu has only 10 boxes here and does not scroll), dragging with many extensions loaded, the "Two-column category menu" addon (upstream already notes it is buggy with this addon), the CI build.
- Result after build: not yet tested.

### Session 9 — thinner category boxes (one line, selected = two lines, white outlined text)
- Requested: category boxes one line tall instead of two; a dot at the end when the name is too long; the selected box extends to two lines instead of having a black/white square frame; text aligned to the top left instead of the centre left; text always white with a thin black outline; half the padding on all sides (single and double line).
- Files changed: `patches/stage-layout.js` only (section 11 edited, its header comment updated; branch `tweak/compact-category-boxes`), `CHANGES.md`.
- What changed and why (all in section 11):
  - 11a: the JS hook no longer works out a dark/white text colour (the text is always white now); it still sets `--pm-cat-colour` on each entry.
  - 11b: boxes have no fixed height any more. Padding = half of Session 6: `0.215rem 0.15rem` (was about 0.43rem top/bottom, 0.3rem sides). The menu is `4.5rem` wide (was 4.8rem; the width shrank by the saved side padding, so "Pointerlock" still fits). Not selected: label on one line (`white-space: nowrap`, `text-overflow: ellipsis`), box 68 x 19.2 px. Selected: no frame; `min-height` of two lines, label allowed two lines (`-webkit-line-clamp: 2`), box 68 x 31.5 px, still in the category colour. Text: white (`#fff !important`), top left, with a thin black outline made of `text-shadow`: four 0.7 px blurred shadows (left, right, up, down; blur 0.6 px) plus a 1 px soft halo. This replaced a first version with `-webkit-text-stroke: 1px #000`, whose outline looked uneven on screen; six variants were compared zoomed 4x in the running app (1 px stroke, 0.5 px stroke, 8 hard shadows, soft halo only, the chosen one, stroke with geometricPrecision) and this one was the smoothest and still clearly visible on yellow (`align-items: flex-start`).
  - *To reverse:* restore section 11 from the Session 8 version of the file in git (commit before this branch), or ask Claude.
- Interpretation choices: (1) "a '.'" is shown as the browser's standard ellipsis character "…" (the usual "name is cut" mark), both in the one-line and the two-line (selected) case; a literal single "." is not possible with plain CSS for the two-line case. (2) A selected box is always two lines tall, even for short names like "Motion", otherwise a short name would show no sign of being selected. (3) The selected box pushes the boxes below it down by about 12 px (it grows in the layout, it does not cover them).
- Verified how: ran `run-local-test.ps1` on Windows (patch applied, production build, Electron 44.5.1): all 10 default boxes are 68 px wide; 9 are 19.2 px tall and the selected one 31.5 px; computed padding 3.44 / 2.4 px; text colour rgb(255,255,255); text-shadow as described above (checked again zoomed 4x after the change: even outline on all colours); no box-shadow frame; selected box keeps its colour (Motion rgb(76,151,255)); clicking "Operators" moves the two-line box to it and the block palette still starts right next to the menu (screenshot). Long and two-line names were checked with sample boxes injected into the running page ("Operators Expansion" -> "Operators …" when not selected, two lines when selected, a 40-letter name cut with "…"). One bug found and fixed on the way: the selected box first lost its colour (upstream's selected style overrides the background), now set explicitly. NOT verified: real extension entries (injected samples only), the CI build, Windows fonts other than what this PC has.
- Merged as pull request 3 (build started on 2026-10-03/04, see the Actions tab). The user also gave standing permission to merge pull requests automatically after a passing local test; written into `CLAUDE.md` (workflow step 6 and the build-rules section).
- Result after build: not yet tested.

### Session 8 — remove the "Back to Home" button
- Requested: delete the "Back to Home" button in the editor's top bar (a link to the live penguinmod.com site; the app has no home page). Also: future sessions must open and merge pull requests themselves with `gh` (done in `CLAUDE.md`, merged to `main` as pull request 1 before this tweak).
- Files changed: `patches/stage-layout.js` only (new section 12 + header item 10); `CLAUDE.md` ("sections 1 to 12"), `CHANGES.md`. Branch `tweak/remove-home-button`.
- What changed and why: section 12 removes the whole `<div className={styles.menuBarItem}><a … href="https://penguinmod.com" …><Button …>Back to Home</Button></a></div>` block from `src/components/menu-bar/menu-bar.jsx` (exact match, `PATCH FAILED` if upstream changes it) and leaves a `PMDESKTOP_STAGE_PATCH` comment in its place. Not touched: the "See Project Page" and "Upload" buttons next to it. *To reverse:* delete section 12 from `patches/stage-layout.js` and the header line.
- Also fixed in the local test script (outside the repo): it now deletes the editor's `build\` folder before building, because webpack never deletes old bundle files, so a previous build's files were being copied into the test app (and a CI build always starts empty).
- Verified how: ran `run-local-test.ps1` on Windows (patch applied, production build, clean `build\`): in the running Electron 44.5.1 app the page text no longer contains "Back to Home", there are no links to penguinmod in the top bar, the string `pm.backToHomeButton` is gone from the bundle, the top bar reads File / Edit / Addons / Settings / See Project Page / Upload, and the rest of the layout (stage, category menu, sprite panel) looks the same in a screenshot. NOT verified: the CI build and the installer (the release this merge will publish is the real test); the "See Project Page" button still links to the live site.
- Note: once, the test script's launch step left no app window running (the app started fine when launched directly); cause not found, harmless.
- Result after build: not yet tested.

### Session 7 — local Windows test setup + branch workflow (no app change)
- Requested: install what is needed to test the app on the user's Windows PC; make every later conversation (one tweak each) write its changes to GitHub AND use the local copy for testing, via instructions in `CLAUDE.md`. No worktrees (one tweak at a time).
- Files changed in the fork: `CLAUDE.md` (new sections "Workflow for every change" and "Local test setup", outdated build-trigger text fixed), `CHANGES.md` (this entry + three outdated build-trigger statements fixed). **No change to `app/`, `patches/`, `package.json` or the workflow.** Both edited files are `.md`, so merging them builds nothing.
- Found while checking: `main.yml` was already restricted to pushes to `main` and ignores `*.md`-only changes. `CLAUDE.md` / `CHANGES.md` wrongly said it ran on every push; corrected.
- Installed on the PC: `bun` 1.4.2 (via `npm i -g bun`), `gh` 2.102.0 (via winget). Already there: git 2.56, node 24.21.0 (CI uses 26), npm 11.19. Not installed: Playwright, Python. The user signed in to GitHub with `gh auth login --web` (git push works over that sign-in).
- **Test setup (outside the repo, NOT in git):** `C:\Users\elias\Documents\PenguinMod-test\` contains `package.json` (electron 44.5.1 + unzipper), `node_modules\`, `run-local-test.ps1`, `cdp.mjs`, `src\penguinmod.github.io\` (editor + four libraries, same clone/install steps as `main.yml`), `app-run\` (the repo's `app\` + the fresh editor build) and `userdata\` (own settings, separate from an installed app). `run-local-test.ps1` resets the cached editor with `git checkout -- .` + `git clean -fd`, applies `patches/stage-layout.js` from the repo, builds, copies, launches; flags `-Dev -Update -LaunchOnly -NoLaunch -Debug`. `cdp.mjs` talks to Electron's debug port 9333 (`node cdp.mjs shot out.png`, `node cdp.mjs eval "<js>"`) so Claude can screenshot and inspect the app without Playwright. *To recreate if the folder is lost:* make the folder, `npm i electron@44.5.1 unzipper` (if `node_modules\electron\dist\electron.exe` is missing afterwards, run `node node_modules\electron\install.js`; this npm needs `"allowScripts"` in `package.json` instead of a command-line flag), then re-create the script from the description above (clone the five repos as in `main.yml`, `bun i` in each, move the four libraries to `node_modules\scratch-*`).
- Verified how: ran `run-local-test.ps1` for real on Windows 11 (Node 24, bun 1.4.2): first-time setup completed, "Stage layout patch applied successfully", **production (minified) editor build finished in about 0.7 minutes** (21 MB; the new markers `pmdesktop:stageBoxWidth` and `pm-cat-colour` are in the bundle), started Electron 44.5.1 with the test app, and looked at a screenshot: editor loads, stage fixed at 481 px column, category menu = 10 equal colour boxes with names only (72.8 x 38.4 px, Motion = rgb(76, 151, 255)), one-row compact sprite panel with eye toggle, square corners, and the `⇪` / `⟳` symbols render on Windows. Branch push to GitHub worked and started no build (checked the Actions list). This also means the Sessions 3-6 patch sections now have a first check on Windows with a real GPU and a production build.
- NOT verified: the extension galleries (TurboWarp, PenguinMod, SharkPool) are not part of the local test app; the CI build itself with this setup; the updater (needs a packaged install + a newer release); running a real packaged `.exe`. The "Back to Home" button in the editor header is upstream's and points to the live site; not touched.
- Result after build: not applicable (docs only).

### Session 6 — category menu = equal colour boxes with only the name
- Requested: the block category menu (Pinned, Motion, Looks … and every extension) currently shows an icon + name. Replace it with just the name inside a box in the colour of that category's/extension's blocks; all boxes the same size, almost no gap between them; width = the longest extension name seen ("Pointerlock"), height = a two-line name ("Operators Expansion"). The user's reference mock-up had darker shades than the real block colours.
- Files changed in the fork: `patches/stage-layout.js` only (new section 11, header comment gets item 9). `main.yml` and `app/` unchanged.
- What changed and why:
  - **Structure found:** the menu is HTML built by the blocks library: `div.scratchCategoryMenu` > `div.scratchCategoryMenuRow` > `div.scratchCategoryMenuItem.scratchCategoryId-<id>` containing a round `scratchCategoryItemBubble` (colour inline) OR a `scratchCategoryItemIcon` (image, used by entries with an `iconURI`) + `scratchCategoryMenuItemLabel`. For icon entries the colour is NOT in the DOM.
  - **11a (JS hook, in `src/lib/blocks.js`):** wraps `ScratchBlocks.Toolbox.Category.prototype.createDom` to copy the category colour onto the entry as CSS variables `--pm-cat-colour` and `--pm-cat-text` (dark text `#111` on light colours such as yellow/orange/light blue, white otherwise). Also wraps `Toolbox.prototype.getWidth` to add `menuWidth - 60` px: the blocks library hard-codes "menu 60 px + flyout 250 px = toolbox width 310", so without this the wider menu covers the left edge of the block palette (seen and fixed during testing).
  - **11b (CSS appended to `src/components/blocks/blocks.css`):** menu width 4.8rem (box 72.8 px wide); boxes 2.4rem (38.4 px) tall, 2 px gap, 0.3rem side padding, left-aligned label 0.7rem / weight 600 / line-height 1.1, max 2 lines (longer names are cut), bubble + icon hidden; selected entry = inset 2 px frame in the text colour (the colour stays the block colour); hover = slightly brighter. No rounded corners (Session 4 rule still applies; the mock showed tiny rounding).
  - **Colours:** the real block colours (e.g. Motion #4C97FF), not the darker mock-up shades. A darker look would be a one-line change (e.g. `filter: brightness(.6)` on the box).
  - *To reverse:* delete section 11 from `patches/stage-layout.js` (the block starting with the comment "11. Block category menu"), and the line `*   9. The block category menu…` in the header if wanted.
- Verified how: patch applied to a fresh upstream clone (GUI `24faae9`), development webpack build with no errors, tested in headless Chromium (light and dark theme): all 12 entries 72.8 x 38.4 px, colours match each category, flyout starts right after the menu (x=78), no JS errors; injected two icon-type categories ("Pointerlock", "Operators Expansion") into the live toolbox: they get their own colours, icon hidden, "Pointerlock" = 60.9 px of text in 63 px (one line), "Operators Expansion" = two lines, a 36-character name is cut at 2 lines; selection frame shows in both themes. NOT verified: Windows fonts (if "Helvetica Neue"/Helvetica is missing the fallback is Arial, metric-compatible with what I tested, but Pointerlock could be a hair wider), the real "Pinned" entry (it comes from an addon; the same entry markup is assumed), real extensions with icons (simulated), the production (minified) build, the Electron app.
- Result after build: not yet tested.

### Session 5 — no scheduler, no home page (editor only), updater reworked to use my fork
- Requested: remove the scheduled build; remove the entire home page so the app is only an editor; (first "remove the updater", then changed to) make the updater update from MY fork "with every file that are or could be modified accounted for".
- Files changed in the fork: `.github/workflows/main.yml`, `app/electron-main.js`, `app/preload.js`, and NEW `app/updater.js`. `package.json` and `patches/stage-layout.js` unchanged (`unzipper` stays a dependency; the updater needs it).
- **Scheduler:** `schedule` / `cron` removed from `on:`.
- **Home page:** workflow no longer clones, caches, installs or builds PenguinMod-Home nor copies its `public` folder; app code lost `folders.home`, the `penguinmod.com` host mapping, the Startup (Home/Editor) settings menu + `get/set-startup-setting` IPC. Always loads the editor. Checked that neither the GUI nor Home source uses those IPC channels or `__electronUpdaterBridge`. `preload.js` no longer forces `penguinmod.com` links into the same window (they would replace the editor with the live site); editor links still stay in-window. Editor links to the PenguinMod website (profiles, credits avatars…) now load the live site (needs internet).
- **Updater, how it works now (`app/updater.js` + `runUpdateCheck` in `electron-main.js`):**
  - Menu **System → Check for Updates**. Asks the GitHub API for the fork's releases; picks the newest PUBLISHED release that has `win-unpacked.zip` fully uploaded (state "uploaded", download URL must start with `https://github.com/Wolowolf/PenguinMod-NEWdesktop/releases/download/`); in-progress and draft releases are skipped. Sorted by `published_at`.
  - **Up-to-date check:** CI step "Write build info" puts the release tag into `app/build-info.json`; the updater compares it with the newest release tag. If the file is missing (very old builds) it just offers the update.
  - **Install folder:** `dirname(process.execPath)`, checked to be `<dir>/resources/app/app` = where the code runs. (The OLD upstream updater looked for a parent folder called `win-unpacked`, which would have written files to the wrong place for the NSIS-installed app.) Not available when not packaged / not Windows.
  - **Every file accounted for:** replaced if different (size + CRC32; falls back to byte compare), added if new, left alone if same, **removed if it exists under `resources/app/` but not in the zip** (old editor chunks, old home page, old node_modules), and files outside `resources/app/` that are not in the zip are never deleted (the installer's `Uninstall … .exe`, any Electron files a future Electron drops). Zip paths with `..` or absolute paths are rejected. The zip must contain the exe, `resources/app/package.json`, `resources/app/app/electron-main.js` and `resources/app/app/build/editor.html`, else nothing is changed.
  - **Safe order:** (1) compare everything, (2) write all new files next to their targets as `<name>.new` (CRC-checked), nothing installed is touched yet, (3) swap: old → `.old`, `.new` → real name, stale → `.old`; any error rolls everything back to the exact previous state (and the message says so, or warns to reinstall if a file couldn't be restored). `.old` files are deleted right away; those still locked (running exe/dlls) are listed in `update-leftovers.json` in userData and deleted at the next start (`cleanupOldUpdateFiles`, which only deletes `*.old` inside the install folder). Empty folders left behind are removed.
  - **Download checks:** size must match the asset size; SHA-256 must match `asset.digest` when GitHub provides it. Install folder write test happens BEFORE the download (explains how to fix a "Program Files" install). Confirm dialog shows build tags and size, warns to save the project; success dialog shows counts; any error is shown in a dialog (the old code failed silently and could leave the progress overlay stuck; the overlay now always hides on `done`). The app restarts via `app.relaunch()`.
  - Removed from the old updater: the `manual-check-update` IPC and `__electronUpdaterBridge` (nothing used them), Linux handling (builds are Windows-only).
  - Not touched by updates: settings, projects, Electron storage (AppData). The first build containing this updater must be installed by hand once; older installs still check UPSTREAM.
- Verified how: Node tests of `updater.js`: on the fork's REAL `win-unpacked.zip` (227 MB, 2239 files) fresh install, repeat = 0 changes, simulated old install (edited/deleted/stale/old-home files, a fake uninstaller) updated to a byte-for-byte match with the zip, uninstaller kept, no `.old`/`.new` left; 11 synthetic tests passed (normal update, incomplete zip, path traversal, forced mid-swap failure rolled back to the identical state, forced write failure, leftover cleanup confined to the install folder, release picking incl. in-progress/draft/foreign-host, download size and checksum errors). Real Electron 44 on Linux: app starts with the new code, opens the editor even with an old `startupPage: home` setting, no updater bridge, penguinmod.com links not forced into the window; progress overlay shows, switches phase, and hides on `done` (real `preload.js`). Workflow = valid YAML, build-info JSON generated correctly in a shell simulation. NOT verified: the whole flow inside a real packaged Windows app (needs a real build + a newer release to update to), renaming a running exe on Windows (standard behaviour, relied upon), the real GitHub API response (rate-limited in the sandbox; `digest` field assumed optional), menu appearance.
- Result after build: not yet tested. To test the updater end to end: install the first build, make any small commit, wait for the new release, then System → Check for Updates.

### Session 4 — no rounded corners anywhere, one-row sprite panel
- Requested: (1) remove every rounded corner in the whole editor; (2) under the stage: boxes with no rounded corners, less top/bottom padding, each box sized to what is inside, on the same line when they fit; remove the "Sprite" text and make the name box rectangular like the others; remove the "Show" text and replace the two show/hide buttons with ONE eye toggle placed BEFORE the name box; replace the "Size" text with "⇪" and "Direction" with "⟳".
- Files changed in the fork: `patches/stage-layout.js` only (section 8 rewritten, section 10 new, header comment updated). `main.yml` and `app/` unchanged. Earlier versions of the patch are in the fork's git history (Session 3 version = the commit that follows "Update main.yml" on 2026-10-01) if anything here has to be undone.
- What changed and why:
  - **Section 10 (no rounded corners):** appended to `gui.css`: `:global(*), :global(*::before), :global(*::after) { border-radius: 0 !important }` plus the same for the three `::-webkit-scrollbar*` pseudo-elements. `!important` also beats inline styles. Because it is global it covers menus, modals, the paint editor, tabs, inputs, scrollbars, the stage border, sprite thumbnails, etc. Circular buttons (add sprite, delete sprite, palette category dots…) became squares too. **NOT affected:** block shapes in the code area (rounded reporters, hat blocks, round block inputs) — they are SVG paths drawn by the blocks library (`scratch-blocks`), not CSS. Changing them would mean patching that library; offered, not done. *To reverse:* delete section 10.
  - **Section 8 (sprite panel), rewritten:** (8a) x / y arrow icons removed as before; (8b) the whole two-row layout in `sprite-info.jsx` is replaced (anchored block replacement, fails with `PATCH FAILED` if upstream changes it) by ONE `.row` that wraps: `[eye toggle] [name] x [box] y [box] ⇪ [box] ⟳ [box]`; the eye is a single `div` (classes `radio eyeToggle`) that shows the eye icon when visible and the crossed-out eye when hidden, click / Enter / Space toggles, and it does nothing when the Stage is selected (disabled); (8c) `direction-picker.jsx` label text becomes `⟳`; the size label is `⇪` (U+21EA and U+27F3 — shown through the OS font fallback); (8d) CSS in `sprite-info.css`: all inputs inside the panel use `field-sizing: content` (box width follows its value; Chromium 123+, fine for Electron "latest"), height 1.5rem, padding 0 0.3rem, `border-radius: 0`; name box min 3rem / max 9rem with ellipsis; eye toggle 1.5rem square with a 1 px border; panel padding 0.25rem 0.4rem; row gap 0.25rem 0.5rem; size / direction symbols 0.875rem.
  - Measured sizes (default 480 box): box heights 24 px (were 36), widths 24 px for 1 digit, 28 px "100", 32 px "-240", 34 px "1000", name 48 px for "Sprite1" (144 px cap); the whole panel is ~33 px tall on one line (was ~100 px). At the smallest stage size (258 px column) it wraps into 2 rows.
- Verified how: full patch applied to a fresh upstream clone (GUI commit `24faae9`), development webpack build with no errors; in headless Chromium I walked every element and pseudo-element (`getComputedStyle(...).borderRadius`) in 7 states — main editor, File menu, Restore Points window, Settings menu, Costumes tab (paint editor), Sounds tab, Extension library — and found 0 elements with rounded corners; eye toggle flips `vm.editingTarget.visible` and its icon; direction dial popup still opens; panel is inert for the Stage; narrow and vertical-stage layouts have no overflow. Same checks repeated in REAL Electron 44 (Linux, software rendering): 0 rounded elements, one row, toggle works, vertical stage column 258. NOT verified: Windows, a real GPU, the production (minified) build, how the ⇪ / ⟳ glyphs look in Windows' fonts (they should come from Segoe UI Symbol).
- Result after build: not yet tested.

### Session 3 — compact sprite panel, hugging stage column, restore points, Windows-only builds
- Requested: (a) when the stage is small or vertical there was an awkward empty area next to it; the sprite settings (x, y, show, size, direction) should become square boxes with much less padding and no arrow icons next to x / y; (b) the app "tries to create a restore point infinitely"; (c) build ONLY `PenguinMod.Desktop.Setup.1.0.0.exe` and `win-unpacked.zip` from now on, and keep how to reverse that in this file.
- Files changed in the fork: `patches/stage-layout.js` (replaced by a longer version), `.github/workflows/main.yml` (Windows-only). Nothing in `app/` changed.
- **(a) Layout** — new sections in `patches/stage-layout.js`:
  - *Cause found:* the stage column is "as wide as the stage" but the sprite info panel could not shrink or wrap (it forced the column to ~477 px even for a 240 px stage). Also, my Session 2 fixed 4:3 box left side gaps around vertical stages.
  - *Sprite panel (section 8 — layout superseded in Session 4, see there):* arrow icons next to x / y removed (JSX regex edit in `sprite-info.jsx`); CSS appended to `sprite-info.css`: rows wrap, padding reduced, x / y / size / direction inputs are 2.25rem squares with 1 px padding and a small corner radius, sprite name box stretches to fill its row, Show buttons are 2.25rem squares, label gaps smaller. Only affects inputs inside `.sprite-info` (not other small inputs in the app).
  - *Hugging column:* `stage.jsx` now uses `minWidth = max(ceil(stage width), 242)` in the editor, so the column is exactly as wide as the stage, but never narrower than 242 px (the narrowest the sprite panel can wrap to; constant `MIN_STAGE_COLUMN_WIDTH` in `screen-utils.js`). Wide stages (4:3, 16:9, 4K…) fill the 480 px box width as before; tall stages are height-limited and the column narrows to fit them (e.g. 360x640 at default size: 205 px stage in a 258 px column, ~18 px gaps; the code area gets the freed space).
  - *Drag handle:* movement is divided by how much of the box the stage fills, so the handle follows the mouse on tall stages too (about 90% match; exact on wide stages).
  - *Known limit:* at the very smallest stage size (240 box) a vertical stage still has side gaps (~70 px) because the panel cannot go below ~242 px.
- **(b) Restore points** — NOT reproduced as a loop or hang. Findings: this is TurboWarp's restore point manager (`src/containers/tw-restore-point-manager.jsx`, `src/lib/tw-restore-point-api.js`). After a project is first changed it creates a restore point every 5 minutes (default `DEFAULT_INTERVAL`) for as long as the editor stays open, each time showing "Creating restore point…" for about 0.75 s; it does not stop after saving. In real Electron (Linux, software rendering) with a 3-4 s test interval each cycle completed normally at 480x360, 1920x1080, 3840x2160 and 360x640 with no errors. I could not find a hang. There is one code path that could hang forever (thumbnail step has no error handling), but I could not trigger it. **Change made (section 9 of the patch):** `DEFAULT_INTERVAL = -1`, i.e. automatic restore points are OFF by default. Manual creation still works, and the user can turn automatic ones back on in File → Restore points → "Restore points are created …" (verified in real Electron: dropdown shows "never" by default; choosing a shorter interval makes them run again). If the user still sees "Creating restore point…", ask: how long after opening, does the message ever disappear, and did they press Create in the Restore Points window.
  - *To reverse:* delete section 9 from `patches/stage-layout.js` (the block starting with the comment "9. Automatic restore points: off by default").
- **(c) Windows-only builds** — `.github/workflows/main.yml` changes (the user pastes the whole new file):
  1. Build step: `npx electron-builder --linux AppImage deb rpm --win nsis --publish never` → `npx electron-builder --win nsis --publish never`.
  2. Removed step "Zip linux-unpacked".
  3. "Capture artifact filenames" now only captures the `.exe` (`ls builds/*.deb` etc. would fail when no such files exist).
  4. Removed upload steps: ".deb", ".rpm", "AppImage", "linux-unpacked.zip". Kept: ".exe" and "win-unpacked.zip".
  - `package.json` was NOT changed: it still lists Linux targets and Windows archs x64 + ia32 + arm64 (one combined installer). Dropping ia32/arm64 would make builds faster still but changes what the installer supports; offered, not applied.
  - *Reverse recipe:* see the section "How to reverse Windows-only builds" at the bottom of this file.
- Verified how: patch applied to a fresh upstream clone (GUI commit `24faae9`), full webpack development build with no errors, then tested in headless Chromium and in REAL Electron 44 (see sandbox notes): column/stage sizes for 480x360, 1920x1080, 3840x2160, 360x640 and 240x180; sprite panel inputs 36x36 px, no x / y icons, no horizontal overflow; drag handle on wide and tall stages; restore point default and in-app toggle. The new workflow was only checked for valid YAML and by diffing against the original. NOT verified: the production (minified) build, Windows, a real GPU, the electron-builder run without Linux targets (the first fork build is the real test).
- Result after build: not yet tested.

### Session 2 — fixed-size editor stage + drag handle
- Requested: the editor stage took a different amount of space depending on the custom stage resolution (a big resolution could fill almost the whole window). Make it always the same size in the editor, remove the small/large stage buttons, and add a draggable area to make it bigger/smaller.
- Files changed in the fork: `patches/stage-layout.js` (new), `.github/workflows/main.yml` (one new step). Nothing in `app/` changed. (This `CHANGES.md` is NOT in the fork; it only lives in the Claude project files and is updated by re-uploading it there.)
- What changed and why:
  - The GUI source is not in this repo (CI downloads it), so the change is a **patch script** that CI runs on the downloaded GUI. It does exact find-and-replace edits and stops the build with `PATCH FAILED: ...` if upstream changed the lines it looks for (by design, so a broken build is never made silently).
  - **Fixed size:** in the editor the stage is scaled to fit a box 480 px wide and 4:3 (360 px high max), keeping its aspect ratio. 16:9 stages become 480x270, tall stages are height-limited and centered, tiny stages are scaled up. Player-only mode, embeds and fullscreen are unchanged. The editor is always treated as "large" now (no small / constrained modes).
  - **Buttons removed:** the small/large stage buttons in the stage header. Fullscreen button stays.
  - **Drag handle (my interpretation of "bottom left section" — the user did not confirm):** a full-height 8 px strip on the LEFT edge of the stage column (the gutter between code area and stage), with a small grip pill at its bottom. Drag left = bigger, drag right = smaller, double-click = reset to 480. Range 240 px to 1200 px, but never more than (window width - 560 px) so the code area keeps room. Size is remembered in `localStorage` key `pmdesktop:stageBoxWidth`. If the user actually meant something else (e.g. dragging the sprite panel height), this needs redoing.
  - GUI files touched by the patch: `src/lib/screen-utils.js`, `src/reducers/stage-size.js` (now also holds `boxWidth`), `src/containers/stage.jsx`, `src/components/stage/stage.jsx`, `src/components/stage-header/stage-header.jsx`, `src/components/gui/gui.jsx`, `src/components/gui/gui.css`; new `src/components/stage-resize-handle/` (jsx + css).
- Verified how: applied the patch to upstream GUI commit `24faae9` (all anchors matched, running it twice is safe), ran a full webpack **development** build (no errors), and tested in headless Chromium: stage column stayed 482 px wide for 1920x1080, 3840x2160 and 240x180; 360x640 was 205x362 and centered; dragging resized the stage and the block workspace followed; double-click reset; size survived a reload; a 1000 px wide window clamped the stage to 440. Not tested: the production (minified) build, the Electron app, or Windows — those need the fork's Actions run.
- Result after build: **worked** (user ran `win-unpacked.zip` from build `build-36791199265-20260930-232748` and confirmed the fixed-size stage works). They then reported the layout problems fixed in Session 3.

### Session 1 — setup and first build fix
- User forked the repo, enabled Actions, and ran the first build.
- **Workflow change 1 (`.github/workflows/main.yml`, step "Install TurboWarp deps"):** added `rm -f package-lock.json` after `cd TurboWarp-ExtensionsGallery` and before `bun i`.
  - *Why:* first build failed with `error: Integrity check failed for tarball: @turbowarp/types` (bun 1.4.2). TurboWarp's lockfile pins a checksum for a git-hosted package (`git+https://github.com/TurboWarp/types-tw.git#tw`) that no longer matches what GitHub serves.
  - *Verified:* reproduced the exact error locally and confirmed the install succeeds without the lockfile. The following `bun run build` couldn't be tested (sandbox blocks `cdn.jsdelivr.net`).
  - *Result:* after the edit the build completed and the user reached Releases (they saw the exe, AppImage, deb and rpm assets).
- No app code (`app/`) has been modified yet (as of Session 2 the GUI changes live in `patches/stage-layout.js` instead).

---

## Known issues and notes

- **Deprecation warning (harmless):** "Node.js 20 is deprecated… actions/cache@v3, actions/checkout@v4, actions/setup-node@v4, oven-sh/setup-bun@v1 forced to run on Node.js 24." Not an error. Can upgrade those action versions later.
- **Upstream builds stopped after 2026-09-06.** Possibly the same TurboWarp lockfile problem, but this is **unconfirmed**.
- **Unpinned Electron:** `electron` and `electron-builder` use `"latest"`, so a new upstream release can change behavior between builds. Consider pinning if builds become unstable.
- **Patch is tied to upstream text:** `patches/stage-layout.js` matches exact lines in the PenguinMod GUI. If upstream edits them, the build stops with `PATCH FAILED` and the script needs updating (paste the error into a new chat).
- **Updater (Session 5):** now installs releases of the fork (see Session 5). Each update downloads the whole ~230 MB zip. Installing into a protected folder (e.g. Program Files) makes updates fail with a clear message. Builds made before Session 5 still check upstream.
- **Category menu (Sessions 6 and 9):** the menu width is a fixed 4.5rem sized for "Pointerlock" in Helvetica/Arial; a wider name is cut with "…" (one line, or two lines for the selected box). The hook also changes the blocks library's toolbox width (see Session 6, 11a); if the palette ever overlaps or leaves a gap next to the menu, look there first.
- **Block shapes are still rounded** (SVG from `scratch-blocks`); only CSS corners were removed in Session 4.
- **Restore point loop not reproduced** (see Session 3). Automatic restore points are off by default now.
- **Commit order matters:** every push to `main` triggers a build (branches do not). Add NEW files (`patches/stage-layout.js`, `app/updater.js`) BEFORE editing the files that use them. Session 5 order: `app/updater.js` first, then `app/electron-main.js`, `app/preload.js`, and `main.yml` last. Only the last build counts; earlier ones create throwaway releases (and the updater would offer them, so delete stray releases).
- **Scheduled builds:** removed in Session 5.
- **First-build duration:** roughly 10+ minutes with empty caches; later runs should be faster.

## Ideas offered but not applied yet

1. ~~Windows-only workflow~~ — applied in Session 3.
2. Upgrade the deprecated GitHub Actions versions.
3. Pin `electron` / `electron-builder` versions.
4. Make builds even faster by dropping the ia32 and arm64 Windows targets in `package.json` (installer would then be x64 only).
5. ~~Make "Check for Updates" point at the user's own fork~~ — done in Session 5.
6. Stop editor links to the PenguinMod website from opening at all (or send them to the normal browser) — offered in Session 5, not applied.
7. Square off the block shapes in the code area too (needs a patch to the `scratch-blocks` library; riskier).

---

## Template for the next entry (copy, fill in, paste above under "Change log")

```
### Session N — <short title>
- Requested: <what the user asked for>
- Files changed: <paths>
- What changed and why: <plain summary>
- Verified how: <tested locally / only by reading code / needs a fork build to confirm>
- Result after build: <worked / failed with … / not yet tested>
```

---

## How to reverse Windows-only builds (Session 3, change c)

Ask Claude: "bring back the Linux builds". Claude should clone the fork, take the CURRENT `.github/workflows/main.yml`, and make exactly these four changes back (then give the user the complete file to paste). Original text from before Session 3:

1. Build step (`- name: Build Electron App`): replace the `run:` line (and delete the comment line above it) with
```
        run: npx electron-builder --linux AppImage deb rpm --win nsis --publish never
```
2. Put this step back right before `- name: Zip win-unpacked`:
```
      - name: Zip linux-unpacked
        run: zip -r builds/linux-unpacked.zip builds/linux-unpacked

```
3. Replace the whole `- name: Capture artifact filenames` step with:
```
      - name: Capture artifact filenames
        run: |
          DEB=$(ls builds/*.deb | head -1)
          RPM=$(ls builds/*.rpm | head -1)
          APPIMAGE=$(ls builds/*.AppImage | head -1)
          EXE=$(ls builds/*.exe | head -1)

          echo "DEB_PATH=$DEB" >> $GITHUB_ENV
          echo "DEB_NAME=$(basename "$DEB")" >> $GITHUB_ENV
          echo "RPM_PATH=$RPM" >> $GITHUB_ENV
          echo "RPM_NAME=$(basename "$RPM")" >> $GITHUB_ENV
          echo "APPIMAGE_PATH=$APPIMAGE" >> $GITHUB_ENV
          echo "APPIMAGE_NAME=$(basename "$APPIMAGE")" >> $GITHUB_ENV
          echo "EXE_PATH=$EXE" >> $GITHUB_ENV
          echo "EXE_NAME=$(basename "$EXE")" >> $GITHUB_ENV
```
4. Put these upload steps back after `- name: Capture artifact filenames` (the `.deb`, `.rpm` and AppImage ones go BEFORE `- name: Upload .exe release asset`; the linux zip one goes AFTER it and before `- name: Upload win-unpacked.zip`):
```
      - name: Upload .deb release asset
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ steps.create_release.outputs.upload_url }}
          asset_path: ${{ env.DEB_PATH }}
          asset_name: ${{ env.DEB_NAME }}
          asset_content_type: application/vnd.debian.binary-package

      - name: Upload .rpm release asset
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ steps.create_release.outputs.upload_url }}
          asset_path: ${{ env.RPM_PATH }}
          asset_name: ${{ env.RPM_NAME }}
          asset_content_type: application/x-rpm

      - name: Upload AppImage release asset
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ steps.create_release.outputs.upload_url }}
          asset_path: ${{ env.APPIMAGE_PATH }}
          asset_name: ${{ env.APPIMAGE_NAME }}
          asset_content_type: application/octet-stream

      # ... (existing "Upload .exe release asset" stays here) ...

      - name: Upload linux-unpacked.zip
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ steps.create_release.outputs.upload_url }}
          asset_path: builds/linux-unpacked.zip
          asset_name: linux-unpacked.zip
          asset_content_type: application/zip
```
After reversing, add a Session entry here and remove the "Windows-only" note from "Project facts".

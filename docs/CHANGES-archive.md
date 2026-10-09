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

### Session 46 — extension galleries inside the Extensions tab, check mark on used extensions (2026-10-08)
- Asked: show the PenguinMod, TurboWarp and SharkPool collections inside the Extensions tab instead of as a web page; a check mark at the top right of every extension used in the project.
- Changed: section 46 (GUI `d5cddb1`, PenguinMod gallery `bb349f8` + `d0a7112`; `app/electron-main.js`, `upstream.json`, docs): the Extensions tab reads the three offline galleries' lists and shows their extensions as normal tiles (72 PenguinMod, 104 TurboWarp, 66 SharkPool) with a filter per gallery; ones already listed only get the filter. The three tiles that opened the gallery pages and the empty "Collections" filter are gone (the gallery pages themselves are still in the app). Check mark = the extension is loaded in the current project. Read as: "used in a project" = loaded in the open project. The PenguinMod gallery had its list only inside its JavaScript, so its build now also writes it as JSON. The app now lets other pages read gallery files (`allowAnyReader`). Note: commit `d0a7112`'s title starts with an invisible byte-order mark (cosmetic, left as is). To reverse: `git revert` the merge (fork commits stay).
- Extension check: no engine, compiler or timing change; gallery extensions load through the same `loadExtensionURL` call the gallery pages used.
- Verified (test app, the three galleries built locally and copied in like CI): 294 tiles; filters show 72 / 104 / 66; all their pictures load (one SharkPool template entry was broken, now left out); clicking SharkPool's Camera tile loaded it and closed the tab; check marks on exactly the loaded extensions (Pen, Pen+, Clones+, Sharktilities, then Camera). · Not verified: a release copy.
- Result after build: assumed working

### Session 45 — folding for the expandable blocks and the Operators Expansion extension (2026-10-08)
- Asked: apply the compile-time folding to extensions that are easy to implement.
- Changed: section 45 (VM `f1173f7`: `src/compiler/jsgen.js`; `upstream.json`, docs): the section 44 folding now also covers `op.expandmath`, `op.expandBool`, `op.expandCompare` (PenguinMod's expandable math / and-or / compare blocks) and the Operators Expansion extension's 11 calculations (shifts, binary and/or/xor/not, if falsey/truthy, speed↔pitch, atan2): all pure, all with a compile hook already. The extension is not changed: its own compiled code is run and replaced by the answer. The expression can now reach only the sin/cos tables (not the project). Chosen as "easy": only extension blocks that are pure AND already compiled. Not done: every other VM extension compiles blocks that read or change state (jwArray arrays, jwLambda, jwScope, gsa_tempVars, gsa_canvas, jg_dev, jw_proto, pm_controlsExpansion), and gallery extensions (pm / tw / sp) compile nothing here or are impure; their non-compiled blocks (e.g. Operators Expansion's pi, prime check, ratios) run through the compatibility layer and would each need a vetted hook. To reverse: `git revert` the merge (fork commit stays).
- Extension check: no value changes; extension blocks are only folded when all their inputs are fixed; no other extension's block is folded.
- Verified: Node, 180,000 random calculation trees including the 3 expandable kinds and the 11 extension kinds (about 90% of them folded; the extension's real compile code taken from its file): 0 differences. Test app, folding on/off, 5 generated projects (21,640 answers each, with extension and expandable blocks present in the compiled code: 98–134 pieces of extension code unfolded, 33–44 after folding): 0 differences, generated code 25–26% shorter, no compile errors. · Not verified: speed of these blocks alone (same mechanism as section 44, not benchmarked again); a real project using the extension.
- Result after build: assumed working

### Session 44 — fixed-value calculations worked out at compile time (2026-10-08)
- Asked: make the compiler do work ahead of time: calculations with only fixed inputs (3 * 4) worked out once at compile time, loop work that gives the same answer every pass done once before the loop; only for blocks that change nothing else and always give the same answer; results identical; compiling not noticeably slower; show before/after numbers.
- Changed: section 44 (VM `2de13de`: `src/compiler/jsgen.js`, `jsexecute.js`; `upstream.json`, `docs/SECTIONS.md`, `docs/EXTENSION-RISKS.md`): a calculation (add … contains: 33 block kinds, list in `FOLDABLE_KINDS`) whose inputs are all fixed values is run once by the compiler with the scripts' own helper functions and replaced by its answer, keeping the type the code had. Not done: if the answer is NaN, infinity, -0, or if the code reads differently depending on what surrounds it (e.g. "not" of a text), and never with an extension's compile code for "op". Loop hoisting as a separate step was NOT written: the only loop work that is provably the same every pass without reading variables, lists, sprites, the timer, random or extensions is work on fixed values, which this already removes (at compile time, before the loop is even compiled); a custom-block argument can hold an object that changes inside the loop, so it doesn't count as fixed. To reverse: `git revert` the merge (fork commit stays). Applies to packaged games too (the packager's engine is built with this VM; checked in the built `scaffolding`).
- Extension check: no calculation changes value; extension blocks and anything reading variables/lists/timer/random/sprites are never folded; extensions' compile hooks get an equal-valued input of the same type for folded child calculations.
- Verified (test app + Node): Node, 500,000 random calculation trees (constants only / constants + one unknown input with 22 different values, read as unknown/number/text/true-false, optimised and normal mode): 0 differences (answers and types compared with Object.is), about 60% of trees changed, generated code about 45% shorter; an early version of this test found a real case (code that reads differently depending on its surroundings), now excluded. Real app, folding switched on/off in the same app (`runtime.pmNoConstantFolding`), 4 generated projects of 21,640–28,840 answers each from plain, "run without screen refresh", loop and condition scripts: 0 differences, generated code 24–27% shorter. Speed (ms per frame, before build vs after build, 5 runs): new project `9-fixed-values-loop` (sqrt/sin/cos/round/10^/join/length/letter of on fixed values inside a 1,000,000-round loop) 31.4 → 20.8 (-34%, real); `2-maths-loop` 28.75 → 28.80 and `5-custom-blocks` 26.35 → 26.48 (no change; they have almost no fixed-value calculations). Compile time of a whole project (all scripts, ~3,000 calculations, median of 21): 9.4 ms off → 10.3 ms on (+0.9 ms); small projects 0.2–0.5 ms either way. Tools in the local test folder: `bencholdold-diff.mjs`, `fold-e2e.mjs`, `fold-compile-app.mjs`, `fold-compile-time.mjs`. · Not verified: a real-world project (only generated ones and the benchmarks); a packaged game run (same engine code, not started); the sped-up case only matters when a project repeats fixed-value calculations many times (V8 may already fold the simplest ones such as 3 * 4).
- Result after build: assumed working

### Session 43 — Looks Expanded removed (2026-10-08)
- Asked: remove the Looks Expanded extension completely.
- Changed: section 43: GUI `desktop` (list entry + icon `looksExpanded.svg`), SharkPool gallery `1f08b11` (`Looks-Expanded.js`, its thumbnail, its `Extension-Keys.json` entry); `upstream.json`, `docs/SECTIONS.md`. Projects that use it no longer open ("Unknown extension"/not found). Extension check: nothing in the engine changed; Events Plus only has comments naming it. To reverse: `git revert` the merge and the fork commits.
- Verified: editor built in the test app, starts, no Looks Expanded left in the built editor except a comment in the renderer. · Not verified: the gallery page (test app has no galleries).
- Result after build: assumed working

### Session 42 — touching cache with SharkPool Camera (2026-10-08)
- Asked: make Camera's normal mode work with the cache (clear a drawable's entry when its matrix is recalculated, loosen the safety check for the functions Camera replaces) and rewrite precision mode to keep each sprite's un-cameraed box on the side instead of moving sprites back and forth; use a better way if there is one.
- Changed: section 42: Render `d3c5487` (clear in `_calculateTransform`, `_touchingVersion`, check list without the 4 update functions); Camera in the TurboWarp gallery `5cff6df` and the SharkPool gallery `8fb2a82` (new `desktop` branch; until now the untouched upstream `e168e25`): precision mode asks the renderer about hidden shadow drawables kept at the un-cameraed state (a box alone isn't enough: the pixel test needs the un-cameraed matrix too), updated only when their drawable changed. `upstream.json`, `docs/SECTIONS.md`, `docs/EXTENSION-RISKS.md`. Memory: one hidden drawable per sprite/clone that takes part in a precise check. To reverse: `git revert` the merge.
- Verified (test app; Camera's gallery code run with a stand-in `Scratch` object; the cache switched off for comparison with a pass-through wrapper the safety check notices): seeded sequence with camera moves, zoom, turns: cache on = cache off in normal mode, precision toggled and precision always on (18,638 answers each; cache used: ~5,500 table answers per run); precision always on with a moving camera vs a still camera: sprite-touching answers 10 of 12,255 differ (original Camera: 1,064), 0 without zoom (the 10 come from zoom drawing costumes bigger, which sharpens their shared outline; not fixed); still scenes: new = original precision. Plain sequences still identical to the uncached build (105,370 answers). Speed (ms per frame, Camera zoom 130%): 2,000 still clones normal 378 → 34.5 (cache), precision original 630 → rewritten 34.5; 1,000 moving clones normal 148 → 28, precision original 229 → rewritten 53. Without Camera no change (projects 1, 4, 6, 7 within 2%). TurboWarp gallery builds (`bun run build`); `clone-pinned.js` fetches both new commits. · Not verified: Camera loaded from the gallery inside the app (the test app has no galleries; same code, run directly); other camera blocks (bind to other cameras, several cameras).
- Result after build: assumed working

### Session 41 — project with SharkPool Camera loaded forever (2026-10-08)
- Asked: `C:PenguinmodDefault project.pmp` loads forever; fix it.
- Changed: section 41 (VM `ebb6780`; `upstream.json`, `docs/SECTIONS.md`): an empty `runtime.setInterpolation`. The project uses 26 extensions, among them SharkPool Camera, which calls it while loading; section 21 had removed it ("runtime.setInterpolation is not a function", the known bug from Session 40), so loading never finished. To reverse: `git revert` the merge (fork commit stays).
- Verified (test app, the project's 17 gallery extensions copied in from the forks at the pinned commits, since the test app has no galleries): before, `vm.loadProject` of the file never finished (stopped after 40 s, with that error); after, it loads in 0.3–0.4 s with all 26 extensions, the stage and its one sprite, no errors. · Not verified: opening it by double-click / from the command line (not possible in the test app; same VM load path); other gallery extensions (only the project's 17 were checked: no other calls to removed functions).
- Result after build: assumed working

### Session 40 — sensing cache vs extensions (2026-10-08)
- Asked: read the new `docs/EXTENSION-RISKS.md` and test whether section 39 broke something.
- Changed: section 40 (Render `ca43451`; `upstream.json`, `docs/SECTIONS.md`, a "Done" line in `docs/EXTENSION-RISKS.md`): the touching cache is not used while any Drawable method it relies on, or the renderer's touching helpers, has been replaced (`_touchingCacheUsable`, fixed property names so it costs nothing measurable per query); the touching table re-checks skins swapped without the setter. To reverse: `git revert` the merge.
- Verified: read the code of every extension the scan found touching these parts (all 3 galleries + built-in): SharkPool Camera writes drawable position/scale/direction directly in precision mode and Looks Expanded changes bounds through its own `getAABB`/`getBounds` (both not cleared by section 39); Camera Sensing Plus swaps skins directly; Lazy Collisions only wraps the sprite lookup; no extension changes clone lists or dragging directly. Ran both extensions' gallery code in the test app (stand-in `Scratch` object, no security setting changed) in a seeded sequence with camera moves/zoom/turns, precision on/off and warps: 311 of 18,757 answers differed between the uncached and section 39 builds, 0 with section 40; the 3 plain sequences (105,370 answers) still identical, with the cache active. Speed vs section 39: moving clones and 10 × 300 questions unchanged; 2,000 still clones 33 → 36.5 ms (still 283 before section 39; the price of the per-entry skin check). · Not verified: Camera Sensing Plus (needs a camera; reasoned); extensions not found by the scan.
- Result after build: assumed working

### Session 39 — sensing cache when many clones ask (2026-10-08)
- Asked: a per-frame cache for touching / distance / position lookups so many clones asking the same thing share the work; cleared by every change that can alter an answer; little extra memory, no slowdown with few clones; before/after measurement and proof the answers are identical.
- Changed: section 39 (VM `0d04d76`, Render `d45d558`; `upstream.json`, `docs/SECTIONS.md`): each candidate's touching bounds and CPU preparation are kept until it changes or the next frame; a list of 8+ candidates asked about again with nothing changed reuses its table; each sprite keeps its "not dragged" clone list; the sprite-name lookup no longer throws/catches an error per call. Ghost/colour/brightness don't clear the cache (they can't change a touching answer); "distance to" and "x position of" got faster only through the name lookup (their answers are simple sums, nothing worth caching). Extra memory: one rectangle and 4 numbers per sprite/clone, one ID list per sprite, one table per list (~100 KB for 2,000 clones; estimated, not measured). Local test folder: `bench\make-projects.mjs` got projects 6–8 (moving clones that ask, 10 clones × 300 questions, 2,000 clones asking distance / x position). To reverse: `git revert` the merge (fork commits stay).
- Verified (test app, window visible, 5 runs each): 2,000 still clones touching 283 → 33 ms per frame (3.5 → 30.5 FPS); 1,000 moving clones touching 117 → 26 ms; 10 clones × 300 questions 10.6 → 4.1 ms work; distance / x position 44 → 16 ms (now at 60 FPS); 5,000 moving clones without sensing 28.6 → 28.5 (no change). Same answers: a scripted sequence of moves, turns, sizes, costumes (SVG and bitmap), effects, show/hide, clones made/deleted, dragging, layers, pen lines, mouse moves and frames, with touching sprite/edge/mouse, touching colour, colour touching colour, distance, lookups and bounds after them: 3 seeds, 105,370 answers, identical between the uncached and cached builds (and between two uncached runs); the reuse paths were used (e.g. 6,963 table answers in one sequence). · Not verified: extension blocks (reasoned: they go through the same renderer methods and their changes clear the cache); other PCs.
- Result after build: assumed working

### Session 38 — benchmark projects and script (2026-10-08)
- Asked: benchmark projects (2,000 touching clones, maths loop, 100,000-item list search, thousands of moving clones, custom blocks + recursion) and a script that runs them in the test app, prints ms per frame and FPS, saves results and compares two runs; repeatable, nothing online, app unchanged.
- Changed: only the local test folder (outside the repo, no history): new `bench\make-projects.mjs` (writes the 5 `.sb3` from code, no random numbers, images inside), `bench\bench.mjs` (reloads the editor page before every run, loads the project through port 9333, 3 s warm-up, 8 s measured, 5 runs round-robin, ~15 min; FPS, frame ms, work ms, spread; `compare` = Welch test at 95% plus a 3% minimum). Each project ends its loop with "set ghost effect to 0" (asks for a redraw without pausing) so it runs exactly once per frame; "wait 0 seconds" took two frames when other scripts asked for redraws. Sized to run at ~30 ms per frame (below the 60 FPS cap), except 2,000 touching clones (~290 ms, the count asked for). Repo: this entry only. To reverse: delete the `bench` folder.
- Verified (test app, this PC): two full runs with an app restart between: all 5 projects "no real change" (differences 0.0–3.2%); spread between runs 0.2–1.7% (touching clones 5–6%, so it needs ≥ 7–9% to count); a copy of a result made 5% faster on maths was called real, the same on touching clones and +2% on list search were not; fib(28) = 317,811, clone counts 2,000 / 5,000, one loop lap per frame in every run. Without the page reload, touching clones jumped between 275 and 550 ms per run. · Not verified: other PCs (sizes may need raising if a project reaches 60 FPS); battery power (the script warns).
- Result after build: `.md`-only, builds nothing

### Session 37 — performance: strong graphics chip, full speed in the background (2026-10-07)
- Asked: 4 performance tweaks for the editor and packaged games, measured before/after, drop any without a measured change: strong GPU, full speed in the background, more JS memory, skip stage redraws when nothing changed.
- Changed: part 1: `app/electron-main.js` + packager section 37 `debaa54`: switch `force_high_performance_gpu` (`RenderWebGL.powerPreference` left at 'default': on Windows it does not change the chip). Part 2: `app/electron-main.js` (main window) + packager section 38 `1df90ca`: `backgroundThrottling: false`; VM section 38 `e803d5f` (`tw-frame-loop.js`): frame rate 0 keeps stepping when minimised; the three Chromium background switches changed nothing and were left out; `upstream.json`, `docs/SECTIONS.md`. Dropped: part 3 (`--max-old-space-size`: Electron 44 caps the JS heap at ~4 GB, which is already the default; 8192 kept the limit at 4,395,630,592 bytes, 1024 lowered it to 1,174,405,120, allocation died at ~3.9 GB with or without), part 4 (the renderer's existing `dirty` flag already skips redraws: 0 per 5 s for idle, a variable loop, "set x to 0" and a static bubble; one per step for moving, pen and changing bubble text). Games run Electron 44.6.0 like the editor since Session 34 (not 22.3.27). To reverse: `git revert` the merge (fork commits stay).
- Verified (local test app and a packaged Windows game started with a debug port; steps in 5 s, normal / covered / minimised): editor 60 FPS 313/7/7 → 308/307/307; editor frame rate 0 375/368/5 → 376/369/278; game 313/10/7 → 314/313/308; GPU: NVIDIA RTX 4060 before and after (this laptop's screen is driven by the NVIDIA chip), `--force_low_power_gpu` gave the AMD chip, so the switches work in Electron 44. · Not verified: part 1 changing anything (no measurable case on this PC; reasoned: helps laptops whose screen runs on the weak chip); minimised draws continue (`document.hidden` is now false), so the stage is still drawn while nothing is visible; the packager download in the test app showed no Save dialog (zip copied out through the debug port instead).
- Result after build: assumed working

### Session 36 — fewer tokens per session (2026-10-07)
- Asked: measure where the tokens go, then apply every saving Claude can make itself.
- Changed: measured the 22 earlier sessions (71% of the cost is sending the conversation again at every step; each session starts at ~60K tokens; 85% of steps used one tool; the 4 biggest sessions were 75% of all cost). Local test folder (outside the repo): `cdp.mjs` got `steps`, `wait`, area screenshots and one-line `eval` output; new `tweak.mjs` (`start`, `ship`, `fork`). Docs: `CLAUDE.md` slimmer (rare jobs moved to new `docs/PROCEDURES.md`, workflow uses `tweak.mjs`, more token rules), `CHANGES.md` slimmer (section details moved to new `docs/SECTIONS.md`, repeated pin details, the finished offline-plan idea and "installer not verified" removed, Session 33 archived). To reverse: `git revert` the merge; the two scripts are not in git.
- Verified: `cdp.mjs` in the test app (7 steps in one call; a failing step stops with exit code 1; single commands unchanged; a 300×200 area gave a 420×280 image instead of 1526×1048); `tweak.mjs` in a throwaway clone (`start` and its refusals, `ship`'s refusals, `fork`: commit as Wolowolf, push to a local fake fork, `upstream.json` changed in one line with its formatting kept); this PR was opened and merged with `tweak.mjs ship`. · Not verified: `fork` against a real fork on GitHub.
- Result after build: `.md`-only, builds nothing

### Session 35 — frame-time meter and profiler window (2026-10-07)
- Asked: an accessible on-screen frame-time meter and a profiler window (the engine's `runtime.profiler` existed, nothing showed it).
- Changed: section 36: GUI fork `345f118` (new `src/lib/pm-frame-stats.js`, `src/components/pm-profiler/` (meter, window, CSS), `icon--meter.svg`; edits in `reducers/modals.js`, `containers/gui.jsx`, `components/gui/gui.jsx`, `stage-wrapper`, `stage-header.jsx`, `menu-bar.jsx`), `upstream.json`. A gauge button in the stage header (remembered) shows a box in the stage's corner: ms per frame, FPS, step work time, last 40 steps as bars, and a word (Smooth / Busy / Slow) with a sign; screen readers hear the word only when it changes (at most every 10 s). Edit → Profiler (or the box's Profiler button) opens a window that switches the engine profiler on while it is open: sortable table of whole step / running scripts / drawing the stage / block counts, Pause, Reset. Block rows only exist for scripts the engine does not compile (checked: compiler off shows them). To reverse: `git revert` the merge (and the fork commit).
- Verified (local test app, dev and production build, real clicks and key presses): toggle on/off, text "16.0 ms · 63 FPS · work 0.6 ms · ✓ Smooth", forced 15 / 25 ms of extra work per step show Busy / Slow, Edit → Profiler and the box's button open the window, Tab order Pause → Reset → column buttons, Esc closes it, focus returns to the button and the profiler is off again (`runtime.profiler` null), Pause freezes the count, Reset clears it, sorting changes `aria-sort` and the row order, dark and light theme (screenshots), the box stays inside a 240 px stage; the local test ran without a warning. · Not verified: a real screen reader (NVDA / Narrator); right-to-left languages; other languages (new texts have English defaults only); how much the profiler slows a heavy project.
- Result after build: assumed working

### Session 34 — latest Electron for the app and for packaged games (2026-10-07)
- Asked: use the latest Electron for the editor and for the packaged game, if possible.
- Changed: `package.json` / `bun.lock` (app Electron 44.5.1 → 44.6.0, the newest stable); new `scripts/make-packager-electron.mjs`; release `packager-electron-2` (Electron 44.6.0 win32-x64, only `electron.exe` changed: the other 72 files are identical to the official zip, which was checked against its SHASUMS256.txt); `app/packager-electron.json` pins it; packager fork section 35 `f78d4f7` (`large-assets.js`), `upstream.json`; release `npm-snapshot-3` (new `bun.lock`), `npm-snapshot.json`. Cost: the zip is 161 MB (was 97 MB), so the installer and the one-time download grow by about 65 MB. Packaged programs now need Windows 10 or newer (Electron 22 was the last one for Windows 7/8). The other targets' entries for 22.3.27 in `large-assets.js` are unused leftovers (targets removed in section 27). To reverse: `git revert` the merge (the fork commit and the releases stay).
- Verified (local test app): it runs as Electron/44.6.0 (user agent); File → Package project with "Electron Windows application (64-bit)" made a 165.8 MB zip from the packager's new Electron download; its `project.exe` started, reports Electron/44.6.0 and shows the project's green-flag screen (screenshot); the local test ran without a warning. · Not verified: the updater delivering the new packager Electron (the pin version changed from 1 to 2); a packaged game playing a real project on another PC or Windows 10 vs 11; the exe's file properties still say "Electron" as the product name (as in the old zip).
- Result after build: assumed working

### Session 33 — editor tabs overlapped, vertical padding again (2026-10-07)
- Asked: the icon-only tabs almost overlap and one side seems to have no padding; half the vertical padding again.
- Changed: section 34 (list above): GUI fork `41c5771` (`gui.css`: tabs no longer overlap (`margin-left`/`-right` -0.5rem → 0); tab height follows the content (`height: auto`, was 80% / 90% of the bar) with padding `0.125rem 0.3125rem` (selected `0.2rem` top and bottom), `upstream.json`. Cause: the old overlap hid 8 px of each tab's left side while the horizontal padding was 5 px; the percentage heights meant the section-33 vertical padding change was barely visible. Gap between icon and tab edge, measured: top/bottom 6.5 px unselected, 9 px selected before → 3 px / 4 px now (about half); left/right 6 px on both sides. To reverse: `git revert` the merge (and the fork commit).
- Verified (local test app, real click): Code selected = tabs 64 / 33 / 33 / 33 px wide side by side (no overlap, screenshot), after clicking Costumes the Costumes tab shows its name and the others stay icons; the local test ran without a warning after `upstream.json` pointed at the pushed commit. · Not verified: the CI build; right-to-left languages.
- Result after build: assumed working

### Session 32 — editor tabs: icon only, name on the selected one (2026-10-07)
- Asked: the workspace tabs (Code, Costumes, Sounds, Variables, …) show only the icon when not open and the name when open; padding a quarter of the horizontal and half of the vertical. (There is no "Scenes" tab in this editor; "Files" exists but is switched off upstream.)
- Changed: section 33 (list above): GUI fork `e1c0773` (`gui.jsx`: each tab name wrapped in a span; `gui.css`: `.tab-label` visually hidden unless the tab is selected, icon margin removed on unselected tabs, tab padding `0.125rem 1.25rem 0` → `0.0625rem 0.3125rem 0`), `upstream.json`. The hidden name stays in the page for screen readers. Reading taken: "quarter of the horizontal padding" = 1.25rem → 0.3125rem, "half the vertical" = 0.125rem top → 0.0625rem (bottom was already 0). To reverse: `git revert` the merge (and the fork commit).
- Verified (local test app, real clicks): Code selected = "Code" + 3 icons (tab widths 64 / 33 / 33 / 33 px, padding 1px 5px 0); clicking Costumes, Sounds and Variables each shows only that tab's name (Variables tab 85 px wide) and the editor panel switches; after `upstream.json` pointed at the pushed commit the local test ran without a warning. · Not verified: the CI build; right-to-left languages; tooltips (none added, so an icon alone has no hover text).
- Result after build: assumed working

### Session 31 — "Open Extension" in the TurboWarp gallery was blocked (2026-10-07)
- Asked: clicking "Open Extension" in the TurboWarp extension gallery showed "Blocked: this app does not contact this server." (the extensions themselves are offline; the button linked to the online editor `turbowarp.org`, refused since Session 29). Fix it.
- Changed: section 32 (list above): TurboWarp gallery fork `5fd4420` (`development/homepage-template.ejs`: a click script sends the extension to `window.opener`, shows "Adding..." then "Added!" / "Could not add"; without an editor window it explains Copy URL + Custom Extension), GUI fork `4368612` (`TRUSTED_LOADEXT_ORIGINS` in `extension-library.jsx`), `upstream.json` for both. Not changed: the gallery's "Sample Project" links (still `turbowarp.org`, blocked). To reverse: `git revert` the merge (and the two fork commits).
- Verified (local test app, real clicks, after copying a gallery build into `app-run\app` because the test script doesn't build galleries): Add Extension → TurboWarp Extension Gallery opens the gallery from the app's folder with `window.opener` set; before the fix the click went to `turbowarp.org` and showed the blocked text (reproduced); after it the button says "Adding..." then "Added!" and returns to "Open Extension" after 3 s, the gallery window stays, and the editor has Box2D (`griffpatch`, category Physics) and, in a second run on a gallery built from a fresh download of the pinned commit, Clones Plus (`lmsclonesplus`). The page's script passes a syntax check (my first edit had a typo that this caught). · Not verified: the CI build; the no-editor message (a native alert); the Sample Project links; the gallery inside a packaged release.
- Result after build: assumed working

### Session 30 — offline packager (independence phase 5) (2026-10-07)
- Asked: Phase 5: fork PenguinMod-Packager (pinned `53f868b`), build it in CI with the VM fork, serve it at studio.penguinmod.com/PenguinMod-Packager, only HTML/zip and Windows targets, the Electron 22 Windows x64 zip in its own release the app downloads once like the offline library, then remove the packager exception; separate PRs.
- Decided (user: "do what's best for a completely independent app that can update itself"): fork `Wolowolf/PenguinMod-Packager` created (all branches, Actions off), branch `pinned` = `53f868b`; Windows target = Electron 64-bit only (the only one with an offline file); the editor's Render is used too (needed for its section 21 HQ pen; a git package must name a fork anyway).
- Part 5a changed: fork branch `desktop` (`c71bb88` git packages → forks + `bun.lock` from upstream's `pnpm-lock.yaml`, sections 26–27); `upstream.json` entry; `main.yml` builds it after the editor with the GUI's VM and Render copied in, into `app/PenguinMod-Packager`; `electron-main.js` serves it (folder → `index.html`, no-slash address redirected, missing → 404) and drops its exception; `npm-snapshot.yml` installs it too → release `npm-snapshot-2`, `npm-snapshot.json` points at it; outside the repo `run-local-test.ps1` builds it (`packager-build.log`), `cdp.mjs` takes `CDP_PAGE`. To reverse: `git revert` the merge (the fork can stay).
- Part 5a verified (local): build OK (Node 24, no extra flags, 19 MB); File → Package project (real clicks) opens the offline packager with the project imported; only the 4 targets listed; Plain HTML (11.63 MB, contains the VM fork's `pmCredit`), Zip (4.59 MB) and Electron Windows 64-bit (101 MB `project/project.exe`) packaged; that `.exe` unpacked and started: Stage + Sprite1 running, 60 FPS, 1920×1080, HQ pen on; a remembered "Windows 32-bit" target opens as Plain HTML; Chromium network log of the whole scenario (app closed normally): no request to any server (the Electron zip came from the packager's own cache, filled by the online packager in an earlier session); fresh `clone-pinned` of the fork + `bun i --frozen-lockfile` OK; the fork's push started no workflow. npm-snapshot-2 (run 37576711139, on the PR branch): all installs incl. the packager's 1,212 packages again from the snapshot alone with Bun's internet off. · Not verified: the CI build; the packaged `.exe` on another PC.
- Part 5a result after build: assumed working
- Part 5a CI: build #51 (`build-37577142341-…`, PR #42) passed, no warnings or annotations; npm snapshot 2 restored and "All packages came from the npm snapshot (4175 cache entries)"; its `win-unpacked.zip` differs from #50 only by the 40 new `PenguinMod-Packager` entries, `electron-main.js`, `build-info.json` and the PenguinMod gallery's build stamp (editor unchanged).
- Part 5b changed: release `packager-electron-1` (TurboWarp's `electron-v22.3.27-win32-x64.zip`, which equals Electron's official release `ad723ed7…` in 72 of 73 files; only `electron.exe` differs: TurboWarp's `electron-bin/generate-windows.js` changes its icon and version text); fork section 28 (`04b7970`, `upstream.json`); new `app/packager-electron.json`; `updater.js`: `installElectronFile()` / `electronNeeded()` / `electronPinFromZip()` (shared `pinFromZip()`, `replaceFolder()`; leftovers of both cleaned); `electron-main.js`: serves `/__packager-electron__/`, offers the download when the packager asks for a missing file and in "Check for Updates", installs it during an update when needed, `PACKAGER_URLS` exception removed; `package.json` `extraResources`; `main.yml` "Download packager Electron" + kept out of `win-unpacked.zip` (checked); outside the repo `run-local-test.ps1` downloads it into `packager-electron\`. To reverse: `git revert` the merge (the release can stay).
- Part 5b verified: 11 Node checks of the new updater functions (install, replace, failed install keeps the old one, unsafe names refused, leftovers, pins from an update zip, library install after the refactor); `bun.lock` still matches `package.json` (frozen install); local test app with the packager's stored copy deleted: Windows 64-bit packaged (101.13 MB) with Electron from `/__packager-electron__/`; copy of release #51 with the 5b app files and no Electron (= updated by an old updater): `packagerdata.turbowarp.org` → 403; File → Package project (real clicks) → Windows → the packager shows "status code 404" and the app offers "The packager's Electron is missing…" → Download → installed `resources/packager-electron` (SHA-256 OK, `version.json`, no leftovers) → "installed, click Package again" → packaged 101.13 MB; "Not now" installs nothing; network log of that run (app closed normally): only `github.com/Wolowolf/…/packager-electron-1/…` and its redirect to `release-assets.githubusercontent.com`. · Not verified: the CI build; the install during a real update (needs a published 5b release); the zip exclusion command (`zip` isn't installed here; the step after it fails the build if it didn't work).
- Part 5b result after build: assumed working
- Part 5b CI: build #52 (`build-37578556250-…`, PR #43) passed, no warnings; the Electron zip's SHA-256 checked in CI; its update zip has neither the Electron zip nor the library; differs from #51 only in the expected files. Update test: a copy of release #51 (old updater), System → Check for Updates → offered #52 → "Install update" → "25 file(s) replaced, 13 added, 12 removed" → restarted as #52.
- Part 5c asked: delete the temporary files; from now on assume builds work until told otherwise; in the packager remove the Discord, GitHub and donate links but not the documentation, remove cloud variables as a whole, remove the High quality pen switch.
- Part 5c changed: the 20 temporary test files/folders in `%TEMP%` deleted; fork sections 29 (`3ecaaf3` + `1bda441`, the TurboWarp Packager Extras GitHub link found while testing), 30 (`11162a4`), 31 (`f1d0025`), `upstream.json` → `1bda441`; CLAUDE.md: builds are assumed to work (no "not yet tested", no watching or checking them after a merge); CHANGES.md "Result after build" entries → "assumed working". Reading taken: "cloud variables as a whole" = the packager and the projects it makes (the editor has none since section 15); the privacy policy and the gamepad / pointer-lock credit links stay (not named). To reverse: `git revert` the merge (and the fork commits).
- Part 5c verified (local): build OK; packager opened by real clicks: sections Select Project, Runtime Options, Player Options, Input, Advanced Options, Environment (+ application settings), no Cloud Variables and no "cloud" text, no High quality pen; links for HTML and Windows targets: documentation (docs.turbowarp.org), privacy policy, gamepad / pointer-lock credits only; no intro "Report bugs" line; error window's "Report bug" link removed (code only, not shown); a project with a cloud variable packaged as HTML: no cloud code (WebSocketProvider, LocalStorageProvider, addCloudProvider, CloudManager, clouddata.) and no high-quality-pen call in it; that game run: `☁ score` kept its value 42, no cloud provider, high quality pen on.
- Part 5c result after build: assumed working

### Session 29 — independence from upstream, in phases (2026-10-06)
- Asked: builds and app independent of upstream (PenguinMod, TurboWarp, SharkPool, …): Offline plan steps 3–4, npm packages, packager; one phase per PR.
- Phase 0 (inventory, no change): besides the 12 projects, every build downloads 7 more GitHub repos (PenguinMod Audio, Storage, svg-renderer, render-fonts, Parser, MarkDown; TurboWarp types-tw); the GUI's `bun i` also downloads older VM/Blocks/Render/Paint (its lockfile) before they are swapped; Render's and TurboWarp's lockfiles are deleted, this repo has none; Bun, Node and actions unpinned (last build: Bun 1.4.2, Node 26.10.0); the app loads the hidden `penguinmod.com/embed/editor` iframe at every start and fetches any `studio.`/`extensions.` file it lacks from the real server (that is how the packager loads). Decided: forks on Wolowolf named after the `upstream.json` keys; Phase 4 removes Scratch's servers (Text to Speech, missing-asset fallback), Translate, jg_storage and ScratchAuth with their blocks; third parties stay.
- Part 1 changed: 12 forks `Wolowolf/<key>`, each with a branch `pinned` at the pinned commit; `upstream.json` "repo" URLs point at them (commits unchanged). To reverse: `git revert` the merge (the forks can stay).
- Part 1 verified (local): two fresh builds of the same code are identical (632 files, same SHA-256), so builds are comparable; build from the forks (`-Update`) byte-identical to the one from upstream; test app starts and loads the editor; `clone-pinned` of all 12 succeeds with git redirected away from the 7 upstream owners (and fails for the old URLs); each fork's `pinned` branch = its commit. CI build #44 (`build-37538055383-…`) passed, its log shows the downloads from the forks, and its editor files are byte-identical to the build before (#43, run 37508592037), so CI builds are reproducible too. New CI notice: `ubuntu-latest` moves to Ubuntu 26 from 2026-10-19 (phase 3 pins the runner).
- Part 1 result after build: assumed working
- Part 1b changed: the patch script's result is now commits on a new branch `desktop` of the GUI, VM and Render forks (one per section, `Section <n>: <title>`, the section's comment in the body; list above); `upstream.json` points at them; `patches/` deleted; the patch step removed from `main.yml` and (outside the repo) `run-local-test.ps1`, which now warns about uncommitted changes instead of resetting; `scripts/fetch-game-icons-meta.mjs` / `make-search-words.mjs` take `--gui <checkout>` and write into the GUI fork; CLAUDE.md: new tweak and upstream-merge workflow. To reverse: `git revert` the merge (the fork branches can stay).
- Part 1b verified (local): the old patch, run with CI's exact (LF) inputs on the pinned upstream commits, gives the same git trees as the three `desktop` commits; fresh download of them (`-Update`, new test script) builds identically except one JS chunk (+ 6 files naming it), caused only by line endings: the old local test copied the 17 section-16/20/21 files with CRLF (CI always LF), and with those switched to CRLF the build is byte-identical to the old one; test app starts (Stage + Sprite1, 60 FPS, 1920×1080, resize handle, colour boxes). Compare builds only with `.webpack` (build cache) deleted: a partly reused cache renames chunks. CI build #45 (`build-37543318776-…`) passed, downloaded the `desktop` commits, and its editor files are byte-identical to #44. · Not verified: full runs of the two generator scripts (need the internet and WordNet; only their argument checks were run).
- Part 1b result after build: assumed working
- Part 2 changed: 7 more forks (git-hosted npm packages, branch `pinned`); 6 `dep/<commit>` branches (old commits installed as dependencies, only `package.json` pointed at the forks); every `package.json` (GUI, VM, Render, Paint, TurboWarp gallery) names git packages as `github:Wolowolf/<repo>#<full commit>` at the commits the build already used; `bun.lock` committed in those forks, the PenguinMod gallery fork and this repo (`.gitignore` exception); TurboWarp fork also commits its 14 build downloads (`cached-extension-dependencies/`, kept byte-exact by `.gitattributes`); `upstream.json` → the new `desktop` commits; `main.yml`: every `bun i` is `--frozen-lockfile`, the two lockfile deletions removed, electron-builder installed from `bun.lock` in `$RUNNER_TEMP` instead of `npx`. To reverse: `git revert` the merge (fork branches can stay).
- Part 2 verified (local): each new lockfile against the old install: same package paths, same versions of all npm packages (GUI 1985, VM 1662, Render 1576, Paint 2045), git packages = forks at the same code; rehearsal of the new CI steps (empty Bun cache, `NODE_ENV=production`, git redirected away from upstream owners, `bun install --verbose` logs every GitHub download): all 7 installs succeed with `--frozen-lockfile` and download from GitHub only `Wolowolf/…`; TurboWarp build downloads nothing; editor build identical in all 632 files to the 1b build (one chunk name differs because the rehearsal ran in another folder); TurboWarp gallery byte-identical to #45 (LF checkout); packaged `node_modules` (16 packages, 158 files) byte-identical to #45; regular local test (`-Update` from the new commits, same folder as before) byte-identical to the 1b build in all 632 files, test app starts (Stage + Sprite1, 60 FPS, 1920×1080). CI build #46 (`build-37548918654-…`) passed; its log shows GitHub downloads only from `Wolowolf` (plus the Actions tools); the whole unpacked app (1716 files) equals #45 except `build-info.json` (release name) and the PenguinMod gallery, whose every difference comes from SvelteKit stamping the build time (`_app/version.json`, the `__sveltekit_…` name, chunk names, 11 minifier names in one chunk; all builds of it differ this way, also before). · Not verified: whether `chromedriver` (GUI) and `playwright-chromium` (Render) still download test browsers from Google/Microsoft during a fresh install (not seen in the log; the weekly package cache may hide it).
- Part 2 result after build: assumed working
- Part 3 changed: `main.yml` toolchain fixed at what the last builds used: `runs-on: ubuntu-24.04` (was `ubuntu-latest`, which moves to Ubuntu 26 from 2026-10-19), `bun-version: 1.4.2` (was newest), `node-version: 26.10.0` (was newest 26.x), the 4 actions pinned to commit SHAs with the version in a comment. To reverse: `git revert` the merge.
- Part 3 verified: workflow parses (23 steps); the pinned SHAs are the commits the tags `v7`/`v7`/`v6`/`v2` pointed to in builds #44–#46 (= `v7.0.1`, `v7.0.0`, `v6.1.0`, `v2.2.0`), and Bun 1.4.2 / Node 26.10.0 / ubuntu-24.04 are what those builds used (their logs). Only CI can run it (no local test possible). · Not verified: the CI build.
- Part 3 CI: build #47 (`build-37549755550-…`) passed on ubuntu-24.04 with Bun 1.4.2 / Node 26.10.0 and the pinned actions (log); whole app equal to #46 except `build-info.json` and the PenguinMod gallery's build stamp; the Ubuntu 26 notice is gone.
- Part 3 result after build: assumed working
- Part 4 changed: GUI fork sections 22–25, VM fork section 25 (list above; asked: remove Scratch servers, Text to Speech, Translate, jg_storage, Scratch Auth completely, plus anything about Scratch accounts/login); `upstream.json` → GUI `d06351f`, VM `f2d6e8e`; `app/electron-main.js`: `isUpstreamUrl()`, refused in the https handler and (http/ws/wss) by `setupUpstreamBlock()`. Kept on purpose: credits text about PenguinMod's Scratch login and links to Scratch profiles (credits only), the TTS language field in saved projects. To reverse: `git revert` the merge (and revert the fork commits).
- Part 4 verified (local): Chromium network log (`--log-net-log`) of a scenario (start, File → New, a project with a costume file missing, sprite/backdrop/sound libraries, extension list, the 3 galleries): release #47 contacted penguinmod.com (login iframe), assets.scratch.mit.edu (missing costume), Google Analytics; the same scenario on #47 with the Phase 4 editor + `electron-main.js` contacted no upstream server, only third parties (api.iconify.design; the SharkPool gallery page: jsDelivr, Google Fonts, api.github.com). In the app: the 4 extensions are not built in any more (pen/music are), penguinmod.com / projects. / trampoline. / assets.scratch.mit.edu answer 403, local editor and galleries 200, online packager 200. Found while testing: the local test app has no galleries, so before this it loaded them from the real websites. · Not verified: the CI build.
- Part 4 CI: build #48 (`build-37553730086-…`) passed; differs from #47 only in the editor, `electron-main.js`, `build-info.json` and the gallery stamp; the same network scenario on that release (copied to a short folder) contacted no upstream server (only api.iconify.design and the SharkPool page's jsDelivr, Google Fonts, api.github.com).
- Part 4 result after build: assumed working
- Phase 5 (offline packager): only a plan, not started (too big for this session; needs your decisions). The online packager (studio.penguinmod.com/PenguinMod-Packager, GitHub Pages, deployed with `pnpm up`, so its versions are whatever was newest on 2026-06-18) stays allowed in `electron-main.js` until then. Its Windows targets download Electron 22.3.27 (x64 92 MB, ia32 86 MB, arm64 89 MB) or NW.js 0.68.1 (114 / 107 MB) from TurboWarp's servers.
- Phase 6 (npm snapshot): OK given; see part 6. Phase 5: you chose option (a) (Electron zip as its own release), to be done in a new conversation.
- Part 4b asked: also refuse the SharkPool gallery's GitHub API request, skip the test-browser downloads, and the local test script with `--frozen-lockfile`.
- Part 4b changed: `isUpstreamUrl()` also refuses `api.github.com/repos|users/<PenguinMod, TurboWarp, SharkPool-SP>` (the updater's `repos/Wolowolf` is not affected); `main.yml`: env `CHROMEDRIVER_SKIP_DOWNLOAD=true`, `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`, and changes to `npm-snapshot.yml` (phase 6) start no build (Bun runs both tools' install scripts; a fresh install downloaded chromedriver.exe from Google); outside the repo, `run-local-test.ps1`: `bun i --frozen-lockfile` everywhere, the same two variables, no Render `package-lock.json` deletion, and the uncommitted-changes warning no longer ignores `bun.lock`. To reverse: `git revert` the merge.
- Part 4b verified (local): 11 sample addresses classified right; release #48 with the new `electron-main.js`: the SharkPool gallery's GitHub request gets 403 and the gallery still shows all its extensions (screenshot, 76 vs 77 elements); updated local test script: fresh `-Update` with `--frozen-lockfile` installed and built, no chromedriver.exe downloaded, all checkouts (incl. `bun.lock`) unchanged afterwards · Not verified: the CI build.
- Part 4b result after build: assumed working
- Part 6 changed (1/2): new manual workflow `.github/workflows/npm-snapshot.yml`: installs every package the build installs (galleries, GUI + 4 libraries, app packages, electron-builder; exactly the `bun.lock` files) into an empty Bun cache, packs it, installs everything again from that cache alone with Bun's internet sent to a dead proxy, then publishes release `npm-snapshot-<n>` (`.tar.gz` + `npm-snapshot.json` with size / SHA-256; no `win-unpacked.zip`, so the updater ignores it). Changing this workflow starts no app build.
- Part 6 verified (local, before the PR): the workflow's install script run on this PC: all installs into an empty cache (1.2 GB), then all again from that cache alone with Bun's internet off: 0 errors (also the exact text embedded in the workflow); an empty cache with internet off fails ("ConnectionRefused"), so the check is real. Note: changing Bun's registry address instead does not work as a test (Bun then looks for differently named cache entries).
- Part 6 CI (1/2): PR #39 started no app build; workflow run 37568251220 published `npm-snapshot-1` (259 MB, 3,941 cache entries, 1.3 GB unpacked) after installing all 8 projects again from it with Bun's internet off (same package counts).
- Part 6 changed (2/2): `npm-snapshot.json` (tag, asset, size, SHA-256, Bun version); `main.yml`: "Restore npm snapshot" (download, SHA-256 check, unpack as `BUN_INSTALL_CACHE_DIR`, warning if Bun's version differs) and, after all installs, "Check the npm snapshot covered every package" (warning if Bun's cache grew). To reverse: `git revert` the merge.
- Part 6 verified (2/2, before the PR): workflow parses (25 steps); the restore commands on this PC: download and SHA-256 check OK (unpacking needs Linux: the cache has symbolic links); unpacking and installing from it already passed on GitHub in run 37568251220. CI build #50 (`build-37568655799-…`) passed: snapshot restored (SHA-256 OK, 3,941 entries), "All packages came from the npm snapshot (3941 cache entries)", no warnings; app equal to #49 except `build-info.json` and the gallery stamp. Part 4b CI: build #49 (`build-37566426503-…`) passed, differs from #48 only in `electron-main.js` (+ the usual two), editor unchanged.
- Part 6 result after build: assumed working

### Session 28 — settings always on, FPS box, 1920×1080, no interpolation (2026-10-06)
- Asked: always on and not switchable: custom FPS as "FPS: [60]" with a note, high quality pen, infinite clones, remove fencing, remove misc limits, dangerous optimizations; on by default: disable off-screen rendering, warp timer; remove interpolation and its code; stage size without presets or note, default 1920×1080, chain link to keep the ratio.
- Changed: `patches/stage-layout.js` new section 21, new `patches/asset-libraries/pm-settings-parts.jsx` and `tw-settings-modal.jsx` (see section 21 above). Reading taken: "default 60 / 1920×1080" = for new projects; opened projects keep what they were made with. FPS box accepts 1–250; sizes 1–4096. Upstream blocks it replaces are checked by SHA-256. Note text grammar fixed ("Runs … times", "don’t use … in"). To reverse: `git revert` the merge.
- Verified (local test app): new project and File → New (real clicks) = 60 FPS, 1920×1080, the 5 options on; window as described; ratio link on (1920→1280 gave 720), off by real click (remembered), relinked; FPS 30 → note "30 times"; 0 ignored, 999 → 250; switching the always-on options or HQ pen off from code has no effect; save → config comment stored, reopened with the same FPS/size; project without stored settings → 30 FPS, 480×360; runs ~60 steps/s, sprite at x 5000 not fenced, 5000 clones allowed. · Not verified: the CI build, the replace-project confirmation (native dialog, not clickable here), light theme, the Runtime extension blocks.
- Result after build: assumed working
- Part 2 asked: no up/down arrows in the FPS and stage size boxes; no Gameplay, Optimizations and Screen Resolution separators; a line break after "60 times per second."
- Part 2 changed: section 21: the three headers are removed (Gameplay by its own find-and-replace, the other two from the new rows text); CSS hides the number boxes' spin buttons (typing and the arrow keys still work); `pm-settings-parts.jsx`: the FPS note is two messages with a line break between them. To reverse: `git revert` the merge.
- Part 2 verified (local test app): only the window title is left as a header; FPS box clicked (real click, mouse on its right edge), no arrows; screenshot: warning on its own line under "Runs scripts 60 times per second." · Not verified: the CI build.
- Part 2 result after build: assumed working
- Part 3 asked: without the arrows the boxes were too wide for their values.
- Part 3 changed: section 21 CSS: the FPS and stage size boxes size to their value (`field-sizing: content`, min. 2.25rem, centred, less padding). To reverse: `git revert` the merge.
- Part 3 verified (local test app): boxes 34 px ("60") and 37 px ("1920", "1080") instead of 80 px; screenshot looks right; typing "12345" widened the box, leaving it gave 250 and a narrower box. · Not verified: the CI build.
- Part 3 result after build: assumed working

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

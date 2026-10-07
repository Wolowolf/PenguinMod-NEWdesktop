# CLAUDE.md — PenguinMod Desktop (my fork)

Start of every session: read this file and `CHANGES.md` (short: current state + recent sessions). If the code differs from what `CHANGES.md` says, tell me what differs. `docs/CHANGES-archive.md` has the full history of Sessions 1–11; search it with Grep only when you need old detail.

- Fork: https://github.com/Wolowolf/PenguinMod-NEWdesktop · Upstream: https://github.com/FreshPenguin112/PenguinMod-Desktop
- Goal: a modified PenguinMod Desktop, changed one small tweak per conversation. **Windows only**: deliverables are `PenguinMod.Desktop.Setup.1.0.0.exe` (x64 installer) and `win-unpacked.zip`. Never bring back Linux or macOS builds. Language: English.

## Working with me
- I am a beginner with GitHub and the command line: plain language, one step at a time, explain each term the first time you use it.
- Always separate what you verified (ran, saw, measured) from what you did not (reasoned, could not run). Never write "this works" for something you could not run. The real tests are a build in this repo's Actions tab and the app on my PC.
- Small changes, only what I asked. If a request is ambiguous, pick the most likely reading and say which one.
- Ask before anything hard to undo: deleting releases or branches, force-pushing, rewriting history, changing repository or Actions settings.
- Never ask me to paste passwords, tokens or keys; use the existing GitHub sign-in.

## Workflow (one tweak per conversation, in this folder, no worktrees)
1. `git pull` on `main`.
2. Create a branch `tweak/<name>`. Never commit to `main` directly, except `.md`-only changes I ask for.
3. Make the change. Editor changes (GUI, VM, Render, …) are not made in this repo but as commits in my forks: see "Editor changes" below.
4. Test it locally (below) BEFORE pushing anything that can build.
5. Commit, push the branch (builds nothing) and open the pull request yourself with `gh pr create` (signed in as Wolowolf; if `gh` is not found use `C:\Program Files\GitHub CLI\gh.exe`). Don't ask me to click anything on GitHub.
6. Merge it yourself with `gh pr merge --merge` (standing permission since 2026-10-04) once the local test passed and the PR is mergeable. Never add `--delete-branch` (ask first). Don't merge if the test failed, if something I'd want to know about could not be verified, or if I said to wait; tell me why. Say that the merge started a build and a release my updater will offer (a `.md`-only PR builds nothing; say that instead). Watch it with `gh run list` / `gh run watch <id> --exit-status` and report the result honestly.
7. Add the `CHANGES.md` entry on the branch (same PR). "Result after build" stays "not yet tested" until I tried it.

Windows gotchas:
- PowerShell 5.1 drops double quotes inside arguments: write commit and PR texts to files in the scratchpad and use `git commit -F <file>` / `gh pr create --body-file <file>`. Never append `2>&1` to `gh pr …` (it is passed to `gh` as an argument).
- No global git identity: commit with `git -c user.name=Wolowolf -c user.email=98824418+Wolowolf@users.noreply.github.com commit …` and end the message with the Co-Authored-By line.

## Local test (my Windows PC)
Lives outside the repo in `C:\Users\elias\Documents\PenguinMod-test\`: Electron 44.5.1, cached editor source with `node_modules` (`src\`), test app (`app-run\`), own settings folder (`userdata\`, separate from my installed app), offline library (`offline-library\`, downloaded by the script from the release in `app/offline-library.json` when that version isn't there). If it is missing, say so and offer to recreate it (steps: archive, Session 7).
- Run `powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\elias\Documents\PenguinMod-test\run-local-test.ps1 [-Debug] [-Dev] [-Update] [-LaunchOnly] [-NoLaunch]`. It closes a running test app, checks that the cached editor and its 4 libraries (VM, Blocks, Render, Paint) are at the `upstream.json` commits, warns about uncommitted changes in them (they are built too), builds (output goes to `build.log`; only a summary, or the last 40 lines on failure, is printed), copies the repo's `app/` + the build into `app-run\` and starts the app (its console output goes to `app-out.log` / `app-err.log`; look there if it does not start). `-Debug` opens port 9333 and waits until the editor is loaded. `-Update` deletes the cached checkouts and downloads the forks again at the commits in `upstream.json` (needed after changing that file to commits the cache doesn't have; without it the script stops when the cache doesn't match). Push fork commits before using it. `-Dev` is a faster unminified build. The first run ever is slow.
- Drive the app: `node C:\Users\elias\Documents\PenguinMod-test\cdp.mjs <command>`: `ready`, `eval "<js>"`, `shot <file.png>`, `click x y`, `drag x1 y1 x2 y2 [holdMs]` (CSS pixels, not screenshot pixels: the screen scale is 1.4; `window.vm` and `ReduxStore` are available in `eval`). The editor creates its audio only after a real mouse click: switching to the Sounds tab from `eval` without one crashes the sound editor (test artifact, not a bug). Write a custom script only when these are not enough. Tell me what you launched and what you saw.
- Comparing builds (SHA-256 of every file in `src\penguinmod.github.io\build`): delete `src\penguinmod.github.io\.webpack` (webpack's cache) before each build; a partly reused cache renames chunks. CI builds of the same code are byte-identical (checked in Session 29); local ones differ from CI's.
- Not covered locally: the CI build (Linux + wine, freshly installed npm packages, installer), the updater ("Check for Updates" does not work in the test app; never report updater results from it), the offline extension galleries (the test app has none; their addresses answer 403 there since upstream servers are refused). For galleries or anything packaged, copy a release's `win-unpacked` to a short folder (e.g. `%TEMP%\pmrel`; the scratchpad path is too long for Windows' 260-character limit) and replace `resources\app\app` files with the ones to test.
- Which servers the app contacts: start Electron with `--log-net-log=<file>` and read the request URLs from that JSON (Session 29); upstream ones must not appear.
- Installed: git, node 24 (CI uses 26.10.0), npm, bun, gh. Not installed: Playwright, Python. Ask before installing anything big.

## Saving tokens
- Everything read stays in context for the rest of the session: read only what you need. To see one editor change, `git -C <checkout> show --stat <commit>` first (the commits are listed in `CHANGES.md`), then only the files you need. Grep the archive instead of reading it.
- Keep command output small: rely on the test script's summary, use `Select-Object -Last N` / `tail`, and `--json` / `--jq` with `gh`.
- Batch independent tool calls in one message, chain dependent shell steps in one command, and don't re-read a file you just edited.
- Keep `CHANGES.md` entries to the template's length, and keep at most 3 sessions in it (move the oldest to the archive).

## Project
A thin Electron wrapper around the PenguinMod **editor only** (no home page). The editor is not in this repo: CI downloads my forks of the PenguinMod GUI and its libraries at the commits in `upstream.json` (they include all editor changes), builds them, and packs them into the app with offline copies of the extension galleries and the offline asset library.

| Path | What it is |
| --- | --- |
| `app/electron-main.js` | Main process, menu (System → Check for Updates, Reload), maps URLs to offline folders |
| `app/preload.js` | Preload script |
| `app/updater.js` | Update engine (no Electron dependency); installs this fork's `win-unpacked.zip` |
| Forks `Wolowolf/<upstream.json key>` | My copies of the 12 upstream projects (e.g. `Wolowolf/penguinmod.github.io` = GUI, `Wolowolf/TurboWarp-ExtensionsGallery`). Branch `pinned` = the untouched upstream commit; branch `desktop` (GUI, VM, Render) = upstream plus all editor changes, one commit per section (listed in `CHANGES.md`) |
| Forks of git-hosted npm packages | `Wolowolf/PenguinMod-Audio`, `PenguinMod-Storage`, `penguinmod-svg-renderer`, `penguinmod-render-fonts`, `PenguinMod-Parser`, `PenguinMod-MarkDown`, `types-tw` (branch `pinned`). Branches `dep/<commit>` (in svg-renderer, Render, VM, Paint) = an old upstream commit that is installed as a dependency, with only its `package.json` pointed at the forks. Every `package.json` names git packages as `github:Wolowolf/<repo>#<full commit>` |
| GUI fork, section 16 files | The library windows (`src/components/pm-asset-browser/`: `pm-asset-browser.jsx`, icon studio `pm-icon-studio.jsx`, API-key panel `pm-api-key-panel.jsx`), their sources and helpers (`src/lib/pm-asset-sources.js`, `pm-credits.js` "credit" sprite, `pm-icon-svg.js`, `pm-api-keys.js` Pixabay/Europeana/Openverse keys, `pm-waveforms.js`, `pm-limits.js` request counter), game-icons tags `src/lib/pm-game-icons-meta.json` (from `scripts/fetch-game-icons-meta.mjs --gui <checkout>`), related search words `src/lib/pm-search-words.json` (from `scripts/make-search-words.mjs … --gui <checkout>`); section 20's `src/components/waveform/pm-sound-wave.jsx`; section 21's `src/components/tw-settings-modal/pm-settings-parts.jsx` |
| `app/offline-library.json` | Which offline library (Kenney, game-icons.net, sound generators) this app version needs |
| `library/kenney-packs.json`, `scripts/make-offline-library.mjs` | The Kenney pack list and the script that builds the offline library zip (run on a PC) |
| `.github/workflows/main.yml` | The CI build (Windows only) |
| `package.json` | Entry point and electron-builder settings (NSIS installer, `.pmp` association) |
| `upstream.json` | The fork and exact commit of each of the 12 projects (8 for CI and the local test, 4 for the offline-library script) |
| `npm-snapshot.json`, `.github/workflows/npm-snapshot.yml` | Which npm snapshot release the build restores as Bun's package cache, and the manual workflow that makes one |
| `scripts/clone-pinned.js` | Downloads one project from `upstream.json` (`node scripts/clone-pinned.js <name> [folder]`) |

Editor changes (commits in my forks; until Session 29 they were `patches/stage-layout.js`, see the archive):
- Make them in the local test's cached checkouts, which are clones of the forks: GUI `C:\Users\elias\Documents\PenguinMod-test\src\penguinmod.github.io`, VM / Render / Blocks / Paint in its `node_modules\scratch-vm`, `scratch-render`, `scratch-blocks`, `scratch-paint`. Test (uncommitted changes are built). Then commit on branch `desktop` (create it from `pinned` if that fork has none yet): one commit per change, message `Section <n>: <title>`, body = what it does + "To reverse: git revert this commit.". Push with `git -C <checkout> push https://github.com/Wolowolf/<name>.git HEAD:refs/heads/desktop`, put the new commit (and `"branch": "desktop"`) into `upstream.json`, run the local test again (no warning, no `-Update` needed), then the PR here. Only that PR builds; pushing to a fork builds nothing.
- Never push to a fork's `pinned` or upstream-named branches (`develop`, `master`, …) except when bringing in newer upstream code (below), and never force-push. Forks open pull requests on the original by default: always pass `--repo Wolowolf/<name>` to `gh`.
- npm packages: each project (and this repo) has a committed `bun.lock`, and CI installs with `bun i --frozen-lockfile`, which fails if `package.json` and `bun.lock` disagree. After changing dependencies run `bun install` in that project and commit both files; never delete `bun.lock`. A git package always points at a fork (`github:Wolowolf/<repo>#<full commit>`), never at an upstream repo or a branch name. Bun cannot redirect git packages named inside other packages, hence the `dep/<commit>` branches. Check a change with `bun install --verbose`: every `codeload.github.com/…` line must say `Wolowolf`.
- The checkouts are shallow (one commit deep): `git log` shows only recent commits; use the commit list in `CHANGES.md`.
- Block shapes in the code area are SVG drawn by `scratch-blocks`, not affected by CSS.
- Section 11 wraps two blocks-library methods; if the palette overlaps or leaves a gap next to the category menu, look there first.
- Section 16 added whole files to the GUI (see the table) and changed the VM's `src/serialization/sb3.js`; only allowed licences: never NC, ND, SA or GPL.

## Build and release
- `main.yml` runs on a push to `main` (ignoring `*.md`-only changes) and on manual start; other branches never build. Each run publishes a release `build-<run_id>-<timestamp>`, and my updater offers the newest one, so anything non-`.md` that reaches `main` reaches users. Non-`.md` changes go to `main` only through pull requests; always tell me when a merge started a build.
- Upstream code only changes when `upstream.json` changes. Moving to newer upstream is its own tweak: in a full clone of the fork outside this repo (`git clone -b desktop https://github.com/Wolowolf/<name>.git`; the test cache is too shallow to merge), `git fetch <original repo URL> <branch>` and `git merge FETCH_HEAD` (fix conflicts there; they replace the old `PATCH FAILED`), push `desktop`, move `pinned` forward to the merged upstream commit, put the new commit into `upstream.json`, local test with `-Update`, PR. Forks without a `desktop` branch only need `pinned` moved and the new commit in `upstream.json`.
- The offline library is its own release `offline-library-<n>` (not a build; the updater ignores it). To change it: run `scripts/make-offline-library.mjs` with a new `--version`, publish the zip with `gh release create offline-library-<n> <zip> --prerelease`, put the printed size/SHA-256 into `app/offline-library.json`, test, PR. Users then download it once more. Never delete a library release that a published app version still points to.
- npm snapshot: release `npm-snapshot-<n>` is Bun's package cache with every package the build installs (Linux only; it can't be unpacked on Windows). The build restores the one in `npm-snapshot.json` and warns ("came from the internet, not the npm snapshot") when packages are missing. After changing any `bun.lock` or Bun's version, make the next one: `gh workflow run npm-snapshot.yml --repo Wolowolf/PenguinMod-NEWdesktop --ref main -f number=<n>` (it checks itself offline, publishes the release and attaches its `npm-snapshot.json`), copy that file into the repo, PR. Changing `npm-snapshot.yml` starts no app build. Never delete a snapshot release that `main` still points to.
- Commit order: new files before the files that use them; the workflow file last.
- Expected: the unsigned installer triggers a SmartScreen warning ("More info" → "Run anyway"). `electron` / `electron-builder` are pinned in `package.json` and, with all their tools, in `bun.lock` (CI installs electron-builder from it outside the project), so a build only changes when we bump them (edit `package.json`, then `bun install` to update `bun.lock`). Releases are made with `gh release create` in `main.yml`. The runner image (`ubuntu-24.04`), Bun, Node and every action are fixed in `main.yml` (actions as commit SHAs with the version in a comment); updating one is its own tweak (take the SHA of the new release tag). Tell me if a new warning or annotation shows up in a build.
- Offer the open ideas listed in `CHANGES.md` when relevant; don't apply them unasked.

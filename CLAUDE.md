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
3. Make the change.
4. Test it locally (below) BEFORE pushing anything that can build.
5. Commit, push the branch (builds nothing) and open the pull request yourself with `gh pr create` (signed in as Wolowolf; if `gh` is not found use `C:\Program Files\GitHub CLI\gh.exe`). Don't ask me to click anything on GitHub.
6. Merge it yourself with `gh pr merge --merge` (standing permission since 2026-10-04) once the local test passed and the PR is mergeable. Never add `--delete-branch` (ask first). Don't merge if the test failed, if something I'd want to know about could not be verified, or if I said to wait; tell me why. Say that the merge started a build and a release my updater will offer (a `.md`-only PR builds nothing; say that instead). Watch it with `gh run list` / `gh run watch <id> --exit-status` and report the result honestly.
7. Add the `CHANGES.md` entry on the branch (same PR). "Result after build" stays "not yet tested" until I tried it.

Windows gotchas:
- PowerShell 5.1 drops double quotes inside arguments: write commit and PR texts to files in the scratchpad and use `git commit -F <file>` / `gh pr create --body-file <file>`. Never append `2>&1` to `gh pr …` (it is passed to `gh` as an argument).
- No global git identity: commit with `git -c user.name=Wolowolf -c user.email=98824418+Wolowolf@users.noreply.github.com commit …` and end the message with the Co-Authored-By line.

## Local test (my Windows PC)
Lives outside the repo in `C:\Users\elias\Documents\PenguinMod-test\`: Electron 44.5.1, cached editor source with `node_modules` (`src\`), test app (`app-run\`), own settings folder (`userdata\`, separate from my installed app), offline library (`offline-library\`, downloaded by the script from the release in `app/offline-library.json` when that version isn't there). If it is missing, say so and offer to recreate it (steps: archive, Session 7).
- Run `powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\elias\Documents\PenguinMod-test\run-local-test.ps1 [-Debug] [-Dev] [-Update] [-LaunchOnly] [-NoLaunch]`. It closes a running test app, resets the cached editor and its 4 libraries (VM, Blocks, Render, Paint) to pristine, applies `patches/stage-layout.js`, builds (output goes to `build.log`; only a summary, or the last 40 lines on failure, is printed), copies the repo's `app/` + the build into `app-run\` and starts the app (its console output goes to `app-out.log` / `app-err.log`; look there if it does not start). `-Debug` opens port 9333 and waits until the editor is loaded. `-Update` re-downloads upstream at the commits in `upstream.json` (needed after changing that file; without it the script stops when the cache doesn't match). `-Dev` is a faster unminified build. The first run ever is slow.
- Drive the app: `node C:\Users\elias\Documents\PenguinMod-test\cdp.mjs <command>`: `ready`, `eval "<js>"`, `shot <file.png>`, `click x y`, `drag x1 y1 x2 y2 [holdMs]` (CSS pixels, not screenshot pixels: the screen scale is 1.4; `window.vm` and `ReduxStore` are available in `eval`). The editor creates its audio only after a real mouse click: switching to the Sounds tab from `eval` without one crashes the sound editor (test artifact, not a bug). Write a custom script only when these are not enough. Tell me what you launched and what you saw.
- Not covered locally: the CI build (Linux + wine, freshly installed npm packages, installer), the updater ("Check for Updates" does not work in the test app; never report updater results from it), the offline extension galleries.
- Installed: git, node 24 (CI uses 26), npm, bun, gh. Not installed: Playwright, Python. Ask before installing anything big.

## Saving tokens
- Everything read stays in context for the rest of the session: read only what you need. `patches/stage-layout.js` is ~1000 lines; find a section with Grep `^/\* <n>\.` and read only that range. Grep the archive instead of reading it.
- Keep command output small: rely on the test script's summary, use `Select-Object -Last N` / `tail`, and `--json` / `--jq` with `gh`.
- Batch independent tool calls in one message, chain dependent shell steps in one command, and don't re-read a file you just edited.
- Keep `CHANGES.md` entries to the template's length, and keep at most 3 sessions in it (move the oldest to the archive).

## Project
A thin Electron wrapper around the PenguinMod **editor only** (no home page). The editor is not in this repo: CI downloads the PenguinMod GUI source, runs `patches/stage-layout.js` on it, builds it, and packs it into the app with offline copies of the extension galleries and the offline asset library.

| Path | What it is |
| --- | --- |
| `app/electron-main.js` | Main process, menu (System → Check for Updates, Reload), maps URLs to offline folders |
| `app/preload.js` | Preload script |
| `app/updater.js` | Update engine (no Electron dependency); installs this fork's `win-unpacked.zip` |
| `patches/stage-layout.js` | Almost all visible editor changes (sections 1–16, listed in `CHANGES.md`) |
| `patches/asset-libraries/` | Files section 16 copies into the editor: the library windows, their sources, the "credit" sprite, the icon studio (`pm-icon-studio.jsx`, drawing in `pm-icon-svg.js`), game-icons tags (`game-icons-meta.json`, from `scripts/fetch-game-icons-meta.mjs`), related words for the search (`search-words.json`, from `scripts/make-search-words.mjs`), libraries unlocked with the user's own API key (`pm-api-keys.js`, `pm-api-key-panel.jsx`: Pixabay, Europeana, Openverse), sound waveforms (`pm-waveforms.js`), request-limit counter (`pm-limits.js`) |
| `app/offline-library.json` | Which offline library (Kenney, game-icons.net, sound generators) this app version needs |
| `library/kenney-packs.json`, `scripts/make-offline-library.mjs` | The Kenney pack list and the script that builds the offline library zip (run on a PC) |
| `.github/workflows/main.yml` | The CI build (Windows only) |
| `package.json` | Entry point and electron-builder settings (NSIS installer, `.pmp` association) |
| `upstream.json` | The exact upstream commit of each of the 8 projects CI and the local test download |
| `scripts/clone-pinned.js` | Downloads one project from `upstream.json` (`node scripts/clone-pinned.js <name> [folder]`) |

Patch script rules:
- Exact find-and-replace edits on the GUI source, plus appended CSS. If upstream changed a line it looks for, it stops with `PATCH FAILED: …` on purpose: update the script to the new upstream text, never loosen the matching.
- Must be safe to run twice (marker check). Each section has a comment saying how to reverse it; keep that for new sections.
- Block shapes in the code area are SVG drawn by `scratch-blocks`, not affected by CSS.
- Section 11 wraps two blocks-library methods; if the palette overlaps or leaves a gap next to the category menu, look there first.
- Section 16 copies whole files from `patches/asset-libraries/` and also patches the VM (`node_modules/scratch-vm/src/serialization/sb3.js`, its own git checkout); only allowed licences: never NC, ND, SA or GPL.

## Build and release
- `main.yml` runs on a push to `main` (ignoring `*.md`-only changes) and on manual start; other branches never build. Each run publishes a release `build-<run_id>-<timestamp>`, and my updater offers the newest one, so anything non-`.md` that reaches `main` reaches users. Non-`.md` changes go to `main` only through pull requests; always tell me when a merge started a build.
- Upstream code only changes when `upstream.json` changes. Moving to newer upstream is its own tweak: new commits in `upstream.json`, local test with `-Update` (fix `PATCH FAILED` there), PR.
- The offline library is its own release `offline-library-<n>` (not a build; the updater ignores it). To change it: run `scripts/make-offline-library.mjs` with a new `--version`, publish the zip with `gh release create offline-library-<n> <zip> --prerelease`, put the printed size/SHA-256 into `app/offline-library.json`, test, PR. Users then download it once more. Never delete a library release that a published app version still points to.
- Commit order: new files before the files that use them; the workflow file last.
- Expected: the unsigned installer triggers a SmartScreen warning ("More info" → "Run anyway"). `electron` / `electron-builder` are pinned in `package.json` (and CI reads the builder version from there), so a build only changes when we bump them. Releases are made with `gh release create` in `main.yml`. The old "Node.js 20 is deprecated" annotation should be gone; tell me if a new warning shows up.
- Offer the open ideas listed in `CHANGES.md` when relevant; don't apply them unasked.

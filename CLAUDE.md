# CLAUDE.md — PenguinMod Desktop (my fork)

Read this file first, then read `CHANGES.md` (the full history of earlier work, newest first). Before changing anything, check that the code still matches what `CHANGES.md` describes. If it does not, tell me what differs.

- **This repo (my fork):** https://github.com/Wolowolf/PenguinMod-NEWdesktop
- **Upstream:** https://github.com/FreshPenguin112/PenguinMod-Desktop
- **Goal:** a modified, Windows-ready PenguinMod Desktop app, changed a bit at a time over many sessions.
- **Only Windows matters.** The deliverable is the Windows x64 installer (`PenguinMod.Desktop.Setup.1.0.0.exe`) and `win-unpacked.zip`. Do not bring back Linux or macOS builds.
- **Language:** English.

## How to work with me

- I am a beginner with GitHub and the command line. Explain things in plain language, one step at a time. Say what a term means the first time you use it.
- Tell me what you actually verified (ran it, saw it, measured it) and what you did NOT verify (reasoned about it, could not run it). Never write "this works" for something you could not run. The real test is a build in this repo's Actions tab, and ideally the app on my Windows PC.
- Keep changes small and focused on what I asked. If a request is ambiguous, answer the most likely reading and say which one you chose, instead of asking many questions.
- Ask before anything hard to undo: deleting releases or branches, force-pushing, rewriting history, changing repository or Actions settings.
- Never ask me to paste passwords, tokens or keys into a chat. Use the GitHub connection that is already set up.
- After every session, add an entry to the top of the change log in `CHANGES.md` (use the template at the bottom of that file): what was requested, which files changed, what and why, how it was verified, result after build.

## Workflow for every change (one tweak per conversation)

I change one thing at a time, in one conversation, in this folder (no worktrees). Follow these steps:

1. `git pull` on `main`. Read this file and `CHANGES.md`.
2. Create a branch named after the tweak, for example `tweak/darker-menu`. Never commit to `main` directly, except for `.md`-only changes I ask for.
3. Make the change. Keep it small.
4. **Test it locally on this PC** with the script described in "Local test setup" below. This catches `PATCH FAILED` before anything is published, lets you see and screenshot the result, and tests on real Windows. Do this BEFORE pushing anything that can build.
5. Commit and push the **branch** (this builds and releases nothing). Then open the pull request yourself with `gh pr create` (gh is installed and I am signed in as Wolowolf; if `gh` is not found, use `C:\Program Files\GitHub CLI\gh.exe`). Do not ask me to click anything on GitHub. Explain in plain language what a pull request is the first time.
6. Merge into `main` yourself with `gh pr merge --merge` (do NOT add `--delete-branch`; ask me before deleting any branch), but **only after I say so** for that tweak. Say clearly that the merge starts a build and publishes a release my updater will offer. (A pull request that changes only `.md` files builds nothing, so say that instead.) Then watch the build with `gh run list` / `gh run view` and report the result honestly.
   - Windows PowerShell 5.1 drops double quotes inside text passed to `git commit -m` or `gh pr create --body`. Write the commit message to a file and use `git commit -F <file>`, and the PR text to a file and use `gh pr create --body-file <file>` (put the files in the scratchpad folder, not the repo). Do not chain `2>&1` after a `gh pr ...` command: it gets passed to `gh` as an extra argument.
   - Git identity is not configured globally on this PC. Commit with `git -c user.name=Wolowolf -c user.email=98824418+Wolowolf@users.noreply.github.com commit ...` (the same author as the existing commits) and end the message with the Co-Authored-By line.
7. Add the `CHANGES.md` entry (on the branch, so it is part of the same pull request). Fill "Result after build" later once I have tried the build.

## Local test setup (on my Windows PC)

The test setup lives OUTSIDE the repo in `C:\Users\elias\Documents\PenguinMod-test\` so it survives between sessions and never ends up in git. It holds Electron 44.5.1, a cached copy of the PenguinMod editor source (with `node_modules`), a test app folder, and its own settings folder (`userdata\`, separate from my installed app). If that folder is missing, say so and offer to recreate it (steps are in `CHANGES.md`, Session 7).

- Run `powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\elias\Documents\PenguinMod-test\run-local-test.ps1`. It resets the cached editor to pristine, applies this repo's `patches/stage-layout.js`, builds the editor, copies the repo's `app/` plus the build into `app-run\`, and starts the app.
- Flags: `-Dev` (faster unminified build), `-Update` (delete the cache and download the latest upstream again, like a fresh CI run; use it when `PATCH FAILED` might be an upstream change or once in a while), `-LaunchOnly`, `-NoLaunch`, `-Debug` (opens Electron's debug port 9333 so Claude can drive the app).
- The first run downloads and installs a lot (the editor and four libraries) and is slow. Later runs only re-patch and rebuild.
- Tools installed on this PC: git, node (v24; CI uses 26), npm, bun, gh. Not installed: Playwright, Python.
- **What this does NOT replace:** the real CI build (it downloads fresh upstream, builds on Linux with wine, packs the installer) and the updater, which needs a real newer release. The extension galleries (TurboWarp, PenguinMod, SharkPool) are not part of the local test app, so offline extensions are not tested locally.
- Because the local test app is not a packaged install, "Check for Updates" does not work there. Do not report updater results from it.

## What the project is

A thin Electron wrapper (a few hundred lines in `app/`) around the PenguinMod **editor only** (there is no home page). The editor itself is NOT stored in this repo: CI downloads the PenguinMod GUI source, applies `patches/stage-layout.js` to it, builds it, and packs it into the app together with offline copies of the extension galleries.

| Path | What it is |
| --- | --- |
| `app/electron-main.js` | Electron main process, menu (System → Check for Updates, Reload), URL mapping to offline folders |
| `app/preload.js` | Preload script |
| `app/updater.js` | Update engine (no Electron dependency); updates from THIS fork's releases using `win-unpacked.zip` |
| `patches/stage-layout.js` | Node script that CI runs on the downloaded GUI source. This is where almost all visible editor changes live (sections 1 to 12) |
| `.github/workflows/main.yml` | The CI build (Windows only) |
| `package.json` | Entry point and electron-builder settings (NSIS installer, `.pmp` file association) |

## The patch script (`patches/stage-layout.js`)

- It makes exact find-and-replace edits on the PenguinMod GUI source and appends CSS. If upstream changed a line it looks for, the script stops with `PATCH FAILED: …` on purpose. Do not loosen the matching to hide that. Instead, update the script to the new upstream text.
- It must be safe to run twice (it checks a marker and exits if already applied).
- Each numbered section has a comment saying how to reverse it. Keep that habit for new sections.
- Block shapes in the code area are SVG drawn by the `scratch-blocks` library and are NOT affected by CSS. The rounded-corner removal only covers CSS.
- The category menu changes (section 11) also wrap two methods of the blocks library at runtime. If the block palette ever overlaps or leaves a gap next to the menu, look there first.

## Build and release rules (important)

- `main.yml` runs on a push to **`main`** (ignoring changes that only touch `*.md` files) and on manual start. Pushes to other branches never build or release. Every run builds the app and publishes a GitHub Release tagged `build-<run_id>-<timestamp>`. My updater offers the newest release, so **anything pushed to `main` (other than `.md` files) reaches users of the app**. Tell me before any push to `main` that will start a build.
- Commit order matters: add NEW files before editing the files that use them (for example `app/updater.js` before `app/electron-main.js`; the workflow file last).
- The Windows installer is unsigned, so Windows SmartScreen warns ("More info" → "Run anyway"). That is expected.
- `electron` and `electron-builder` are unpinned (`"latest"`), so a build can change behaviour without any change from us. Pinning them is a known, not-yet-applied idea.
- Known harmless warning: GitHub's "Node.js 20 is deprecated" notice about old action versions.

## Testing recipes (what has worked before)

These come from earlier sessions in a Linux sandbox with 1 CPU and about 4 GB RAM. The sandbox you run in now may differ, so check first.

- **Patch plus web editor test (best quick check):** clone `PenguinMod/penguinmod.github.io` and the four repos `PenguinMod-Vm`, `PenguinMod-Blocks` (branch `develop-builds`), `PenguinMod-Render`, `PenguinMod-Paint`. Run `bun i --ignore-scripts` in each (in Render, delete `package-lock.json` first). Move the four into `node_modules` as `scratch-vm`, `scratch-blocks`, `scratch-render`, `scratch-paint`. Apply the patch with `node patches/stage-layout.js <gui-folder>`. Build with `NODE_ENV=development` and `NODE_OPTIONS="--openssl-legacy-provider --max-old-space-size=2800"` using `bun run build`. The production build was killed at the Terser minify step in that sandbox, so use development mode there. Serve `build/` and drive it with Playwright (Chromium). This tests the web editor only, not Electron and not Windows.
- **Real Electron on Linux:** possible with `npm i electron`, `xvfb-run`, and Playwright `connect_over_cdp`. Do not use `--disable-gpu` (the editor then reports "Browser is not supported"). Details are in `CHANGES.md` (Session 3 notes).
- **Updater:** `app/updater.js` has no Electron dependency, so test it in plain Node against zips (including the real `win-unpacked.zip` from a release).
- Some hosts (for example `cdn.jsdelivr.net`) were blocked in the old sandbox, so the extension-gallery steps of the full build could not be run there.
- **On my Windows PC:** use the local test setup above, and tell me exactly what you launched and what you saw. Ask before installing anything big.

## Things still unverified (be honest about these)

- The whole updater flow inside a real packaged Windows app.
- Anything that depends on Windows fonts or a real GPU (for example how the `⇪` and `⟳` symbols in the sprite panel look).
- The CI build with the local test setup (the local production build and app were checked on Windows in Session 7; the packaged installer was not).
- The first builds containing Sessions 5 and 6 have not been confirmed by me. Check the "Result after build" lines in `CHANGES.md`.

## Ideas offered but not applied yet

Upgrade the deprecated GitHub Actions versions; pin `electron` / `electron-builder`; drop the ia32 and arm64 Windows targets for faster builds; stop editor links to the PenguinMod website from opening in the app; square off block shapes (needs a patch to the `scratch-blocks` library, riskier). Offer these when relevant, do not apply them unasked.

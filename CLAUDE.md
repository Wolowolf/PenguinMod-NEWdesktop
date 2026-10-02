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

## What the project is

A thin Electron wrapper (a few hundred lines in `app/`) around the PenguinMod **editor only** (there is no home page). The editor itself is NOT stored in this repo: CI downloads the PenguinMod GUI source, applies `patches/stage-layout.js` to it, builds it, and packs it into the app together with offline copies of the extension galleries.

| Path | What it is |
| --- | --- |
| `app/electron-main.js` | Electron main process, menu (System → Check for Updates, Reload), URL mapping to offline folders |
| `app/preload.js` | Preload script |
| `app/updater.js` | Update engine (no Electron dependency); updates from THIS fork's releases using `win-unpacked.zip` |
| `patches/stage-layout.js` | Node script that CI runs on the downloaded GUI source. This is where almost all visible editor changes live (sections 1 to 11) |
| `.github/workflows/main.yml` | The CI build (Windows only) |
| `package.json` | Entry point and electron-builder settings (NSIS installer, `.pmp` file association) |

## The patch script (`patches/stage-layout.js`)

- It makes exact find-and-replace edits on the PenguinMod GUI source and appends CSS. If upstream changed a line it looks for, the script stops with `PATCH FAILED: …` on purpose. Do not loosen the matching to hide that. Instead, update the script to the new upstream text.
- It must be safe to run twice (it checks a marker and exits if already applied).
- Each numbered section has a comment saying how to reverse it. Keep that habit for new sections.
- Block shapes in the code area are SVG drawn by the `scratch-blocks` library and are NOT affected by CSS. The rounded-corner removal only covers CSS.
- The category menu changes (section 11) also wrap two methods of the blocks library at runtime. If the block palette ever overlaps or leaves a gap next to the menu, look there first.

## Build and release rules (important)

- `main.yml` currently runs on **every push to any branch** (`on: push:` with no filter) and on manual start. Every run builds the app and publishes a GitHub Release tagged `build-<run_id>-<timestamp>`. My updater offers the newest release, so stray releases reach users of the app.
  - Preferred fix (not done yet, check `CHANGES.md`): restrict `push:` to the main branch, so work on other branches never builds or releases.
  - Until then, avoid pushing throwaway commits, and tell me when a branch push will start a build and release.
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
- **If you are running on my Windows PC:** prefer testing the real packaged app there, and tell me exactly what you launched and what you saw. Ask before installing anything big.

## Things still unverified (be honest about these)

- The whole updater flow inside a real packaged Windows app.
- Anything that depends on Windows fonts or a real GPU (for example how the `⇪` and `⟳` symbols in the sprite panel look).
- The production (minified) build of the editor patches.
- The first builds containing Sessions 5 and 6 have not been confirmed by me. Check the "Result after build" lines in `CHANGES.md`.

## Ideas offered but not applied yet

Upgrade the deprecated GitHub Actions versions; pin `electron` / `electron-builder`; drop the ia32 and arm64 Windows targets for faster builds; stop editor links to the PenguinMod website from opening in the app; square off block shapes (needs a patch to the `scratch-blocks` library, riskier). Offer these when relevant, do not apply them unasked.

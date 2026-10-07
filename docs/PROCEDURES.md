# Procedures — rare jobs

Not read by default: CLAUDE.md points here; Grep for the heading you need and read only that part. The rules in CLAUDE.md (never delete releases still pointed to, ask before anything hard to undo, …) apply to all of them.

## Moving to newer upstream code
Upstream code only changes when `upstream.json` changes. Moving to newer upstream is its own tweak: in a full clone of the fork outside this repo (`git clone -b desktop https://github.com/Wolowolf/<name>.git`; the test cache is too shallow to merge), `git fetch <original repo URL> <branch>` and `git merge FETCH_HEAD` (fix conflicts there; they replace the old `PATCH FAILED`), push `desktop`, move `pinned` forward to the merged upstream commit, put the new commit into `upstream.json`, local test with `-Update`, PR. Forks without a `desktop` branch only need `pinned` moved and the new commit in `upstream.json`.

## Offline library
The offline library is its own release `offline-library-<n>` (not a build; the updater ignores it). To change it: run `scripts/make-offline-library.mjs` with a new `--version`, publish the zip with `gh release create offline-library-<n> <zip> --prerelease`, put the printed size/SHA-256 into `app/offline-library.json`, test, PR. Users then download it once more. Never delete a library release that a published app version still points to.

## Packager's Electron zip
The packager's Electron zip (Windows 64-bit target) works the same way: release `packager-electron-<n>` holds the zip unchanged (made by `scripts/make-packager-electron.mjs`), `app/packager-electron.json` pins version/tag/asset/size/SHA-256, CI puts it in the installer as `resources/packager-electron` (zip + `version.json`) but not in `win-unpacked.zip`, the updater installs it when an update's pin version differs, and the app offers it when the packager asks for it and in "Check for Updates". A new Electron also needs the same file name and SHA-256 in the packager fork's `src/packager/large-assets.js`. Never delete a release a published app version still points to.

## npm snapshot
Release `npm-snapshot-<n>` is Bun's package cache with every package the build installs (Linux only; it can't be unpacked on Windows). The build restores the one in `npm-snapshot.json` and warns ("came from the internet, not the npm snapshot") when packages are missing. After changing any `bun.lock` or Bun's version, make the next one: `gh workflow run npm-snapshot.yml --repo Wolowolf/PenguinMod-NEWdesktop --ref main -f number=<n>` (it checks itself offline, publishes the release and attaches its `npm-snapshot.json`), copy that file into the repo, PR. Changing `npm-snapshot.yml` starts no app build. Never delete a snapshot release that `main` still points to.

## Bumping Electron, electron-builder, the runner, Bun, Node or an action
`electron` / `electron-builder` are pinned in `package.json` and, with all their tools, in `bun.lock` (CI installs electron-builder from it outside the project), so a build only changes when we bump them: edit `package.json`, then `bun install` to update `bun.lock` (then a new npm snapshot, above). The runner image (`ubuntu-24.04`), Bun, Node and every action are fixed in `main.yml` (actions as commit SHAs with the version in a comment); updating one is its own tweak (take the SHA of the new release tag).

## Comparing builds
SHA-256 of every file in `src\penguinmod.github.io\build` of the local test: delete `src\penguinmod.github.io\.webpack` (webpack's cache) before each build; a partly reused cache renames chunks. CI builds of the same code are byte-identical (checked in Session 29); local ones differ from CI's.

## Which servers the app contacts
Start Electron with `--log-net-log=<file>` and read the request URLs from that JSON (Session 29); upstream ones must not appear. The log is only complete when the app quits normally (close its windows), not when its process is killed.

## Testing a released app
For galleries or anything packaged (not covered by the local test), copy a release's `win-unpacked` to a short folder (e.g. `%TEMP%\pmrel`; the scratchpad path is too long for Windows' 260-character limit) and replace `resources\app\app` files with the ones to test.

## Recreating the local test folder
If `C:\Users\elias\Documents\PenguinMod-test\` is missing: steps in `docs/CHANGES-archive.md`, Session 7 (Grep it). Its helpers `cdp.mjs` and `tweak.mjs` (Session 36) have no copy elsewhere: rewrite them from their descriptions in CLAUDE.md if they are lost.

# CHANGES.md — current state and recent sessions

Kept short on purpose (read at the start of every session). Full history of Sessions 1–11, old Linux-sandbox test notes and the recipe to bring back Linux builds: `docs/CHANGES-archive.md` (search it with Grep, don't read it whole).

## Current state (update when it changes)

- **Baseline:** upstream commit `ab5e25a` (2026-06-15). Local test cache: GUI `24faae9`. Upstream builds stopped after 2026-09-06 (cause unconfirmed).
- **CI (`main.yml`):** Ubuntu + wine, Bun, Node 26; actions `checkout@v7`, `setup-node@v7`, `cache@v6`, `setup-bun@v2` (Session 13). Clones and builds PenguinMod-ExtensionsGallery, TurboWarp extensions (`package-lock.json` deleted before `bun i`: its git-hosted checksum broke installs, Session 1), SharkPools-Extensions, and the GUI with Vm, Blocks (`develop-builds`), Render (lockfile deleted) and Paint. Runs the patch, writes `app/build-info.json` `{tag, builtAt}`, runs `electron-builder --win nsis` (version read from `package.json`), then `gh release create` publishes the `.exe` (renamed with dots) and `win-unpacked.zip`.
- **`package.json`:** one NSIS installer, x64 only; `electron` 44.5.1 and `electron-builder` 26.15.3 pinned (bump them by hand); unused Linux targets still listed; `asar: false`; dependency `unzipper`; `.pmp` file association.
- **App:** always opens `https://studio.penguinmod.com/editor.html` (or a `.pmp` given on the command line), served from `app/build`. Extension gallery URLs map to offline folders. Links to the PenguinMod website load the live site.
- **Updater (`app/updater.js`, Session 5):** System → Check for Updates. Picks this fork's newest published release with a complete `win-unpacked.zip`, compares its tag with `build-info.json`, checks size + SHA-256, then replaces, adds and removes files under `resources/app/` with full rollback on error (`.old` leftovers deleted at next start). Needs a writable install folder (not Program Files). Downloads ~230 MB each time. Restarts the app.
- **Patch sections** (`patches/stage-layout.js`; each one says how to reverse it):
  - 1–7: the editor stage always fits a 480 px wide 4:3 box. The small/large buttons are removed. A drag handle sits on the stage column's left edge (240–1200 px, double-click resets, saved in `localStorage` `pmdesktop:stageBoxWidth`). The column hugs the stage, with a minimum width of 242 px. (Sessions 2–3)
  - 8: the sprite panel is one wrapping row: eye toggle, name, x, y, ⇪ size, ⟳ direction. (Session 4)
  - 9: automatic restore points are off by default. (Session 3)
  - 10: no rounded corners, CSS only (block shapes are SVG and stay rounded). (Session 4)
  - 11: the category menu shows colour boxes with the name only. The menu is 4.5rem wide; boxes are one line, the selected box two lines, with white outlined text. It also wraps `Toolbox.Category.createDom` and `Toolbox.getWidth`. (Sessions 6, 9)
  - 12: the "Back to Home" button is removed. (Session 8)
  - 13: dragging a category box to re-order the menu (upstream addon `toolbox-category-drag`). The held box slides and the others make room. The first and last places are reachable. The order is stored in the project's Stage comment, updated on every change, and reset for projects that have no stored order. (Sessions 10–11)
- **Not verified yet:**
  - The updater end to end inside a packaged install.
  - The installer itself (Claude has only tested the local build).
  - Fonts on other PCs.
  - Category order with a project file saved to disk and reopened (only in-app save and load were tested).
  - The user hasn't confirmed the builds from Sessions 3–6, 8–9 and 11 (Session 2's build was confirmed, Session 10's partly).
- **Ideas offered, not applied** (offer when relevant):
  - Stop editor links to the PenguinMod website from opening in the app.
  - Square off the block shapes (needs a `scratch-blocks` patch, riskier).

## Recent sessions (newest first, at most 3; move older ones to the top of the archive's change log)

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

## Template (keep entries this short)

```
### Session N — <title> (YYYY-MM-DD)
- Asked: …
- Changed: <files> — <what, why, how to reverse>
- Verified: <what was run/seen> · Not verified: <…>
- Result after build: not yet tested
```

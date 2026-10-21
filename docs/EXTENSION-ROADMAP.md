# EXTENSION-ROADMAP.md — integrating the shipped extensions into the engine

## Goal
The final app only runs the extensions it ships with: the VM's built-in extensions and the extensions of the three offline galleries (PenguinMod, TurboWarp, SharkPool; the list is `src/extension-support/shipped-extensions.json` in the VM fork and the table below). Importing other extensions is impossible. Every shipped extension is integrated as much as possible into the engine's optimisations: the ones already present (sections 39–42 sensing cache, 44–45 compile-time folding, 62 list lookup tables, 63 hats checked only when their answer can change) and the planned ones listed under the headings of `docs/EXTENSION-RISKS.md`. Blocks may change behaviour, be merged or be removed if that lets them be optimised.

## Rules
- Each conversation does one step, or one extension group when a step goes extension by extension.
- Speed changes: measure before and after with `bench\bench.mjs` (only the affected projects, `--runs 3`), and show that results are identical with an equality test like `bench\edgehats-check.mjs` or `bench\list-lookup-eq.js`.
- An extension that can't be integrated (embeds web pages, needs online servers, ...): ask the user whether to keep it as it is or remove it.
- At the end of every conversation, update this roadmap (checklist and table) and `docs/EXTENSION-RISKS.md` wherever an extension's reach into the engine changed.

## Steps
- [x] **1. Close the door.** Remove every way to load an extension that isn't shipped: the Load Custom Extension button and dialog, loading by URL or file, extension URLs stored in project files, gallery "Open Extension" messages that aren't from the app's own gallery pages, and any other entry point. The gallery extensions the app serves from its own folders keep loading. A project that names any other extension does not load. *(Session 105, section 105; the button, dialog and non-gallery addresses were already gone since sections 71, 72 and 75.)*
- [x] **2. Inventory.** Extend `C:\Users\elias\Documents\PenguinMod-test\scan-extensions.mjs` to list every block of every shipped extension and classify each block: pure (answer depends only on its inputs, touches nothing), reads (which engine state), writes (which engine state), depends on time or random, waits (returns a promise or yields), keeps its own hidden state, needs the page (DOM, window, own event listeners), answer type. Per extension, also record which engine functions it replaces or wraps. Check each classification by reading the code, then record it in this table and in a machine-readable file in the VM that the optimisations can read. Add a Node test that runs every "pure" block many times with tricky inputs and checks that the same inputs always give the same answer. *Done for all 124 extensions, 2192 blocks, 318 pure (Sessions 106–107, sections 106–107; see "Block inventory" below).*
  - [x] Built-in (17 extensions, 231 blocks, 59 pure) — Session 106
  - [x] PenguinMod gallery (27 extensions, 567 blocks, 65 pure) — Session 107
  - [x] TurboWarp gallery (48 extensions, 785 blocks, 152 pure) — Session 107
  - [x] SharkPool gallery (32 extensions, 609 blocks, 42 pure) — Session 107
- [x] **3. Move the gallery extensions into the VM** as built-in extensions (like `pmOperatorsExpansion`), so the compiler knows them when the editor is built; the galleries then only show the tiles. One extension group per conversation, most used or heaviest first. (Each one moved leaves `shipped-extensions.json`.) *Done for all 107 (Sessions 108–109, sections 108–109; see "Gallery extensions moved into the VM" below).*
  - [x] PenguinMod gallery (27 extensions) — Session 108, section 108
  - [x] TurboWarp gallery (48 extensions) — Session 109, section 109
  - [x] SharkPool gallery (32 extensions) — Session 109, section 109
- [ ] **4. Compile pure blocks directly.** First read in `src/compiler/jsgen.js` how extension blocks are called in compiled mode, and measure that cost. Then give pure blocks compiler code, so that folding (44/45), section 63's hats, type tracking and later Wasm treat them like built-in operators and they skip the compatibility path.
- [ ] **5. Replace engine patches with hooks.** For every extension that replaces or wraps an engine function, add a proper hook to the engine and rewrite the extension to use it, so no optimisation has to step aside. Remove a step-aside fallback once no shipped extension needs it any more: section 63 falling back to every-frame checks when `startHats` is replaced (sp `Messages-Plus`), section 40's safety list (`touchingCacheOriginals` in Render), section 62 turning a list's table off when its `value` is read or written directly, compiler class wrappers around section 44's `descendInput`. Of the extensions this step was first written for, `Pause`, `JSON-Array`, `jwArray`, `jwScope`, `jwLambda` and `shoveldebugger` are not shipped any more (removed in earlier sessions); the ones still shipped are marked ○ in column 5.
- [ ] **6. Hats checked every frame.** Turn the extension hats listed under "Hats checked every frame" in `EXTENSION-RISKS.md` (and the extensions that start their own hats every frame) into hats checked only when their answer can change (section 63's mechanism) or fired from events.
- [ ] **7. Planned optimisations:** whenever one of them is built, give the extensions what it needs: what each block writes (parallel blocks, automatic parallel clones), hidden state registered with the engine (rewind, deterministic mode), page-dependent parts split off (engine in a worker), answer types (typed variables, type tracking).

## How loading works (sections 105, 108–110)
- Only built-in extensions load; since section 110 nothing loads from an address. The gallery extensions are built into the VM (sections 108–109, next heading); `loadExtensionURL` takes a built-in ID or a moved extension's old gallery address (`moved-gallery-extensions.json`) and refuses everything else ("Unknown extension"). Removed in section 110: `shipped-extensions.json` (section 105's list of gallery addresses; the local `list-shipped-extensions.mjs` that wrote it is obsolete), fetching and hashing extension scripts, the unsandboxed script loader (only `createUnsandboxedExtensionAPI` stays), the worker service methods, the security manager's `getSandboxMode` / `canLoadExtensionFromProject` / `rewriteExtensionURL` / `shouldUseLocal` and the editor's "load extension" prompt, the ScratchX layer, and in the packager the address baking, the "bake extensions" option and the security manager of packaged pages.
- Projects, sprites and copied blocks name extensions by ID only: stored addresses are ignored and not saved; an ID that is not built in stops the project from loading ("Unknown extension").
- Packager: a packaged game holds the scaffolding plus only the chunks of its project's gallery extensions (`scaffolding/extensions-min|extensions-full/ext-<ID>.js`, pushed into `pmDesktopScaffoldingChunks` before the game starts, so it never fetches one); stored `extensionURLs` are dropped. The app's old guessed table (`/__extension-ids__.json`) is gone since section 105.
- Gallery "Open Extension" messages are accepted only from the three gallery pages the app serves itself (exact origins); they name gallery addresses, which `loadExtensionURL` maps to the built-in.

## Gallery extensions moved into the VM (step 3, sections 108–110)
- **Where:** VM `src/extensions/<gallery>_gallery/<path in the gallery>.js` (`penguinmod_gallery/Gen1x/iris-text.js`, `turbowarp_gallery/Lily/ListTools.js`, `sharkpool_gallery/Scenes.js` …; TurboWarp files as the gallery's build makes them, with translations and bundled libraries), listed in `extension-manager.js` `defaultBuiltinExtensions` like any built-in, but (section 110) as `() => import(/* webpackChunkName: "ext-<ID>" */ …)`: each is a chunk of its own, fetched the first time it loads (editor: `build/js/ext-<ID>.<hash>.js`), so moved extensions always load asynchronously (`loadExtensionIdSync` starts the load and returns at once). Each file is the gallery file (later steps may edit it; changes are marked "Desktop fork" and named in the file's header), wrapped as `module.exports = require('…/extension-support/desktop-gallery-extension')(function (Scratch, require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename) { <gallery code> });`: the extra names stay undefined, as in a page script, so webpack leaves the bundled UMD/browserify libraries inside some files alone. The helper turns it into a built-in extension class: `start(runtime)` runs the code with its own `Scratch` object (the same one an unsandboxed extension gets, from `createUnsandboxedExtensionAPI`; also left in `global.Scratch` like the old loader, TurboWarp's Zip reads it) and gives the one extension it registers at once, or a promise for it: TurboWarp's Box2D registers only after loading its bundled library, so the extension manager (`_loadMovedGalleryExtension`: chunk, then registration) adds it when it registers, `loadExtensionURL` waits, and project loading loads built-ins through `loadExtensionURL`. Changes so far: `/* webpackIgnore: true */` in every `import()` that loads a bundled library or engine (Text To Speech, TurboWarp Box2D and Face Sensing) so the build leaves it to the browser; TurboWarp Simple 3D (section 109): its `setHighQuality` wrapper called the original on the prototype, which since section 40 also clears the touching cache and crashed the editor on the next stage resize once Simple 3D was loaded; it now calls it on its drawable. The build transpiles these files like the rest of the VM (Babel, Chrome 70 targets), which the gallery files never were.
- **Addresses:** `src/extension-support/moved-gallery-extensions.json` (ID → old gallery address). `loadExtensionURL` loads the built-in for such an address (gallery tiles, the built-in library's Sound Waves and Tile Grids tiles, gallery messages), `getExtensionURLs` / `extensionUrlFromId` / `isExtensionURLLoaded` answer from it (the library's "used" mark), and the editor's palette category names are looked up with it (section 110; Session 104's renamed categories of gallery extensions were lost in sections 108–109). Projects already named extensions by ID, so nothing else changes for them. Size: the editor's main VM chunk was 12.6 MB after section 109 and is 6.8 MB since 110; the packager's `scaffolding-min.js` was 10.4 MB after section 108 and 15.7 MB after 109, 9.6 MB since 110 plus only the project's chunks (a project with 7 of them, Box2D included, packaged to a 10.2 MB HTML file). Loading one no longer sets the runtime's `customExtensions` flag (privacy rule for extensions loaded from an address: see `EXTENSION-RISKS.md`).
- **Adding a gallery extension later:** the local script that moved them (Session 109) is not kept; repeat it: write the wrapped file (TurboWarp: from the gallery's `build/`), add its address to `moved-gallery-extensions.json` and its `defaultBuiltinExtensions` line (an `import()` with its own `webpackChunkName`), give it an inventory entry with `source` = the new file (edit only those strings; the inventory has its own formatting); add `webpackIgnore` to each `import()` of a library and check the build log has no "Critical dependency" warning. Test: `desktop_block_inventory.js`, then in the test app load every moved address and ID, run a few blocks compiled, save and reopen a project in a fresh editor.
- **Gallery copies removed from the app (section 110):** CI runs `scripts/remove-moved-gallery-files.js` right after copying the three gallery builds into `app/`: it deletes the file of every address in `moved-gallery-extensions.json` (107) and fails the build if one is missing. The gallery forks and their builds are unchanged (TurboWarp's tiles come from its files' headers), so the galleries keep their pages, listings and tiles; other unlisted files stay (never loadable).

## Block inventory (step 2, sections 106–107)
- **File:** VM `src/extension-support/block-inventory.json`, one entry per inventoried extension ID: `source` (gallery extensions only: its file, relative to the local test's `galleries` folder, e.g. `SharkPools-Extensions/extension-code/Scenes.js`; for one moved into the VM, its VM file, e.g. `src/extensions/penguinmod_gallery/Gen1x/iris-text.js`, which the test runs the same way), `note` (optional, about the whole extension), `replaces` (engine functions it replaces or adds: the engine is compared before and after the extension loads, then checked in its code) and `blocks`, one line per block: `type` (block type), `pure` (reporter, Boolean or hat whose answer depends only on its inputs and which changes nothing: may be folded, cached or skipped), `reads` / `writes` (engine state, tags below), `time` (depends on the clock or frame count), `random`, `waits` (can last more than one frame: promise, yield, timer), `hiddenState` (keeps its own state between calls, outside the project), `page` (needs the page: DOM, window, navigator, network, a page canvas), `answer` (`number`, `string`, `boolean`, `object`, `array`, `any`; `null` for blocks without an answer), `compiled` (already has compiler code: `getCompileInfo` or the compiler itself), `note` (optional: what later steps must know).
- **Tags:** `sprite` (the running sprite's own state, incl. pen and custom state) · `sprites` (other sprites, clones, the sprite list) · `stage` (the stage's own state, e.g. tempo) · `variables` (variables, lists, broadcast messages) · `threads` (starting or stopping scripts, other scripts' state) · `script` (the running script's own data: thread data, per-block memory) · `input` (mouse, keyboard, video, user data) · `sound` · `renderer` (drawing, pen layer, touching, screenshots) · `camera` · `stage size` · `settings` (runtime options, packaged flag, quality) · `blocks` (the project's block data) · `monitors` · `events` · `cloud` · `project` (data saved in the project file: `extensionStorage`, fonts, a whole project).
- **Doing a group** (in `C:\Users\elias\Documents\PenguinMod-test`): start the test app fresh with `-Debug` (for a gallery group with the galleries linked in, `docs/PROCEDURES.md`); `node scan-extensions.mjs blocks <vm|pm|tw|sp> inventory\<group>-draft --source` writes a draft (every block with a guessed classification and the evidence, `.txt`), every block's code with the helpers it uses (`.src.txt`; `--brief` instead writes a shorter `.brief.txt` that shows long helpers only by their lines reaching outside the extension) and the app's dump (`.raw.json`, reused until deleted). Read every block's code and write the checked classification into `inventory\make-<group>-checked.cjs` (like `make-sp-checked.cjs`, using `inventory\checked-lib.cjs`; every block must be listed; extensions to ask the user about go into `<group>-decisions.json`), run it, then `node scan-extensions.mjs inventory inventory\<group>-draft.json inventory\<group>-checked.json` puts those extensions into the VM file. Then run the test (next point) and fill this table's "Blocks (pure)", column 2 and column 4 (○ when a pure block has no compiler code yet).
- **Test:** VM `test/unit/desktop_block_inventory.js` (`node test/unit/desktop_block_inventory.js` in the VM checkout, ~25 s; `DESKTOP_ONLY=<regex>` checks only matching IDs): for every inventoried extension, the inventory lists exactly its blocks; every pure block without compiler code is run on every value of a list of tricky inputs (numbers, text, booleans, menu values), in two orders, with `util` and the runtime replaced by objects that throw when used: same answers both times, and of the recorded type. Inputs on which a block never finishes are left out (`LIMITS`, see the notes). Checked that it catches a block wrongly marked pure (runtime use, `util` use, random, clock). Gallery extensions are loaded from their `source` file in the local test's `galleries` folder (or `DESKTOP_GALLERIES`; skipped when missing) the way the gallery runs them: the file gets a stand-in `Scratch` object (real `Cast`, block and argument types; everything else, and every page part the file uses while it loads, is a stand-in that throws if a pure block touches it); all 107 load and pass. Not caught: a block marked pure whose clock or hidden state does not change during the test (checked by reading the code only).
- **Found in the built-in group (not fixed; step 4 can fix them):** `pmOperatorsExpansion` "is () a prime number?" never returns for Infinity (and checks every divisor of big primes); `iygPerlin` "Get perlin noise" never returns when the octave is the text "Infinity" (its inputs are not cast, so text and numbers also give different answers; `pmCamera` likewise stores uncast text). 11 `pmOperatorsExpansion` blocks and the two `pmEventsExpansion` "broadcast and wait" reporters only work compiled (the interpreter functions are stubs). `jgPrism` "data url of image at url" needs an online server (api.allorigins.win). `pmEventsExpansion` wraps `RenderedTarget.prototype.setCostume` and the VM's `startDrag`, `stopDrag`, `saveProjectSb3`, `saveProjectSb3Stream` (now in `EXTENSION-RISKS.md`).
- **Found while moving them (fixed, section 109):** tw `Xeltalliv/simple3D` crashed the editor on a stage resize (see "Gallery extensions moved into the VM"). Not fixed: sp `Sprite-Effects-V2` throws in its stop-all handler when the stage canvas has left the page (seen only after that crash).
- **Found in the gallery groups (not fixed):** pm `qxsck/big-decimal` "round" never returns when its places input is a large negative number (left out of the test). tw `text` "count regex" answers the previous match's count when the pattern or flags are invalid (shares a cache; not pure). sp `Time-Calculation` "evaluate" shifts its answer by a fixed 8 hours; sp `Geolocation` "distance" is about 0.0003 of the real distance. Async blocks are not pure (pm `gaimerI17/crypto` RSA keys answer through a promise). Engine patches not listed before (now in `EXTENSION-RISKS.md`): tw `runtime-options` wraps `userData.postData`; sp `My-Blocks-Plus` replaces 7 `Blocks` / runtime / sequencer methods and 5 VM methods; sp `Extra-Controls` replaces `window.Error` and `console.error`; sp `Sharktilities`, `QR-Codes` patch the block editor; sp `Pen-Papers` redirects the pen to its own layers. Many gallery extensions write `variable.value` / `list.value` directly (section 62 turns those lists' tables off). Extensions needing online services or turned-off browser features are listed for a decision in the local test's `inventory\<group>-decisions.json` (Session 107 asked the user about them).

## Extensions (124: 17 built-in, 27 PenguinMod, 48 TurboWarp, 32 SharkPool)
Columns 1–7 are the steps. ✓ done · ○ to do · — not needed · ? decided by the step 2 inventory. "Blocks (pure)": number of blocks and of pure blocks in the inventory (? = not inventoried yet). "ID" is the extension ID projects save. "Engine areas" are the `EXTENSION-RISKS.md` headings that name the extension ("most exposed" = in its most exposed list).

| Extension (file) | Gallery | ID | Blocks (pure) | 1 | 2 | 3 | 4 | 5 | 6 | 7 | Engine areas (EXTENSION-RISKS.md) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pen (`pen`) | built-in | `pen` | 24 (0) | ✓ | ✓ | — | — | — | — | ? | drawing, page |
| Music (`music`) | built-in | `music` | 7 (0) | ✓ | ✓ | — | — | — | — | ? | sound |
| Video Sensing (`videoSensing`) | built-in | `videoSensing` | 4 (0) | ✓ | ✓ | — | — | — | ○ | ? | frame loop, sensing, threads |
| Motion Expansion (`pmMotionExpansion`) | built-in | `pmMotionExpansion` | 11 (0) | ✓ | ✓ | — | — | — | — | ? | overridden, sensing, clones |
| Operators Expansion (`pmOperatorsExpansion`) | built-in | `pmOperatorsExpansion` | 31 (26) | ✓ | ✓ | — | ○ | — | — | ? | compiler |
| Sensing Expansion (`pmSensingExpansion`) | built-in | `pmSensingExpansion` | 25 (2) | ✓ | ✓ | — | ○ | — | — | ? | drawing, sound, input |
| Controls Expansion (`pmControlsExpansion`) | built-in | `pmControlsExpansion` | 6 (0) | ✓ | ✓ | — | — | — | — | ? | compiler, threads |
| Events Expansion (`pmEventsExpansion`) | built-in | `pmEventsExpansion` | 33 (2) | ✓ | ✓ | — | ○ | ○ | ○ | ? | most exposed, frame loop, stage size, threads, input |
| Prism (`jgPrism`) | built-in | `jgPrism` | 11 (7) | ✓ | ✓ | — | ○ | — | — | ? | drawing, sound |
| Tween (`jgTween`) | built-in | `jgTween` | 8 (1) | ✓ | ✓ | — | ○ | — | — | ? | threads, hidden state |
| Tailgating (`jgTailgating`) | built-in | `jgTailgating` | 5 (0) | ✓ | ✓ | — | — | — | — | ? | frame loop, clones |
| Proto (`jwProto`) | built-in | `jwProto` | 8 (5) | ✓ | ✓ | — | ○ | — | — | ? | compiler |
| Color (`jwColor`) | built-in | `jwColor` | 12 (12) | ✓ | ✓ | — | ○ | — | — | ? | data |
| LZ Compress (`shovellzcompresss`) | built-in | `shovellzcompresss` | 2 (2) | ✓ | ✓ | — | ○ | — | — | ? | self-contained |
| Camera (`pmCamera`) | built-in | `pmCamera` | 22 (0) | ✓ | ✓ | — | — | — | — | ? | overridden, stage size |
| Printing (`sharkpoolPrinting`) | built-in | `sharkpoolPrinting` | 19 (0) | ✓ | ✓ | — | — | — | — | ? | drawing |
| Perlin Noise (`iygPerlin`) | built-in | `iygPerlin` | 3 (2) | ✓ | ✓ | — | ○ | — | — | ? | self-contained |
| Iris Text (`Gen1x/iris-text`) | PenguinMod | `g1nxIrisText` | 105 (9) | ✓ | ✓ | ✓ | ○ | ○ | — | ? | most exposed, frame loop, drawing, compiler |
| Boxed Physics (`pooiod/Box2D`) | PenguinMod | `P7BoxPhys` | 42 (4) | ✓ | ✓ | ✓ | ○ | — | — | ? | sensing, hidden state |
| Lighting (`Gen1x/lighting`) | PenguinMod | `g1nxLighting` | 40 (0) | ✓ | ✓ | ✓ | — | — | — | ? | frame loop, drawing, stage size, page |
| 3D Math (`ObviousAlexC/3DMath`) | PenguinMod | `obviousAlexCMath3d` | 63 (0) | ✓ | ✓ | ✓ | — | ○ | — | ? | threads |
| Beat Sync (`Gen1x/beat_sync`) | PenguinMod | `beatSync` | 24 (0) | ✓ | ✓ | ✓ | — | — | ○ | ? | frame loop, threads, sound, hidden state |
| Extra Timers (`steve0greatness/timers`) | PenguinMod | `steve0greatnesstimers` | 10 (0) | ✓ | ✓ | ✓ | — | — | ○ | ? | threads, data, hidden state |
| Dictation (`pooiod/Dictation`) | PenguinMod | `pooiod7Dictation` | 4 (0) | ✓ | ✓ | ✓ | — | — | — | ? | input, self-contained (microphone, own worker since section 111) |
| Text To Speech (`PuzzlingGGG/ttsrV2`) | PenguinMod | `pmTextToSpeech` | 8 (0) | ✓ | ✓ | ✓ | — | — | — | ? | sound |
| E2EE (`MikeDev101/e2ee`) | PenguinMod | `e2ee` | 9 (0) | ✓ | ✓ | ✓ | — | — | — | ? | self-contained |
| WebRTC (`MikeDev101/webrtc`) | PenguinMod | `webrtc` | 22 (0) | ✓ | ✓ | ✓ | — | — | — | ? | self-contained |
| PenguinHook (`MubiLop/penguinhook`) | PenguinMod | `mubiloppenguinhook` | 8 (0) | ✓ | ✓ | ✓ | — | — | — | ? | self-contained |
| Number Utilities (`MubiLop/numutils`) | PenguinMod | `numberUtilities` | 11 (10) | ✓ | ✓ | ✓ | ○ | — | — | ? | self-contained |
| Big Decimal (`qxsck/big-decimal`) | PenguinMod | `qxsckbignumber` | 17 (8) | ✓ | ✓ | ✓ | ○ | — | — | ? | self-contained |
| 3D Vectors & Quaternions (`Div/divVecQuat`) | PenguinMod | `divVecQuat` | 29 (29) | ✓ | ✓ | ✓ | — | — | — | ? | compiler, data |
| Random Utilities (`Gen1x/random_utils`) | PenguinMod | `randomutils` | 11 (0) | ✓ | ✓ | ✓ | — | — | — | ? | self-contained |
| Toast Notifications (`MubiLop/toastnotifs`) | PenguinMod | `toastnotifs` | 6 (0) | ✓ | ✓ | ✓ | — | — | — | ? | self-contained |
| Translation Keys (`Embin/embintranslation`) | PenguinMod | `embintranslation` | 13 (0) | ✓ | ✓ | ✓ | — | — | — | ? | self-contained |
| Device Motion (`gaimerI17/DeviceMotion`) | PenguinMod | `gaimeriDeviceMotionExtension` | 16 (0) | ✓ | ✓ | ✓ | — | — | — | ? | input |
| Video Sharing (`pooiod/VideoSharing`) | PenguinMod | `p7videosharing` | 11 (0) | ✓ | ✓ | ✓ | — | — | — | ? | drawing, headers |
| Google Auth (`Ikelene/googleAuthExtension`) | PenguinMod | `googleAuth` | 9 (0) | ✓ | ✓ | ✓ | — | — | — | ? | self-contained |
| Discord Auth (`NotHouse/DiscordAuth`) | PenguinMod | `discordauth` | 10 (0) | ✓ | ✓ | ✓ | — | — | — | ? | self-contained |
| Resolution (`DogeisCut/Resolution`) | PenguinMod | `dogeiscutResolution` | 10 (4) | ✓ | ✓ | ✓ | ○ | — | — | ? | self-contained |
| Cryptography (`gaimerI17/crypto`) | PenguinMod | `gaimeriCryptoExtension` | 14 (0) | ✓ | ✓ | ✓ | — | — | — | ? | self-contained |
| MIDI Controller (`electricfuzzball_pm/MIDI`) | PenguinMod | `midi` | 29 (1) | ✓ | ✓ | ✓ | ○ | — | ○ | ? | threads, input |
| Spritesheeter (`MubiLop/spritesheeter`) | PenguinMod | `spritesheeter` | 24 (0) | ✓ | ✓ | ✓ | — | — | — | ? | self-contained |
| Sound Waves (`SharkPool/Sound-Waves`) | PenguinMod | `SPsoundWaves` | 13 (0) | ✓ | ✓ | ✓ | — | — | — | ? | sound |
| Tile Grids (`SharkPool/Tile-Grids`) | PenguinMod | `SPgrids` | 9 (0) | ✓ | ✓ | ✓ | — | — | — | ? | clones |
| Face Sensing (`lab/face-sensing`) | TurboWarp | `faceSensing` | 9 (0) | ✓ | ✓ | ✓ | — | — | ○ | ? | sensing, threads, headers |
| Video Sprites (`lab/video-sprites`) | TurboWarp | `videoSprites` | 5 (0) | ✓ | ✓ | ✓ | — | ○ | — | ? | most exposed, frame loop, drawing, clones |
| Stretch (`stretch`) | TurboWarp | `stretch` | 8 (0) | ✓ | ✓ | ✓ | — | ○ | — | ? | drawing, sensing |
| Box2D Physics (`box2d`) | TurboWarp | `griffpatch` | 34 (0) | ✓ | ✓ | ✓ | — | — | — | ? | sensing, hidden state |
| Pointerlock (`pointerlock`) | TurboWarp | `pointerlock` | 2 (0) | ✓ | ✓ | ✓ | — | ○ | — | ? | most exposed, frame loop, stage size, input, page |
| Mouse Cursor (`cursor`) | TurboWarp | `MouseCursor` | 4 (0) | ✓ | ✓ | ✓ | — | — | — | ? | drawing, input, page |
| Runtime Options (`runtime-options`) | TurboWarp | `runtimeoptions` | 11 (0) | ✓ | ✓ | ✓ | — | ○ | — | ? | overridden, frame loop, stage size, input |
| Text (`text`) | TurboWarp | `strings` | 19 (17) | ✓ | ✓ | ✓ | ○ | — | — | ? | self-contained |
| Local Storage (`local-storage`) | TurboWarp | `localstorage` | 6 (0) | ✓ | ✓ | ✓ | — | — | — | ? | self-contained |
| Base (`true-fantom/base`) | TurboWarp | `truefantombase` | 2 (2) | ✓ | ✓ | ✓ | ○ | — | — | ? | self-contained |
| Bitwise (`bitwise`) | TurboWarp | `Bitwise` | 12 (12) | ✓ | ✓ | ✓ | ○ | — | — | ? | self-contained |
| BigInt (`Skyhigh173/bigint`) | TurboWarp | `skyhigh173BigInt` | 21 (21) | ✓ | ✓ | ✓ | ○ | — | — | ? | self-contained |
| Utilities (`utilities`) | TurboWarp | `utilities` | 16 (14) | ✓ | ✓ | ✓ | ○ | — | — | ? | self-contained |
| Video (`Lily/Video`) | TurboWarp | `lmsVideo` | 16 (0) | ✓ | ✓ | ✓ | — | — | — | ? | frame loop, drawing, sound, headers |
| HTML Encode (`Clay/htmlEncode`) | TurboWarp | `claytonhtmlencode` | 1 (1) | ✓ | ✓ | ✓ | ○ | — | — | ? | self-contained |
| Clipping & Blending (`Xeltalliv/clippingblending`) | TurboWarp | `xeltallivclipblend` | 5 (0) | ✓ | ✓ | ✓ | — | ○ | — | ? | most exposed, drawing, clones |
| Clipboard (`clipboard`) | TurboWarp | `clipboard` | 6 (0) | ✓ | ✓ | ✓ | — | — | — | ? | self-contained |
| Pen Plus V7 (`obviousAlexC/penPlus`) | TurboWarp | `penP` | 84 (6) | ✓ | ✓ | ✓ | ○ | ○ | — | ? | most exposed, frame loop, drawing, stage size, hidden state |
| Simple 3D (`Xeltalliv/simple3D`) | TurboWarp | `xeltallivSimple3D` | 93 (1) | ✓ | ✓ | ✓ | ○ | ○ | — | ? | most exposed, drawing, sensing, data, hidden state |
| Sensing Plus (`obviousAlexC/SensingPlus`) | TurboWarp | `obviousalexsensing` | 28 (0) | ✓ | ✓ | ✓ | — | — | — | ? | drawing, stage size, sensing |
| Key Simulation (`CubesterYT/KeySimulation`) | TurboWarp | `cubesterKeySimulation` | 3 (0) | ✓ | ✓ | ✓ | — | — | — | ? | stage size, input |
| Clones Plus (`Lily/ClonesPlus`) | TurboWarp | `lmsclonesplus` | 20 (0) | ✓ | ✓ | ✓ | — | — | ○ | ? | sensing, threads, data, clones |
| Looks Plus (`Lily/LooksPlus`) | TurboWarp | `lmsLooksPlus` | 14 (2) | ✓ | ✓ | ✓ | ○ | — | — | ? | drawing |
| List Tools (`Lily/ListTools`) | TurboWarp | `lmsData` | 15 (0) | ✓ | ✓ | ✓ | — | — | — | ? | data |
| Mobile Keyboard (`veggiecan/mobilekeyboard`) | TurboWarp | `mobilekeyboard0419` | 12 (0) | ✓ | ✓ | ✓ | — | — | — | ? | input |
| Window Controls (`CubesterYT/WindowControls`) | TurboWarp | `cubesterWindowControls` | 27 (0) | ✓ | ✓ | ✓ | — | — | — | ? | stage size |
| Navigator (`navigator`) | TurboWarp | `navigatorinfo` | 6 (0) | ✓ | ✓ | ✓ | — | — | — | ? | self-contained |
| Battery (`battery`) | TurboWarp | `battery` | 8 (0) | ✓ | ✓ | ✓ | — | — | — | ? | self-contained |
| Color Picker (`TheShovel/ColorPicker`) | TurboWarp | `shovelColorPicker` | 6 (0) | ✓ | ✓ | ✓ | — | — | — | ? | frame loop, drawing |
| Notifications (`mdwalters/notifications`) | TurboWarp | `mdwaltersnotifications` | 4 (0) | ✓ | ✓ | ✓ | — | — | — | ? | self-contained |
| Delta Time (`XeroName/Deltatime`) | TurboWarp | `dtbyxeroname` | 2 (0) | ✓ | ✓ | ✓ | — | — | — | ? | frame loop |
| Encoding (`encoding`) | TurboWarp | `Encoding` | 7 (5) | ✓ | ✓ | ✓ | ○ | — | — | ? | self-contained |
| Sound Expanded (`Lily/SoundExpanded`) | TurboWarp | `lmsSoundExpanded` | 19 (0) | ✓ | ✓ | ✓ | — | — | — | ? | sound |
| CloudLink V4 (`cloudlink`) | TurboWarp | `cloudlink` | 49 (0) | ✓ | ✓ | ✓ | — | — | ○ | ? | threads, self-contained |
| Network (`true-fantom/network`) | TurboWarp | `truefantomnetwork` | 22 (0) | ✓ | ✓ | ✓ | — | — | — | ? | self-contained |
| Math (`true-fantom/math`) | TurboWarp | `truefantommath` | 32 (32) | ✓ | ✓ | ✓ | ○ | — | — | ? | self-contained |
| ShovelUtils (`TheShovel/ShovelUtils`) | TurboWarp | `ShovelUtils` | 13 (1) | ✓ | ✓ | ✓ | ○ | ○ | — | ? | frame loop, data |
| Font Manager (`SharkPool/Font-Manager`) | TurboWarp | `SPASfontManager` | 9 (0) | ✓ | ✓ | ✓ | — | — | — | ? | self-contained |
| Wake Lock (`DNin/wake-lock`) | TurboWarp | `dninwakelock` | 2 (0) | ✓ | ✓ | ✓ | — | — | — | ? | self-contained |
| Canvas Effects (`TheShovel/CanvasEffects`) | TurboWarp | `theshovelcanvaseffects` | 7 (0) | ✓ | ✓ | ✓ | — | — | — | ? | drawing, stage size, page |
| Zip (`CST1229/zip`) | TurboWarp | `cst1229zip` | 26 (1) | ✓ | ✓ | ✓ | ○ | — | — | ? | self-contained |
| Graphics 2D (`NOname-awa/graphics2d`) | TurboWarp | `nonameawagraph` | 9 (9) | ✓ | ✓ | ✓ | ○ | — | — | ? | self-contained |
| Lily's Toolbox (`Lily/lmsutils`) | TurboWarp | `lmsutilsblocks` | 35 (24) | ✓ | ✓ | ✓ | ○ | — | ○ | ? | sensing, threads, input |
| Variable and list (`qxsck/var-and-list`) | TurboWarp | `qxsckvarandlist` | 15 (0) | ✓ | ✓ | ✓ | — | — | — | ? | data |
| WebSocket (`godslayerakp/ws`) | TurboWarp | `gsaWebsocket` | 15 (0) | ✓ | ✓ | ✓ | — | — | — | ? | frame loop, threads |
| Steamworks (`steamworks`) | TurboWarp | `steamworks` | 6 (0) | ✓ | ✓ | ✓ | — | — | — | ? | self-contained |
| itch.io (`itchio`) | TurboWarp | `itch` | 14 (0) | ✓ | ✓ | ✓ | — | — | — | ? | self-contained |
| Text Case (`Medericoder/textcase`) | TurboWarp | `medericodertextcase` | 6 (4) | ✓ | ✓ | ✓ | ○ | — | — | ? | self-contained |
| Sharktilities (`Sharktilities`) | SharkPool | `SharkPoolSharktilities` | 22 (5) | ✓ | ✓ | ✓ | ○ | ○ | ○ | ? | frame loop, drawing, threads, clones, editor |
| Tune-Shark-V3 (`Tune-Shark-V3`) | SharkPool | `SPtuneShark3` | 38 (0) | ✓ | ✓ | ✓ | — | — | — | ? | frame loop, threads, sound |
| Hyper-Sense (`Hyper-Sense-V2`) | SharkPool | `HyperSense2SP` | 40 (2) | ✓ | ✓ | ✓ | ○ | — | ○ | ? | frame loop, drawing, stage size, sensing, data, input |
| Keys-Plus-V2 (`KeysPlusV2`) | SharkPool | `enderKeysPlusV2` | 44 (0) | ✓ | ✓ | ✓ | — | — | ○ | ? | frame loop, stage size, input |
| Popup-Phoenix (`Popup-Phoenix`) | SharkPool | `SPpopups` | 45 (0) | ✓ | ✓ | ✓ | — | — | — | ? | input, page |
| Camera-Sensing-Plus (`Camera-Sensing-Plus`) | SharkPool | `CameraSensingPlusSP` | 12 (0) | ✓ | ✓ | ✓ | — | — | — | ? | drawing, sensing |
| Particle-Engine (`Particle-Engine`) | SharkPool | `SPpartEngine` | 23 (1) | ✓ | ✓ | ✓ | ○ | ○ | — | ? | most exposed, overridden, frame loop, drawing, stage size, sensing, editor, hidden state |
| Sprite-Effects (`Sprite-Effects-V2`) | SharkPool | `SPspriteEffectsV2` | 31 (6) | ✓ | ✓ | ✓ | ○ | — | — | ? | drawing, stage size |
| Recording (`Recording-V2`) | SharkPool | `SPrecording2` | 8 (0) | ✓ | ✓ | ✓ | — | — | — | ? | sound |
| Sprite-Parenting (`Sprite-Parenting`) | SharkPool | `SPspriteParent` | 13 (0) | ✓ | ✓ | ✓ | — | — | — | ? | clones |
| Rigidbodies (`Rigidbodies`) | SharkPool | `SPrigidBody` | 11 (0) | ✓ | ✓ | ✓ | — | ○ | — | ? | drawing, sensing, editor, hidden state |
| Lazy-Collisions (`Lazy-Collisions`) | SharkPool | `LZcollisionsSP` | 5 (0) | ✓ | ✓ | ✓ | — | ○ | — | ? | sensing, data, clones |
| Files-Expanded (`Files-Expanded`) | SharkPool | `filesExpanded` | 25 (1) | ✓ | ✓ | ✓ | ○ | — | — | ? | drawing |
| Temporary-Variables (`Temporary-Variables`) | SharkPool | `SPtempVars` | 10 (0) | ✓ | ✓ | ✓ | — | ○ | — | ? | most exposed, compiler |
| Variables-Expanded (`Variables-Expanded`) | SharkPool | `DICandSPmonitorsPlus` | 24 (0) | ✓ | ✓ | ✓ | — | — | ○ | ? | frame loop, stage size, data |
| Gamepad-Expanded (`Gamepad-Expanded`) | SharkPool | `Gamepad` | 12 (0) | ✓ | ✓ | ✓ | — | — | — | ? | input |
| Animations (`Animations`) | SharkPool | `SPanimations` | 26 (0) | ✓ | ✓ | ✓ | — | — | — | ? | frame loop, drawing, sensing, hidden state |
| Messages-Plus (`Messages-Plus`) | SharkPool | `SPmessagePlus` | 17 (0) | ✓ | ✓ | ✓ | — | ○ | — | ? | most exposed, threads |
| Geolocation (`Geolocation`) | SharkPool | `SPgeolocation` | 15 (1) | ✓ | ✓ | ✓ | ○ | — | — | ? | self-contained |
| Color-Master (`Color-Master`) | SharkPool | `SPcolorMaster` | 17 (15) | ✓ | ✓ | ✓ | ○ | ○ | — | ? | editor |
| QR-Codes (`QR-Codes`) | SharkPool | `SPqrCodes` | 3 (0) | ✓ | ✓ | ✓ | — | ○ | — | ? | editor, self-contained |
| Speech-Bubbles (`Speech-Bubbles`) | SharkPool | `speechSP` | 19 (0) | ✓ | ✓ | ✓ | — | — | — | ? | frame loop, drawing, page |
| Layer-Control (`Layer-Control`) | SharkPool | `SPlayering` | 6 (0) | ✓ | ✓ | ✓ | — | — | — | ? | drawing |
| Time-Calculation (`Time-Calculation`) | SharkPool | `SPtimeCalc` | 9 (4) | ✓ | ✓ | ✓ | ○ | — | — | ? | self-contained |
| Extra-Controls (`Extra-Controls`) | SharkPool | `SPadvControl` | 40 (0) | ✓ | ✓ | ✓ | — | ○ | — | ? | most exposed, frame loop, compiler, threads, data, input, editor |
| SVG-Spritesheets (`SVG-Spritesheets`) | SharkPool | `SPsvgSheets` | 9 (5) | ✓ | ✓ | ✓ | ○ | — | — | ? | self-contained |
| GIF-Manager (`GIF-Manager`) | SharkPool | `SPgifManager` | 13 (0) | ✓ | ✓ | ✓ | — | — | — | ? | self-contained |
| My-Blocks-Plus (`My-Blocks-Plus`) | SharkPool | `SPmbpCST` | 4 (0) | ✓ | ✓ | ✓ | — | ○ | — | ? | most exposed, compiler, threads, clones, editor |
| Turbo-Skins (`Turbo-Skins`) | SharkPool | `SPturboSkins` | 13 (0) | ✓ | ✓ | ✓ | — | ○ | — | ? | most exposed, frame loop, drawing, sensing |
| Scenes (`Scenes`) | SharkPool | `SPscenes` | 8 (0) | ✓ | ✓ | ✓ | — | ○ | — | ? | most exposed, overridden, frame loop, drawing, stage size, threads, data, clones |
| Pen-Papers (`Pen-Papers`) | SharkPool | `SPpenPapers` | 11 (0) | ✓ | ✓ | ✓ | — | — | — | ? | drawing, sensing, hidden state |
| MIDI-Tools (`MIDI-Tools`) | SharkPool | `ObscurasMIDITools` | 36 (2) | ✓ | ✓ | ✓ | ○ | — | ○ | ? | threads |

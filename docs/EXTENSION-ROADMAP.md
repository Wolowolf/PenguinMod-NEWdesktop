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
- [ ] **2. Inventory.** Extend `C:\Users\elias\Documents\PenguinMod-test\scan-extensions.mjs` to list every block of every shipped extension and classify each block: pure (answer depends only on its inputs, touches nothing), reads (which engine state), writes (which engine state), depends on time or random, waits (returns a promise or yields), keeps its own hidden state, needs the page (DOM, window, own event listeners), answer type. Per extension, also record which engine functions it replaces or wraps. Check each classification by reading the code, then record it in this table and in a machine-readable file in the VM that the optimisations can read. Add a Node test that runs every "pure" block many times with tricky inputs and checks that the same inputs always give the same answer. *Goes extension group by extension group; the tool, the file and the test are done (Session 106, section 106; see "Block inventory" below).*
  - [x] Built-in (17 extensions, 231 blocks, 59 pure) — Session 106
  - [ ] PenguinMod gallery (27) — first extend the test to load a gallery file (stand-in `Scratch` object)
  - [ ] TurboWarp gallery (48)
  - [ ] SharkPool gallery (32)
- [ ] **3. Move the gallery extensions into the VM** as built-in extensions (like `pmOperatorsExpansion`), so the compiler knows them when the editor is built; the galleries then only show the tiles. One extension group per conversation, most used or heaviest first. (Each one moved leaves `shipped-extensions.json`.)
- [ ] **4. Compile pure blocks directly.** First read in `src/compiler/jsgen.js` how extension blocks are called in compiled mode, and measure that cost. Then give pure blocks compiler code, so that folding (44/45), section 63's hats, type tracking and later Wasm treat them like built-in operators and they skip the compatibility path.
- [ ] **5. Replace engine patches with hooks.** For every extension that replaces or wraps an engine function, add a proper hook to the engine and rewrite the extension to use it, so no optimisation has to step aside. Remove a step-aside fallback once no shipped extension needs it any more: section 63 falling back to every-frame checks when `startHats` is replaced (sp `Messages-Plus`), section 40's safety list (`touchingCacheOriginals` in Render), section 62 turning a list's table off when its `value` is read or written directly, compiler class wrappers around section 44's `descendInput`. Of the extensions this step was first written for, `Pause`, `JSON-Array`, `jwArray`, `jwScope`, `jwLambda` and `shoveldebugger` are not shipped any more (removed in earlier sessions); the ones still shipped are marked ○ in column 5.
- [ ] **6. Hats checked every frame.** Turn the extension hats listed under "Hats checked every frame" in `EXTENSION-RISKS.md` (and the extensions that start their own hats every frame) into hats checked only when their answer can change (section 63's mechanism) or fired from events.
- [ ] **7. Planned optimisations:** whenever one of them is built, give the extensions what it needs: what each block writes (parallel blocks, automatic parallel clones), hidden state registered with the engine (rewind, deterministic mode), page-dependent parts split off (engine in a worker), answer types (typed variables, type tracking).

## How loading works since step 1 (section 105)
- VM `src/extension-support/shipped-extensions.json`: gallery extension ID → the app's offline gallery address (107 entries). The IDs are the real ones, recorded by loading every listed extension in the test app: `node C:\Users\elias\Documents\PenguinMod-test\list-shipped-extensions.mjs` (test app running with `-Debug` and the galleries linked in, `docs/PROCEDURES.md`) rewrites the file from the three gallery listings. Run it again whenever a gallery extension is added, removed, renamed or moved into the VM.
- The VM loads a gallery address only if it is in that file (other files on the gallery hosts, web, `data:`, `blob:`, `file:` and the SharkPool alias hosts are refused); always unsandboxed (the worker and iframe sandboxes are removed). Projects, sprites and copied blocks name extensions by ID only: stored addresses are ignored and no longer saved; an ID that is neither built in nor in the file stops the project from loading ("Unknown extension").
- The editor's build copies the file to `https://studio.penguinmod.com/shipped-extensions.json`; the packager takes the addresses to bake from it, refuses a project that stores an address for an extension that isn't shipped, and has no custom extensions field. The app's old guessed table (`/__extension-ids__.json`, which missed 6 shipped extensions and allowed 24 unlisted gallery files) is gone.
- Gallery "Open Extension" messages are accepted only from the three gallery pages the app serves itself (exact origins), and still go through the VM's check.

## Block inventory (step 2, section 106)
- **File:** VM `src/extension-support/block-inventory.json`, one entry per inventoried extension ID: `replaces` (engine functions it replaces or adds: the engine is compared before and after the extension loads, then checked in its code) and `blocks`, one line per block: `type` (block type), `pure` (reporter, Boolean or hat whose answer depends only on its inputs and which changes nothing: may be folded, cached or skipped), `reads` / `writes` (engine state, tags below), `time` (depends on the clock or frame count), `random`, `waits` (can last more than one frame: promise, yield, timer), `hiddenState` (keeps its own state between calls, outside the project), `page` (needs the page: DOM, window, navigator, network, a page canvas), `answer` (`number`, `string`, `boolean`, `object`, `array`, `any`; `null` for blocks without an answer), `compiled` (already has compiler code: `getCompileInfo` or the compiler itself), `note` (optional: what later steps must know).
- **Tags:** `sprite` (the running sprite's own state, incl. pen and custom state) · `sprites` (other sprites, clones, the sprite list) · `stage` (the stage's own state, e.g. tempo) · `variables` (variables, lists, broadcast messages) · `threads` (starting or stopping scripts, other scripts' state) · `script` (the running script's own data: thread data, per-block memory) · `input` (mouse, keyboard, video, user data) · `sound` · `renderer` (drawing, pen layer, touching, screenshots) · `camera` · `stage size` · `settings` (runtime options, packaged flag, quality) · `blocks` (the project's block data) · `monitors` · `events` · `cloud`.
- **Doing a group** (in `C:\Users\elias\Documents\PenguinMod-test`): start the test app fresh with `-Debug` (for a gallery group with the galleries linked in, `docs/PROCEDURES.md`); `node scan-extensions.mjs blocks <vm|pm|tw|sp> inventory\<group>-draft --source` writes a draft (every block with a guessed classification and the evidence, `.txt`), every block's code with the helpers it uses (`.src.txt`) and the app's dump (`.raw.json`, reused until deleted). Read every block's code and write the checked classification into `inventory\make-<group>-checked.cjs` (like `make-vm-checked.cjs`; every block must be listed), run it, then `node scan-extensions.mjs inventory inventory\<group>-draft.json inventory\<group>-checked.json` puts those extensions into the VM file. Then run the test (next point) and fill this table's "Blocks (pure)", column 2 and column 4 (○ when a pure block has no compiler code yet).
- **Test:** VM `test/unit/desktop_block_inventory.js` (`node test/unit/desktop_block_inventory.js` in the VM checkout, ~25 s): for every inventoried built-in extension, the inventory lists exactly its blocks; every pure block without compiler code is run on every value of a list of tricky inputs (numbers, text, booleans, menu values), in two orders, with `util` and the runtime replaced by objects that throw when used: same answers both times, and of the recorded type. Inputs on which a block never finishes are left out (`LIMITS`, see the notes). Checked that it catches a block wrongly marked pure (runtime use, `util` use, random, clock). Gallery extensions are not loaded by it yet.
- **Found in the built-in group (not fixed; step 4 can fix them):** `pmOperatorsExpansion` "is () a prime number?" never returns for Infinity (and checks every divisor of big primes); `iygPerlin` "Get perlin noise" never returns when the octave is the text "Infinity" (its inputs are not cast, so text and numbers also give different answers; `pmCamera` likewise stores uncast text). 11 `pmOperatorsExpansion` blocks and the two `pmEventsExpansion` "broadcast and wait" reporters only work compiled (the interpreter functions are stubs). `jgPrism` "data url of image at url" needs an online server (api.allorigins.win). `pmEventsExpansion` wraps `RenderedTarget.prototype.setCostume` and the VM's `startDrag`, `stopDrag`, `saveProjectSb3`, `saveProjectSb3Stream` (now in `EXTENSION-RISKS.md`).

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
| Iris Text (`Gen1x/iris-text`) | PenguinMod | `g1nxIrisText` | ? | ✓ | ○ | ○ | ? | ○ | — | ? | most exposed, frame loop, drawing, compiler |
| Boxed Physics (`pooiod/Box2D`) | PenguinMod | `P7BoxPhys` | ? | ✓ | ○ | ○ | ? | — | — | ? | sensing, hidden state |
| Lighting (`Gen1x/lighting`) | PenguinMod | `g1nxLighting` | ? | ✓ | ○ | ○ | ? | — | — | ? | frame loop, drawing, stage size, page |
| 3D Math (`ObviousAlexC/3DMath`) | PenguinMod | `obviousAlexCMath3d` | ? | ✓ | ○ | ○ | ? | ○ | — | ? | threads |
| Beat Sync (`Gen1x/beat_sync`) | PenguinMod | `beatSync` | ? | ✓ | ○ | ○ | ? | — | ○ | ? | frame loop, threads, sound, hidden state |
| Extra Timers (`steve0greatness/timers`) | PenguinMod | `steve0greatnesstimers` | ? | ✓ | ○ | ○ | ? | — | ○ | ? | threads, data, hidden state |
| Dictation (`pooiod/Dictation`) | PenguinMod | `pooiod7Dictation` | ? | ✓ | ○ | ○ | ? | — | — | ? | input, self-contained |
| Text To Speech (`PuzzlingGGG/ttsrV2`) | PenguinMod | `pmTextToSpeech` | ? | ✓ | ○ | ○ | ? | — | — | ? | sound |
| E2EE (`MikeDev101/e2ee`) | PenguinMod | `e2ee` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| WebRTC (`MikeDev101/webrtc`) | PenguinMod | `webrtc` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| PenguinHook (`MubiLop/penguinhook`) | PenguinMod | `mubiloppenguinhook` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| Number Utilities (`MubiLop/numutils`) | PenguinMod | `numberUtilities` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| Big Decimal (`qxsck/big-decimal`) | PenguinMod | `qxsckbignumber` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| 3D Vectors & Quaternions (`Div/divVecQuat`) | PenguinMod | `divVecQuat` | ? | ✓ | ○ | ○ | ? | — | — | ? | compiler, data |
| Random Utilities (`Gen1x/random_utils`) | PenguinMod | `randomutils` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| Toast Notifications (`MubiLop/toastnotifs`) | PenguinMod | `toastnotifs` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| Translation Keys (`Embin/embintranslation`) | PenguinMod | `embintranslation` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| Device Motion (`gaimerI17/DeviceMotion`) | PenguinMod | `gaimeriDeviceMotionExtension` | ? | ✓ | ○ | ○ | ? | — | — | ? | input |
| Video Sharing (`pooiod/VideoSharing`) | PenguinMod | `p7videosharing` | ? | ✓ | ○ | ○ | ? | — | — | ? | drawing, headers |
| Google Auth (`Ikelene/googleAuthExtension`) | PenguinMod | `googleAuth` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| Discord Auth (`NotHouse/DiscordAuth`) | PenguinMod | `discordauth` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| Resolution (`DogeisCut/Resolution`) | PenguinMod | `dogeiscutResolution` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| Cryptography (`gaimerI17/crypto`) | PenguinMod | `gaimeriCryptoExtension` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| MIDI Controller (`electricfuzzball_pm/MIDI`) | PenguinMod | `midi` | ? | ✓ | ○ | ○ | ? | — | ○ | ? | threads, input |
| Spritesheeter (`MubiLop/spritesheeter`) | PenguinMod | `spritesheeter` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| Sound Waves (`SharkPool/Sound-Waves`) | PenguinMod | `SPsoundWaves` | ? | ✓ | ○ | ○ | ? | — | — | ? | sound |
| Tile Grids (`SharkPool/Tile-Grids`) | PenguinMod | `SPgrids` | ? | ✓ | ○ | ○ | ? | — | — | ? | clones |
| Face Sensing (`lab/face-sensing`) | TurboWarp | `faceSensing` | ? | ✓ | ○ | ○ | ? | — | ○ | ? | sensing, threads, headers |
| Video Sprites (`lab/video-sprites`) | TurboWarp | `videoSprites` | ? | ✓ | ○ | ○ | ? | ○ | — | ? | most exposed, frame loop, drawing, clones |
| Stretch (`stretch`) | TurboWarp | `stretch` | ? | ✓ | ○ | ○ | ? | ○ | — | ? | drawing, sensing |
| Box2D Physics (`box2d`) | TurboWarp | `griffpatch` | ? | ✓ | ○ | ○ | ? | — | — | ? | sensing, hidden state |
| Pointerlock (`pointerlock`) | TurboWarp | `pointerlock` | ? | ✓ | ○ | ○ | ? | ○ | — | ? | most exposed, frame loop, stage size, input, page |
| Mouse Cursor (`cursor`) | TurboWarp | `MouseCursor` | ? | ✓ | ○ | ○ | ? | — | — | ? | drawing, input, page |
| Runtime Options (`runtime-options`) | TurboWarp | `runtimeoptions` | ? | ✓ | ○ | ○ | ? | — | — | ? | overridden, frame loop, stage size |
| Text (`text`) | TurboWarp | `strings` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| Local Storage (`local-storage`) | TurboWarp | `localstorage` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| Base (`true-fantom/base`) | TurboWarp | `truefantombase` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| Bitwise (`bitwise`) | TurboWarp | `Bitwise` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| BigInt (`Skyhigh173/bigint`) | TurboWarp | `skyhigh173BigInt` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| Utilities (`utilities`) | TurboWarp | `utilities` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| Video (`Lily/Video`) | TurboWarp | `lmsVideo` | ? | ✓ | ○ | ○ | ? | — | — | ? | frame loop, drawing, sound, headers |
| HTML Encode (`Clay/htmlEncode`) | TurboWarp | `claytonhtmlencode` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| Clipping & Blending (`Xeltalliv/clippingblending`) | TurboWarp | `xeltallivclipblend` | ? | ✓ | ○ | ○ | ? | ○ | — | ? | most exposed, drawing, clones |
| Clipboard (`clipboard`) | TurboWarp | `clipboard` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| Pen Plus V7 (`obviousAlexC/penPlus`) | TurboWarp | `penP` | ? | ✓ | ○ | ○ | ? | ○ | — | ? | most exposed, frame loop, drawing, stage size, hidden state |
| Simple 3D (`Xeltalliv/simple3D`) | TurboWarp | `xeltallivSimple3D` | ? | ✓ | ○ | ○ | ? | ○ | — | ? | most exposed, drawing, sensing, data, hidden state |
| Sensing Plus (`obviousAlexC/SensingPlus`) | TurboWarp | `obviousalexsensing` | ? | ✓ | ○ | ○ | ? | — | — | ? | drawing, stage size, sensing |
| Key Simulation (`CubesterYT/KeySimulation`) | TurboWarp | `cubesterKeySimulation` | ? | ✓ | ○ | ○ | ? | — | — | ? | stage size, input |
| Clones Plus (`Lily/ClonesPlus`) | TurboWarp | `lmsclonesplus` | ? | ✓ | ○ | ○ | ? | — | ○ | ? | sensing, threads, data, clones |
| Looks Plus (`Lily/LooksPlus`) | TurboWarp | `lmsLooksPlus` | ? | ✓ | ○ | ○ | ? | — | — | ? | drawing |
| List Tools (`Lily/ListTools`) | TurboWarp | `lmsData` | ? | ✓ | ○ | ○ | ? | — | — | ? | data |
| Mobile Keyboard (`veggiecan/mobilekeyboard`) | TurboWarp | `mobilekeyboard0419` | ? | ✓ | ○ | ○ | ? | — | — | ? | input |
| Window Controls (`CubesterYT/WindowControls`) | TurboWarp | `cubesterWindowControls` | ? | ✓ | ○ | ○ | ? | — | — | ? | stage size |
| Navigator (`navigator`) | TurboWarp | `navigatorinfo` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| Battery (`battery`) | TurboWarp | `battery` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| Color Picker (`TheShovel/ColorPicker`) | TurboWarp | `shovelColorPicker` | ? | ✓ | ○ | ○ | ? | — | — | ? | frame loop, drawing |
| Notifications (`mdwalters/notifications`) | TurboWarp | `mdwaltersnotifications` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| Delta Time (`XeroName/Deltatime`) | TurboWarp | `dtbyxeroname` | ? | ✓ | ○ | ○ | ? | — | — | ? | frame loop |
| Encoding (`encoding`) | TurboWarp | `Encoding` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| Sound Expanded (`Lily/SoundExpanded`) | TurboWarp | `lmsSoundExpanded` | ? | ✓ | ○ | ○ | ? | — | — | ? | sound |
| CloudLink V4 (`cloudlink`) | TurboWarp | `cloudlink` | ? | ✓ | ○ | ○ | ? | — | ○ | ? | threads, self-contained |
| Network (`true-fantom/network`) | TurboWarp | `truefantomnetwork` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| Math (`true-fantom/math`) | TurboWarp | `truefantommath` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| ShovelUtils (`TheShovel/ShovelUtils`) | TurboWarp | `ShovelUtils` | ? | ✓ | ○ | ○ | ? | ○ | — | ? | frame loop, data |
| Font Manager (`SharkPool/Font-Manager`) | TurboWarp | `SPASfontManager` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| Wake Lock (`DNin/wake-lock`) | TurboWarp | `dninwakelock` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| Canvas Effects (`TheShovel/CanvasEffects`) | TurboWarp | `theshovelcanvaseffects` | ? | ✓ | ○ | ○ | ? | — | — | ? | drawing, stage size, page |
| Zip (`CST1229/zip`) | TurboWarp | `cst1229zip` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| Graphics 2D (`NOname-awa/graphics2d`) | TurboWarp | `nonameawagraph` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| Lily's Toolbox (`Lily/lmsutils`) | TurboWarp | `lmsutilsblocks` | ? | ✓ | ○ | ○ | ? | — | ○ | ? | sensing, threads, input |
| Variable and list (`qxsck/var-and-list`) | TurboWarp | `qxsckvarandlist` | ? | ✓ | ○ | ○ | ? | — | — | ? | data |
| WebSocket (`godslayerakp/ws`) | TurboWarp | `gsaWebsocket` | ? | ✓ | ○ | ○ | ? | — | — | ? | frame loop, threads |
| Steamworks (`steamworks`) | TurboWarp | `steamworks` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| itch.io (`itchio`) | TurboWarp | `itch` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| Text Case (`Medericoder/textcase`) | TurboWarp | `medericodertextcase` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| Sharktilities (`Sharktilities`) | SharkPool | `SharkPoolSharktilities` | ? | ✓ | ○ | ○ | ? | — | ○ | ? | frame loop, drawing, threads, clones |
| Tune-Shark-V3 (`Tune-Shark-V3`) | SharkPool | `SPtuneShark3` | ? | ✓ | ○ | ○ | ? | — | — | ? | frame loop, threads, sound |
| Hyper-Sense (`Hyper-Sense-V2`) | SharkPool | `HyperSense2SP` | ? | ✓ | ○ | ○ | ? | — | ○ | ? | frame loop, drawing, stage size, sensing, data, input |
| Keys-Plus-V2 (`KeysPlusV2`) | SharkPool | `enderKeysPlusV2` | ? | ✓ | ○ | ○ | ? | — | ○ | ? | frame loop, stage size, input |
| Popup-Phoenix (`Popup-Phoenix`) | SharkPool | `SPpopups` | ? | ✓ | ○ | ○ | ? | — | — | ? | input, page |
| Camera-Sensing-Plus (`Camera-Sensing-Plus`) | SharkPool | `CameraSensingPlusSP` | ? | ✓ | ○ | ○ | ? | — | — | ? | drawing, sensing |
| Particle-Engine (`Particle-Engine`) | SharkPool | `SPpartEngine` | ? | ✓ | ○ | ○ | ? | ○ | — | ? | most exposed, overridden, frame loop, drawing, stage size, sensing, editor, hidden state |
| Sprite-Effects (`Sprite-Effects-V2`) | SharkPool | `SPspriteEffectsV2` | ? | ✓ | ○ | ○ | ? | — | — | ? | drawing, stage size |
| Recording (`Recording-V2`) | SharkPool | `SPrecording2` | ? | ✓ | ○ | ○ | ? | — | — | ? | sound |
| Sprite-Parenting (`Sprite-Parenting`) | SharkPool | `SPspriteParent` | ? | ✓ | ○ | ○ | ? | — | — | ? | clones |
| Rigidbodies (`Rigidbodies`) | SharkPool | `SPrigidBody` | ? | ✓ | ○ | ○ | ? | ○ | — | ? | drawing, sensing, editor, hidden state |
| Lazy-Collisions (`Lazy-Collisions`) | SharkPool | `LZcollisionsSP` | ? | ✓ | ○ | ○ | ? | ○ | — | ? | sensing, data, clones |
| Files-Expanded (`Files-Expanded`) | SharkPool | `filesExpanded` | ? | ✓ | ○ | ○ | ? | — | — | ? | drawing |
| Temporary-Variables (`Temporary-Variables`) | SharkPool | `SPtempVars` | ? | ✓ | ○ | ○ | ? | ○ | — | ? | most exposed, compiler |
| Variables-Expanded (`Variables-Expanded`) | SharkPool | `DICandSPmonitorsPlus` | ? | ✓ | ○ | ○ | ? | — | ○ | ? | frame loop, stage size, data |
| Gamepad-Expanded (`Gamepad-Expanded`) | SharkPool | `Gamepad` | ? | ✓ | ○ | ○ | ? | — | — | ? | input |
| Animations (`Animations`) | SharkPool | `SPanimations` | ? | ✓ | ○ | ○ | ? | — | — | ? | frame loop, drawing, sensing, hidden state |
| Messages-Plus (`Messages-Plus`) | SharkPool | `SPmessagePlus` | ? | ✓ | ○ | ○ | ? | ○ | — | ? | most exposed, threads |
| Geolocation (`Geolocation`) | SharkPool | `SPgeolocation` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| Color-Master (`Color-Master`) | SharkPool | `SPcolorMaster` | ? | ✓ | ○ | ○ | ? | ○ | — | ? | editor |
| QR-Codes (`QR-Codes`) | SharkPool | `SPqrCodes` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| Speech-Bubbles (`Speech-Bubbles`) | SharkPool | `speechSP` | ? | ✓ | ○ | ○ | ? | — | — | ? | frame loop, page |
| Layer-Control (`Layer-Control`) | SharkPool | `SPlayering` | ? | ✓ | ○ | ○ | ? | — | — | ? | drawing |
| Time-Calculation (`Time-Calculation`) | SharkPool | `SPtimeCalc` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| Extra-Controls (`Extra-Controls`) | SharkPool | `SPadvControl` | ? | ✓ | ○ | ○ | ? | ○ | — | ? | most exposed, frame loop, compiler, threads, data, input |
| SVG-Spritesheets (`SVG-Spritesheets`) | SharkPool | `SPsvgSheets` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| GIF-Manager (`GIF-Manager`) | SharkPool | `SPgifManager` | ? | ✓ | ○ | ○ | ? | — | — | ? | self-contained |
| My-Blocks-Plus (`My-Blocks-Plus`) | SharkPool | `SPmbpCST` | ? | ✓ | ○ | ○ | ? | ○ | — | ? | most exposed, compiler, threads, editor |
| Turbo-Skins (`Turbo-Skins`) | SharkPool | `SPturboSkins` | ? | ✓ | ○ | ○ | ? | ○ | — | ? | most exposed, frame loop, drawing, sensing |
| Scenes (`Scenes`) | SharkPool | `SPscenes` | ? | ✓ | ○ | ○ | ? | ○ | — | ? | most exposed, overridden, frame loop, drawing, stage size, threads, data, clones |
| Pen-Papers (`Pen-Papers`) | SharkPool | `SPpenPapers` | ? | ✓ | ○ | ○ | ? | — | — | ? | drawing, sensing, hidden state |
| MIDI-Tools (`MIDI-Tools`) | SharkPool | `ObscurasMIDITools` | ? | ✓ | ○ | ○ | ? | — | ○ | ? | threads, sound |

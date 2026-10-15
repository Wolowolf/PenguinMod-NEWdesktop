# EXTENSION-RISKS.md — which extensions a change could disturb

Used by the CLAUDE.md "Extensions" rule: Grep the area (heading) or the extension's name, then decide whether to test. A name here means the extension's code reaches into that part of the engine, and how; it does not mean it will break. Galleries: `pm` PenguinMod, `tw` TurboWarp, `sp` SharkPool; built-in: `vm`. Names are file names (pm/tw: path without `.js`, sp: file name, vm: extension ID).

**How this was made (Session 62, 2026-10-10; Session 66, 2026-10-11, Sessions 67–68, 2026-10-11, removed extensions taken out; Session 85, 2026-10-15, web-page-only extensions removed), only extensions still present (135):** vm 17 = every extension registered in the VM's `extension-manager.js`, all in the extension library (the 11 hidden ones were removed in Session 68); pm 32 = the 30 in `src/lib/extensions.js` + 2 the extension library lists from the PenguinMod gallery folder (`SharkPool/Sound-Waves`, `SharkPool/Tile-Grids`); tw 51 = `extensions/extensions.json`; sp 35 = `Gallery Files/Extension-Keys.json` without `Example` and deprecated ones (what the Extensions tab lists, `galleries.js`). A script (`C:\Users\elias\Documents\PenguinMod-test\scan-extensions.mjs <out.txt>`, uses the local test's checkouts) printed for each one the lines that touch engine internals (replaced functions, runtime events, frame loop, renderer, stage size, touching, compiler, threads, variables, sound, input, clones); those lines were read, and the heavy ones (renderer, frame loop, compiler, scheduler, sensing) checked in the code. Bundled libraries inside an extension (maths.js in `pmOperatorsExpansion`, Box2D, GIF, MIDI, QR, Pizzicato) were not read. Redo after moving to newer upstream or adding/removing extensions.

**Most exposed** (replace engine functions in several areas): pm `Gen1x/iris-text` · tw `obviousAlexC/penPlus`, `Xeltalliv/simple3D`, `Xeltalliv/clippingblending`, `lab/video-sprites`, `pointerlock` · sp `Extra-Controls`, `Messages-Plus`, `My-Blocks-Plus`, `Temporary-Variables`, `Particle-Engine`, `Turbo-Skins`, `Scenes` · vm `pmEventsExpansion`.

## Already overridden by this app (facts, not risks)
- Section 21 forces `maxClones: Infinity`, `miscLimits: false`, `fencing: false`, `dangerousOptimizations: true` (`PM_ALWAYS_ON` in the VM's `runtime.js`, re-applied on every `setRuntimeOptions`) and high quality pen (`setUseHighQualityRender` ignores its argument). So these blocks set nothing: tw `runtime-options` (clone limit, fencing, misc limits, high quality pen), sp `Scenes` (restores fencing / misc limits), vm `pmCamera` (switches fencing off at load). They still read back the forced values. `disableOffscreenRendering`, `disableDirectionClamping`, warp timer, turbo mode and frame rate still change.
- Interpolation is gone (`vm.setInterpolation` and `runtime.setInterpolation` are empty, sections 21 and 41): tw `runtime-options`' interpolation switch and sp `Scenes` do nothing there; sp `Particle-Engine` (and `Scenes`) reads `runtime.interpolationEnabled`, which stays off.
- vm `pmMotionExpansion` calls the renderer's `getFencedPositionOfDrawable` itself, so its own fencing still works (reasoned, not run).

## No extension at risk
Strong GPU · higher memory limit · Wasm for a few slow parts · heavy jobs in workers · GPU calculations · tilemaps, GPU particles, physics engine, 3D, saving, multiplayer, text scripting, performance hints (new features; only clash if they copy an extension's block names or extension ID).

## Frame loop and timing
Full speed in background · frames above refresh rate · fixed time step (deterministic mode) · logic/drawing threads.
- Replace or wrap the step: tw `pointerlock` (wraps `runtime._step` to reset mouse movement each frame), `TheShovel/ShovelUtils` (wraps `runtime._step` to count frames per second).
- Run a step on demand: sp `Sharktilities` (blocks call `runtime._step()` and `frameLoop.stepCallback()`).
- Listen to every frame (`BEFORE_EXECUTE` / `AFTER_EXECUTE` / `RUNTIME_STEP_START`): vm `pmEventsExpansion`, `jgTailgating` (followers) · pm `Gen1x/lighting` (redraws its light canvas after each frame), `Gen1x/beat_sync` · tw `obviousAlexC/penPlus`, `lab/video-sprites`, `Lily/Video`, `XeroName/Deltatime`, `godslayerakp/ws`, `TheShovel/ColorPicker` · sp `Turbo-Skins` (swaps skins before and after the scripts run), `Animations`, `Speech-Bubbles`, `Extra-Controls`, and `Sharktilities`, `Hyper-Sense-V2`, `KeysPlusV2`, `Variables-Expanded` (start their own hats every frame).
- Read frame rate / step time: vm `videoSensing` · tw `XeroName/Deltatime` (`1 / framerate` or measured time), `runtime-options`, `TheShovel/ShovelUtils` · sp `Animations` and `Tune-Shark-V3` (`runtime.currentStepTime`), `Scenes`.
- Change frame rate / turbo mode: tw `runtime-options` · sp `Scenes`.
- Own timers outside the frame loop (`requestAnimationFrame`, screen rate, not project rate): vm `pmEventsExpansion` · pm `Gen1x/iris-text` (character animations), `Gen1x/beat_sync`.
- Read the project clock's pause state: sp `Particle-Engine` and `Animations` (`clock._paused`).

## Drawing (renderer)
Skip redraw · batched drawing · shaders and lights · WebGPU renderer · logic/drawing threads.
- Replace renderer or Drawable functions: tw `Xeltalliv/clippingblending` (replace `renderer._drawThese`, `createPenSkin` and the pen skin's `_flushLines`; add `Drawable.prototype.getUniforms`, `updateClipBox`, `updateBlendMode`) · tw `Xeltalliv/simple3D` (replaces `renderer.draw`; own WebGL drawing on the shared context into its own drawable), `obviousAlexC/penPlus` (replaces `renderer.penClear`; draws triangles with its own shaders into the pen skin's framebuffer, shared context), `stretch` (replaces each target's `_getRenderedDirectionAndScale`) · sp `Particle-Engine` (replaces `Drawable.prototype.getUniforms`; own skins with framebuffers).
- Make or swap skins directly: vm `pen` · pm `Gen1x/iris-text` (own BitmapSkin subclass written into `_allSkins`, own shaders), `pooiod/VideoSharing` (screen or camera into bitmap skins) · tw `lab/video-sprites` (own video Skin), `Lily/Video` (video BitmapSkins), `Lily/LooksPlus`, `Lily/lmsutils` (`updateSVGSkin` on costumes), `cursor` (reads costume skins) · sp `Turbo-Skins` (writes `_allSkins`, `updateDrawableSkinId`), `Camera-Sensing-Plus` (sets `drawable._skin` to the video skin), `Pen-Papers` (extra pen layers, `setRenderQuality`), `Layer-Control` (re-orders `_drawList`, pen and video layers), `Animations` (drawable `updateScale`), `Sprite-Effects-V2` (reads skins with `readPixels`), `Sharktilities` (`extractDrawableScreenSpace`), `Scenes` (copies the pen skin).
- Own canvas over the stage, not the renderer: pm `Gen1x/lighting` (own WebGL2 canvas layered on the stage, redrawn after each frame from sprite positions) · overlays (`renderer.addOverlay`): tw `TheShovel/ColorPicker`, `obviousAlexC/SensingPlus` · sp `Rigidbodies` (debug boxes), `Files-Expanded` · CSS or SVG filters on the stage canvas: tw `TheShovel/CanvasEffects` (also calls `renderer.resize`), sp `Sprite-Effects-V2`.
- Snapshots and stage pixels: vm `jgPrism`, `sharkpoolPrinting`, tw `Lily/LooksPlus` (`requestSnapshot`) · vm `pmSensingExpansion`, sp `Hyper-Sense-V2` (`extractColor` at a point).
- Native size / quality: tw `obviousAlexC/penPlus`, `Xeltalliv/simple3D`, sp `Pen-Papers` (`_nativeSize`, `useHighQualityRender`).

## Camera and stage size
- Built-in camera: vm `pmCamera` (moves sprites through the VM's `runtime.updateCamera`, binds the mouse to the camera; the renderer gets normal positions).
- Change the stage size: tw `runtime-options` · sp `Scenes` · tw `TheShovel/CanvasEffects` (renderer canvas only).
- Convert with the stage size or follow its changes: tw `obviousAlexC/penPlus` (`STAGE_SIZE_CHANGED`), `CubesterYT/KeySimulation`, `TheShovel/CustomStyles`, `CubesterYT/WindowControls`, `obviousAlexC/SensingPlus` · pm `Gen1x/lighting` · vm `pmEventsExpansion` · sp `Particle-Engine`, `Sprite-Effects-V2`, `Variables-Expanded`, `Hyper-Sense-V2`.
- Mouse position: tw `pointerlock` (rewrites mouse x/y and wraps the mouse's `postData`), `CubesterYT/KeySimulation` (posts mouse and key input) · sp `Hyper-Sense-V2`, `KeysPlusV2`.

## Collision and sensing
Per-frame sensing cache · faster collision / hitboxes.
- Sections 39–42 cache: no present extension replaces a function on its safety list (`touchingCacheOriginals` in Render's `RenderWebGL.js`), so the cache stays on with all of them. Prototype changes that are not on the list: `clippingblending` (both copies) and sp `Particle-Engine` (`getUniforms`, drawing only); tw `Xeltalliv/simple3D` wraps `setHighQuality` on its own drawable only.
- Change what touching sees: sp `Turbo-Skins` (swaps each drawable to its hitbox skin for the scripts, then back, through `updateDrawableSkinId`), `Camera-Sensing-Plus` (skin swapped without the setter; handled by section 40's full check), `Animations` (drawable `updateScale` directly) · tw `stretch` (stretched scale through the VM).
- Call touching functions a lot (the cache helps them): tw `Lily/ClonesPlus`, `obviousAlexC/SensingPlus` (`isTouchingDrawables`, `isTouchingPoint`) · sp `Hyper-Sense-V2`, `Pen-Papers` · tw `Lily/lmsutils` (touching mouse).
- Read Drawable internals directly: vm `pmMotionExpansion` (`getFastBounds`, `drawable.isTouching` for points), `videoSensing` (motion per sprite) · tw `lab/face-sensing` (`drawable.isTouching`), `box2d` and pm `pooiod/Box2D` (`_getConvexHullPointsForDrawable` for body shapes) · sp `Rigidbodies` and `Lazy-Collisions` (own box maths from `getBounds`).
- sp `Lazy-Collisions` replaces `Runtime.prototype.getSpriteTargetByName` (calls the original, section 39's faster one, then falls back to looking up by ID).

## Compiler
Remembered results · work before the game runs · type tracking · inlining custom blocks · strict mode · pre-compiled scripts · compiling to Wasm.
- Register compiled blocks (`getCompileInfo`, own IR / JS kinds): vm `jwProto`, `pmControlsExpansion`, `pmOperatorsExpansion` · pm `Div/divVecQuat`, `Gen1x/iris-text`. Several write `compiler.source` directly. None registers an `op.*` kind, so sections 44–45 folding stays on with all of them (`pmOperatorsExpansion`'s 11 kinds are folded since section 45).
- Replace compiler class functions: sp `Temporary-Variables`, `My-Blocks-Plus` (also `isLastBlockInLoop`) (`ScriptTreeGenerator` and `JSGenerator` `descendInput` / `descendStackedBlock`), `Extra-Controls` (`descendStackedBlock` only). They wrap section 44's folding `descendInput` from outside; a folded child reaches them as an equal fixed value. They find the classes through `vm.exports` (`i_will_not_ask_for_help_when_these_break`, `JSGenerator`, `IRGenerator`); renaming those breaks them.

## Threads and scripts
Parallel blocks · automatic parallel clones · debugger · event-driven hats.
- Replace scheduler functions: sp `Messages-Plus` (`startHats`, `_restartThread`), `Extra-Controls` (`_restartThread`, `Blocks.prototype.getNextBlock` / `getBranch`) · `runtime.visualReport` (editor value bubbles only): pm `ObviousAlexC/3DMath`, sp `Extra-Controls`.
- Make threads by hand (`_pushThread`, `runtime.threads.push`): vm `pmEventsExpansion` · sp `Tune-Shark-V3`.
- Change thread fields (status, target, stack frames): sp `Extra-Controls`, `My-Blocks-Plus` (also swaps a target's `getNextBlock` for a while), `Sharktilities` · tw `godslayerakp/ws` (sets status done) · vm `jgTween` (walks `runtime.threads`), `pmControlsExpansion` (`_restartThread` in compiled code).
- Hats checked every frame (edge-activated, pattern scan): vm `videoSensing`, `pmEventsExpansion` (`whenTrueFalse`, `whenKeyAction`) · pm `Gen1x/beat_sync`, `steve0greatness/timers`, `electricfuzzball_pm/MIDI` · tw `lab/face-sensing`, `Lily/lmsutils`, `Lily/ClonesPlus`, `cloudlink` · sp `MIDI-Tools`. Most other extension hats are started from events with `startHats`.
- Section 63 (hats checked only when their answer can change): applies only to the built-in "when <>" and "when timer >" with conditions made of numbers, text, variables, x/y/direction and plain operators; extension hats and conditions with extension blocks are checked every frame as before. Changes are found by comparing values, so extensions that write variables or sprite fields directly (`Scenes`, `ShovelUtils`, ...) are noticed; variables holding objects (the types below) make the hat checked every frame. Extensions that replace `startHats` with their own copy (sp `Messages-Plus`) get the old every-frame checks while loaded.

## Lists, variables, data types
List index · typed variables · real data types.
- Write list or variable values directly: tw `Lily/ListTools`, `qxsck/var-and-list`, `TheShovel/ShovelUtils`, `Xeltalliv/simple3D` (reads lists as vertex data) · sp `Scenes` (restores values), `Variables-Expanded`, and reads of clone variables in `Lazy-Collisions`, `Extra-Controls`, `Hyper-Sense-V2` · tw `Lily/ClonesPlus`.
- Section 62 (list lookup tables): any read or write of a list's `value` (the extensions above, code generated by compiler-patching extensions, the editor's list monitor edits) turns that list's table off until the engine itself gives the list a new array (delete all, loading); such lists are searched item by item as before. Lists holding objects (the types below) get no table either.
- Objects in variables (`registerSerializer`, own types): vm `jwColor` · pm `Div/divVecQuat`, `steve0greatness/timers` (timer variables).
- Page-wide changes to built-in types: sp `Extra-Controls` (`Error.prototype.constructor`).

## Sound
Mixer channels, effects, positional sound.
- Use the engine's audio: vm `music`, `pmSensingExpansion` (loudness) · pm `Gen1x/beat_sync` (engine's AudioContext), `SharkPool/Sound-Waves` (engine's context and input node) · tw `Lily/SoundExpanded` (sets the engine's master volume `inputNode.gain`), `Lily/Video` (follows it) · sp `Spotify` (engine's input node).
- Own audio: pm `PuzzlingGGG/ttsrV2` · sp `Tune-Shark-V3` (own audio library), `Recording-V2` (microphone), `Newgrounds-Audio`, `MIDI-Tools` · vm `jgPrism`.

## Input
Named actions, gamepads, mouse lock, key released: vm `pmSensingExpansion`, `pmEventsExpansion` · tw `pointerlock`, `CubesterYT/KeySimulation` (posts key input to the VM), `veggiecan/mobilekeyboard`, `cursor`, `Lily/lmsutils` · sp `KeysPlusV2`, `Hyper-Sense-V2` (own key listeners on the window), `Extra-Controls` (keybinds: posts keyboard input, reads `_keysPressed`), `Popup-Phoenix` (`KEY_PRESSED`), `Gamepad-Expanded` (`navigator.getGamepads`) · pm `gaimerI17/DeviceMotion`, `electricfuzzball_pm/MIDI`, `pooiod/Dictation`.

## Clones and sprites
Parent/child sprites · automatic parallel clones.
- Wrap clone creation: tw `lab/video-sprites`, `Xeltalliv/clippingblending` (`makeClone`).
- Manage clones and sprites: tw `Lily/ClonesPlus` · vm `jgTailgating` · sp `Sprite-Parenting`, `Scenes` (saves and restores every target), `Lazy-Collisions` · pm `SharkPool/Tile-Grids`.
- Write target fields without the setters: sp `Scenes` (x, y, size, direction, effects, costume, visibility), `Sharktilities` (volume) · vm `pmMotionExpansion` (volume).

## Editor (blocks library)
Category menu (sections 11, 13, 55) · block shapes · workspace.
- sp `My-Blocks-Plus` wraps `Toolbox.prototype.scrollToCategoryById`, `BlockSvg` `setDragging` / `setParent`, `Block.unplug`, `Gesture.duplicateOnDrag_` (check with sections 11 and 13 if the category menu changes) · `BlockSvg.prototype.render` (block look): sp `Particle-Engine`, `Rigidbodies`, `SoundCloud-API`, `Color-Master`.

## Engine moved off the page
Engine in a worker · new engine (Rust/C++, native player, Godot).
- Use the page (DOM, window, canvas): 70 of 135 (vm 7, pm 20, tw 20, sp 23; scan of Session 85), e.g. tw `pointerlock`, `cursor`, `TheShovel/CustomStyles`, `TheShovel/CanvasEffects` · sp `Popup-Phoenix`, `Speech-Bubbles` · pm `Gen1x/lighting` · vm `pen`.
- A new engine without JavaScript: every extension named in this file needs a rewrite. The ones that could not exist there at all (JavaScript, HTML iframe Elements, Iframe, DOM Selector, Search Params, WindowHasher) and the web-only parts asked about with them (YouTube Operations, Twitch, the jgPrism eval, ShovelUtils load extension and Lily's Toolbox project URL blocks) were removed in section 85.

## Shared memory headers (reasoned, not scanned)
The two security headers block images, sounds and frames from other websites unless those sites allow it: tw `Lily/Video`, `lab/face-sensing` (loads its model from a CDN) · sp `Spotify`, `SoundCloud-API`, `Newgrounds-Audio` · pm `pooiod/VideoSharing`. Most of these need servers the app already refuses.

## Rewind and deterministic mode
- Hidden state (can't be rewound): physics (tw `box2d`, pm `pooiod/Box2D`, sp `Rigidbodies`), tweens and animations (vm `jgTween`, sp `Animations`, `Particle-Engine`), timers (pm `steve0greatness/timers`, `Gen1x/beat_sync`), GPU buffers (tw `Xeltalliv/simple3D`, `obviousAlexC/penPlus`, sp `Pen-Papers`), the object types above.
- Random numbers (`Math.random`, seeding needed): 26 of 135 (vm 1, pm 5, tw 8, sp 12; scan of Session 85).

## Self-contained (own blocks only: values, text, network, page; no engine internals)
vm `shovellzcompresss`, `iygPerlin` · pm `pooiod/Dictation`, `MikeDev101/e2ee`, `MikeDev101/webrtc`, `MubiLop/penguinhook`, `MubiLop/numutils` (+ Format Numbers' short notation, Session 67), `qxsck/big-decimal`, `Gen1x/random_utils`, `MubiLop/toastnotifs`, `RubyDevs/turboweather`, `bruhbeast-pixel/CockatielLocation`, `NamelessCat/corsproxy`, `Embin/embintranslation`, `MubiLop/yeetyourfiles`, `Codefoxy/cfupload`, `Ikelene/googleAuthExtension`, `NotHouse/DiscordAuth`, `DogeisCut/Resolution`, `gaimerI17/crypto`, `MubiLop/spritesheeter` · tw `text` (string blocks, not drawing), `local-storage`, `true-fantom/base`, `bitwise`, `Skyhigh173/bigint`, `utilities`, `Clay/htmlEncode`, `clipboard`, `XmerOriginals/closecontrol`, `navigator`, `battery`, `mdwalters/notifications`, `encoding` (+ Numerical Encoding V2 as its "Numbers" choice, Session 67), `cloudlink`, `true-fantom/network` (+ HTTP's request/response headers and multipart forms, Session 67), `true-fantom/math`, `SharkPool/Font-Manager`, `DNin/wake-lock`, `CST1229/zip`, `NOname-awa/graphics2d`, `veggiecan/LongmanDictionary`, `steamworks`, `itchio`, `Medericoder/textcase` · sp `Geolocation`, `QR-Codes`, `Time-Calculation`, `SVG-Spritesheets`, `GIF-Manager`. These can only break through a change to how blocks get their inputs (type conversion, `Scratch.Cast`) or to the extension loader.

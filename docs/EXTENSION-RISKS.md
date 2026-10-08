# EXTENSION-RISKS.md — which extensions a change could disturb

Used by the CLAUDE.md "Extensions" rule: Grep the idea's heading, then decide whether to test. A name here means the extension's code reaches into that part of the engine, not that it will break.

**How this was made (2026-10-08):** a text-pattern scan of every `.js` file (not read line by line) of the built-in extensions (VM `src/extensions`, 92) and the three galleries at the `upstream.json` commits: PenguinMod (`static/extensions`, 110), TurboWarp (`extensions`, 135), SharkPool (`extension-code`, 83). Names are file/folder names. Minified or unusual code can be missed. A few names under Input, data types and shared memory were added for what the extension is for, not from a code match. Galleries: `pm`, `tw`, `sp`; built-in: `vm`. Redo the scan after moving to newer upstream.

**Most exposed overall** (hook several engine parts): tw `box2d`, `text`, `simple3D`, `cameracontrols`, `Camera`, `video-sprites`, `penPlus`, `clippingblending`, `SensingPlus` · sp `Camera`, `Particle-Engine`, `Events-Plus`, `Extra-Controls`, `Pause-Utilities`, `Hyper-Sense(-V2)`, `Looks-Expanded`, `Script-Control` · pm `Pause-Utilities`, `iris-text`, `PenPlus`, `lighting`, `qoan-renderer` · vm `gsa_canvas`, `dt_cameracontrols`, `jg_runtime`, `xeltalliv_clippingblending`, `pm_sensingExpansion`.

## No extension at risk
Strong GPU · higher memory limit · Wasm for a few slow parts · heavy jobs in workers · GPU calculations · tilemaps, GPU particles, physics engine, 3D, saving, multiplayer, text scripting, performance hints (new features; only clash if they copy an extension's block names).

## Frame loop and timing
Full speed in background · frames above refresh rate · fixed time step (deterministic mode) · logic/drawing threads.
- Hook the frame/step loop: vm `jg_runtime`, `jg_animation`, `jg_audio`, `jg_tailgating`, `pm_eventsExpansion` · pm `PenPlus`, `lighting`, `Pause-Utilities`, `Animations`, `Speech-Bubbles`, `BeepBoxPlayer`, `beat_sync`, `shoveldebugger` · tw `Deltatime`, `when`, `gamepad`, `MoreEvents`, `ShovelUtils`, `pointerlock`, `text`, `video-sprites`, `sound`, `Tune-Shark-V3` · sp `Particle-Engine`, `Animations`, `Pause(-Utilities)`, `Script-Control`, `Events-Plus`, `Sharktilities`, `Tune-Shark(-V3)`, `KeysPlusV2`, `Turbo-Skins`.
- Read frame rate / delta time: vm `jg_runtime`, `pm_sensingExpansion`, `scratchLab_animatedText` · tw `Deltatime`, `runtime-options`, `ShovelUtils`, `Camera`, `cameracontrols` · sp `Runtime-Events`, `Sharktilities`, `Particle-Engine`, `Sprite-Effects(-V2)`, `Display-Text-V2`.

## Drawing (renderer)
Skip redraw · batched drawing · shaders and lights · WebGPU renderer · logic/drawing threads.
- Replace or reach into drawing / shaders: vm `dt_cameracontrols`, `xeltalliv_clippingblending`, `jg_vr`, `pm_sensingExpansion`, `scratch3_pen`, `gsa_canvas`, `jg_3d` · pm `lighting`, `PenPlus`, `qoan-renderer`, `sensingV3Archival`, `gpusb3` · tw `cameracontrols`, `Camera`, `clippingblending`, `simple3D`, `text`, `video-sprites`, `penPlus`, `SensingPlus`, `ar` · sp `Camera`, `Particle-Engine`, `Looks-Expanded`, `Renderer-Control`, `Layer-Control`, `Hyper-Sense(-V2)`, `Turbo-Skins`, `Pen-Papers`, `QR-Codes`.

## Camera
- Already change the view or stage size (would clash): vm `dt_cameracontrols`, `pm_camera`, `jg_3d`, `jg_runtime` · pm `PenPlus` · tw `cameracontrols`, `Camera`, `runtime-options`, `simple3D`, `ar`, `penPlus` · sp `Camera`, `Camera-Sensing-Plus`, `Scenes`, `Looks-Expanded`, `Pen-Papers`, `Niche-Toolbox`.
- Mouse position users: tw `pointerlock`, `cursor` · sp `KeysPlusV2`, `Hyper-Sense(-V2)`, `Popup-Phoenix` · vm `jwVector`.

## Collision and sensing
Per-frame sensing cache · faster collision / hitboxes.
- Replace touching checks: tw `cameracontrols`, `Camera` · sp `Camera`, `Looks-Expanded`, `GIF-Manager`.
- Done (sections 39–40, 42): the sensing cache switches itself off when an extension replaces Drawable bounds/transform methods (sp `Looks-Expanded` does) and re-checks skins swapped directly (sp `Camera-Sensing-Plus`). sp/tw `Camera` works with the cache since section 42 (its precision mode uses hidden shadow drawables). Tested in Sessions 40 and 42: answers identical with the cache on and off.
- Read collision internals: vm `pm_motionExpansion`, `gsa_canvas`, `xeltalliv_clippingblending`, `scratch3_video_sensing` · pm `sensingV3Archival`, `Box2D`, `iris-text` · tw `box2d`, `SensingPlus`, `ClonesPlus`, `moremotion`, `images`, `Skins`, `text`, `video-sprites` · sp `Hyper-Sense(-V2)`, `Lazy-Collisions`, `Rigidbodies`, `Sprite-Panel`, `Particle-Engine`, `Turbo-Skins`, `Pen-Papers`, `Scenes`.

## Compiler
Remembered results · work before the game runs · type tracking · inlining custom blocks · strict mode · pre-compiled scripts · compiling to Wasm.
- Hook the compiler: vm `jwArray`, `jwLambda`, `jwScope`, `gsa_tempVars`, `gsa_canvas`, `jg_dev`, `pm_controlsExpansion`, `pm_operatorsExpansion` · pm `More-Types`, `ScopeVars`, `divIterators`, `divVecQuat`, `divAlgEffects`, `agBuffer`, `dogeiscutObject`, `iris-text` · tw `simple3D` · sp `Events-Plus`, `Extra-Controls`, `JSON-Array`, `My-Blocks-Plus`, `Temporary-Variables`, `Captchas` (replaces block functions).
- Done (section 44): calculations on fixed values only (`+ - * / mod`, rounding, maths functions, comparisons, and/or/not, join, length, letter of, contains) are worked out at compile time with the scripts' own helpers; same answers and types (500,000 random calculations and 4 generated projects tested), anything touching variables, lists, timer, random, sprites or extensions is untouched. Hooks above get an equal-valued input for folded child calculations; a hook for kind `op.*` itself switches folding off. Since section 45 the same for vm `pm_operatorsExpansion`'s 11 compiled calculations and the expandable math / and-or / compare blocks.
- Inlining custom blocks also: thread/stack users below.

## Threads and scripts
Parallel blocks · automatic parallel clones · debugger · event-driven hats.
- Touch threads or the scheduler: vm `jg_runtime`, `jg_scripts`, `jg_dev`, `lily_tempVars2`, `jw_structs`, `sp_javascriptV2`, `pm_controlsExpansion` · pm `Pause-Utilities`, `shoveldebugger`, `gpusb3` · tw `MoreEvents`, `Messages-Plus`, `TempVariables2`, `ListTools`, `tween` · sp `Script-Control`, `Script-Management`, `Pause(-Utilities)`, `Events-Plus`, `Runtime-Events`, `Messages-Plus`, `Advanced-Messages`, `My-Blocks-Plus`, `Sharktilities`.
- Hats checked every frame (event-driven hats): vm `scratch3_video_sensing`, `scratch3_makeymakey`, `GamepadExtension`, `scratch3_speech2text`, `lmsutilsblocks`, hardware (`boost`, `ev3`, `wedo2`, `microbit`, `gdx_for`), `jg_iframe`, `jg_prism`, `jw_unite` · pm `timers`, `MIDI`, `cloudlink`, `beat_sync`, `BeepBoxPlayer`, `sensingV3Archival` · tw `MoreTimers`, `ClonesPlus`, `lmsutils`, `face-sensing` · sp `MIDI-Tools`, `Pixel-Utilities`.

## Lists, variables, data types
List index · typed variables · real data types.
- Edit list values directly: vm `gsa_canvas`, `jg_dev`, `silvxrcat_oddmessages` · pm `agBuffer`, `PenPlus` · tw `ListTools`, `var-and-list`, `penPlus`, `simple3D`.
- Put objects in variables (typed variables, data types): vm `jwArray`, `jwVector`, `jwNum`, `jwColor`, `jwDate`, `jwTargets`, `jw_structs` · pm `More-Types`, `dogeiscutObject`, `dogeiscutSet` · sp `JSON-Array`.

## Sound
Mixer channels, effects, positional sound.
- vm `scratch3_music`, `jg_audio`, `jg_bestextensioin` · pm `turbosynth`, `BeepBoxPlayer`, `beat_sync`, `libxmp`, `Sound-Waves`, `Recording` · tw `sound`, `SoundExpanded`, `audiostream`, `Tune-Shark-V3`, `Video` · sp `Tune-Shark(-V3)`, `Sound-Waves`, `Recording(-V2)`, `Pause(-Utilities)`.

## Input
Named actions, gamepads, mouse lock, key released: vm `GamepadExtension`, `scratch3_makeymakey` · tw `gamepad`, `pointerlock`, `KeySimulation`, `when-key-pressed*`, `mobilekeyboard` · sp `KeysPlusV2`, `Better-Input` · pm `BetterInput`.

## Clones and sprites
Parent/child sprites · automatic parallel clones: vm `jg_tailgating`, `jg_clones`, `jwTargets` · tw `ClonesPlus` · sp `Sprite-Parenting`, `Layer-Control`, `Sprite-Panel` · pm `Sprite-Linking`, `Tile-Grids`.

## Engine moved off the page
Engine in a worker · new engine (Rust/C++, native player, Godot).
- Use the page (DOM, canvas): about 160 of 420 (vm 33, pm 54, tw 26, sp 47), e.g. tw `files`, `iframe`, `pointerlock`, `cursor`, `text`, `CustomStyles` · sp `Display-Text(-V2)`, `DOM-Selector`, `Popup-Phoenix` · vm `jg_iframe`, `tw_files`, `scratch3_pen`.
- A new engine: every extension listed in this file, plus any that calls the VM directly.

## Shared memory headers (reasoned, not scanned)
The two security headers block images, sounds and frames from other websites unless those sites allow it: tw `iframe`, `images`, `Skins`, `Assets`, `audiostream` · vm `jg_iframe` · sp `SoundCloud-API`, `Spotify`, `Community-Spotlight` · pm `Spotify`, `VideoSharing`. Most of these need servers the app already refuses.

## Rewind and deterministic mode
- Hidden state (can't be rewound): physics (tw `box2d`, pm `Box2D`, sp `Rigidbodies`), tweens and animations, timers, `Particle-Engine`, `simple3D`, data-type extensions above.
- Random numbers (`Math.random`, seeding needed): 74 of 420 (vm 11, pm 23, tw 13, sp 27).

# Bench baseline on game-shaped projects (Session 170, 2026-10-30)

Where the time goes in the engine after sections 36–162, measured to rank the next speed changes. Tool: `bench\game-bench.mjs` (local test folder; how: `docs/PROCEDURES.md` "Game benchmark"). Build: current `main` (GUI `47b7237`, VM `0278b3d`, Render `bbe61e2`), test app, 60 FPS limit, RTX 4060, 3 runs per project, page reloaded before each run. Raw result: `bench\results\game_20261029_234646_baseline-main.json`.

**UNRELIABLE:** the PC was busy before the runs (27% CPU idle load), so absolute milliseconds may be high. The shares (which part of a frame is biggest) were the same in a 1-run trial before, so the ranking below should hold; repeat on an idle PC before comparing exact numbers.

## Projects (made by `bench\make-projects.mjs`, deterministic, no random numbers)

| # | Project | What it does |
|---|---|---|
| 25 | bouncing-clones | 10,000 clones moving 4 steps + "if on edge, bounce" every frame |
| 26 | bullet-hell | 2,000 bouncing bullet clones, each asking "touching Player?"; player moves on a fixed path |
| 27 | raycaster | stage only: 320 rays per frame stepped through a 32 × 32 map list, distances into a list |
| 28 | tile-map | 400 × 18 level in one list, scrolling, 468 tile clones picking costumes from it, 200 walkers colliding with tiles |
| 29 / 30 | custom-blocks | 3,000 hidden clones, 9 custom-block calls each per frame; 29 normal, 30 "run without screen refresh" |
| 31 | physics | Box2D Physics (griffpatch), 300 circle bodies in a boxed stage |
| 33 | pen | one sprite: clear, 2,000 lines and 100 stamps every frame |
| 34 | sound | 50 hidden clones, each starting a 0.2 s sound every frame (test app muted, audio running) |
| 35 | say-bubbles | 200 clones whose say text changes every frame |
| 36 | broadcasts | one broadcast heard by 5,000 hidden clones and 20 nobody hears, every frame |
| 37 | big-project | 106 MB: 200 sprites, each 10 SVG and 1 256 × 256 PNG costume (resolution 1), a 1 s sound, 40 scripts of 25 blocks; for load and memory |
| 46 | player-vs-bullets | one Player asking "touching Bullet?" once per frame, 2,000 Bullet clones moving (`gridBullets`) |
| 47 | swarm | 2,000 bouncing clones, each asking about its own sprite after moving; most overlap a neighbour (`gridSwarm`) |
| 48 | swarm-sparse | 1,000 small clones on a wide lattice, all moving together, never touching: the case a grid helps most (`gridSparse`; stays apart up to about ×4, reasoned) |
| 49 | swarm-packed | 1,000 large clones stacked in a 16 × 16 area, nearly all real candidates: the case a grid cannot help (`gridPacked`) |
| 50 | swarm-churn | about 2,000 clones asking about their own sprite, 20 made per frame and the oldest deleted, so the list keeps changing (added while building the grid) |

## Words used in the tables (Session 170's own table: raw file above)

Words: **frame** = time from one frame to the next (16.0 = the 60 FPS limit); **p99** = the slowest 1% of frames take at least this long (stutter); **work** = time the engine is busy inside a frame; **GC** = garbage collection, the JavaScript engine pausing to clean up memory no longer used (ms per second, and the longest single pause); **load** = `vm.loadProject`; **first** = from load start to the end of the first frame after the green flag (it creates the clones; for 25 that first frame alone took ≈ 420 ms); **split** from the engine's profiler (scripts = running blocks, touching = inside the touching checks, draw = the renderer drawing, rest = the step's own bookkeeping); **heap / live** = JavaScript memory after 30 s, as is / after a forced clean-up. GPU memory and GPU time are not measured: "draw" is the main-thread time spent handing the drawing to the graphics card.

## Windows idle mode spoils benchmarks (Session 179)

Solved in Session 181. When Windows turned the screen off after no input (System log, Kernel-Power 566, `NextSessionType` 1), Chromium counted the window as covered and put the page's process in the background: 25 fell from 62.5 to 45-47 FPS (about 40 before section 169), recovering at once on input. All with the screen off: `--no-concurrent-recompilation`, `--no-concurrent-sparkplug`, `--single-threaded-gc`, power throttling off + High priority, `disable-background-timer-throttling` stayed at about 45; `disable-renderer-backgrounding`, `disable-backgrounding-occluded-windows` and `disable-features=CalculateNativeWinOcclusion` each gave 62.5. The app now sets the first (`app/electron-main.js`), and the built app measured 62.5 with the screen off. The number in event 566 is a counter, not a state. Earlier "busy PC" results may partly be this.

## Idle baseline (Session 179; 3 runs, build VM `4e2f831`, Render `b193075`, GUI `47b7237`)

Marked UNRELIABLE for one moment only (CPU 36% in one run of 32; idle before 15%). Max FPS = steps per second with no frame limit (2 runs). Raw: `bench\results\game_20261030_203126_idle-baseline.json`, `game_20261030_203543_uncapped-x1.json`.

| # | FPS | p99 | work | GC ms/s | GC max | load | first | scripts | touch | draw | other | max FPS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 62.3 | 19.4 | 12.3 | 9.9 | 7.6 | 117 | 538 | 9.4 | 0.0 | 2.0 | 0.7 | 75 |
| 26 | 62.5 | 17.7 | 3.5 | 3.3 | 0.9 | 108 | 258 | 2.2 | 0.9 | 0.4 | 0.8 | 308 |
| 27 | 62.5 | 17.7 | 1.1 | 1.3 | 8.5 | 169 | 295 | 1.0 | 0.0 | 0.0 | 0.0 | 1,016 |
| 28 | 62.5 | 17.6 | 0.6 | 1.2 | 0.8 | 153 | 293 | 0.2 | 0.0 | 0.3 | 0.1 | 2,167 |
| 29 | 62.5 | 17.7 | 1.1 | 1.6 | 0.7 | 142 | 289 | 1.0 | 0.0 | 0.1 | 0.2 | 1,239 |
| 30 | 62.5 | 17.7 | 1.0 | 1.6 | 0.8 | 129 | 267 | 0.7 | 0.0 | 0.1 | 0.2 | 1,218 |
| 31 | 62.5 | 17.7 | 1.5 | 0.5 | 0.8 | 122 | 254 | 0.7 | 0.0 | 0.1 | 0.0 | 1,494 |
| 32 (new: 100 clones made per frame, each deleted after 30 frames) | 62.4 | 18.7 | 9.1 | 17.4 | 10.0 | 118 | 222 | 7.8 | 0.0 | 1.2 | 0.8 | 122 |

## Headroom: how far each project grows at the 60 FPS limit (Session 179; 1 short run per size)

| # | Largest size tested that holds about 60 FPS | Next sizes (FPS) | Growth |
|---|---|---|---|
| 25 | ×1.25 (12,500 clones, 59.8) | ×1.5 52, ×2 36 | about linear |
| 26 | ×4 (8,000 bullets, 59.0) | ×6 26 (marked UNRELIABLE), ×8 30 | faster than size |
| 27 | ×16 (5,120 rays, 58.5) | ×24 42, ×32 34 | linear |
| 28 | ×64 (62.3) | ×96 59 | linear |
| 29 / 30 | ×8 (24,000 clones, 61.9) | ×16 about 32 | linear; ×24 and ×32 read 1.8 FPS, but they were probably still making clones (reasoned: the 500 ms limit of "run without screen refresh"), so not a real limit |
| 31 | ×2.5 (750 bodies, 61.7) | ×3 24, ×4 12 | much faster than size |
| 32 | ×1.5 (59.6) | ×2 41, ×3 19, ×4 11 | much faster than size |

Reading: the engine is limited by clones. Project 32 is the steepest, and `disposeTarget` is 63% of its allocation (7.8 MB per frame; `filter` on the target list, one per deleted clone, so more clones cost more per delete: the last part reasoned). Physics also has a cliff. Lists, rays and tile maps have ×16 or more to spare, so typed variables, a collision grid and an engine worker have no project that needs them yet.

## Why some frames of project 25 are slow (Session 179, `bench\frame-probe.mjs`)

- The earlier 25 ms p99 can be explained by Windows' idle mode or a busy PC (not proven per run). In the normal state p99 is 18–23 ms, varying by run.
- About 17.7 ms is the floor of every project: 28 has 0.6 ms of work, and its slowest frames are just late starts (18.2 ms at most). This is timer unevenness, not engine work.
- 25 uses 11–13 of its 16 ms, so any wobble goes over: 0.75–5.5% of frames are ≥ 18 ms. Those frames' scripts take 13–16 ms, the others 8–9 ms.
- Session 180: every frame during a full clean-up's marking is a spike (100%, 2–11 frames per run); quick clean-ups show no link (2–3% with or without); no code is thrown away in steady running (V8 log). Most of the rest is the PC's shared memory traffic: in spikes all functions slow together, and with no engine at all a memory-walking loop spikes (1.7–12.9% of rounds over 1.4×) while a maths loop never does (`noise-probe.mjs`; reasoned link, not separable per frame).
- After section 169 (less garbage, 3 runs, marked UNRELIABLE: 32% CPU before): 25 work 12.3 → 9.9 ms, p99 19.4 → 17.8, GC 9.9 → 4.7 ms/s; 32 work 9.1 → 7.4, p99 18.7 → 17.8. Garbage 10.7 → 3.3 MB per frame.

## Clone deleting and creating (Session 183, section 171; `bench\clone-prof.mjs`, `clone-parts.js`)

- Before, project 32 at ×2 (39 FPS): `stopForTarget` 25% (walked all threads, twice per delete), the "already running" check of `startHats` about 10%, removing from lists most of `dispose` and `disposeTarget`' 18%. `makeClone` itself 1.3%.
- After: ×2 62 FPS, ×4 60 FPS (was 11). Normal size, work 7.4 → 2.9 ms (the "before" run is marked UNRELIABLE), GC 15.2 → 9.2 ms/s. 25: first frame 538 → 375 ms, work about the same (9.9 → 10.1, no clones made or deleted while running). Deleting 3,000 clones one by one 88 → 6 ms; stop-all with 10,000 clones 791 → 30 ms; making 10,000 165 → 66 ms.
- Why no pool of clone objects: one clone costs 6.3 µs, of which the target object 0.7, the drawable 1.1, effects and variables 0.7 (not all reusable), so a pool saves at most about a third of a cost that is about 11% of project 32 at ×4, about 3% in all (reasoned from these times). The risk is real: `WeakMap`s and fields extensions keep per target would see a deleted clone come back as another one. Offer it again only if creation dominates a real project.
- What is left at ×4: `updateThreadMap` 15%.

## Clean-up pauses (Session 186, section 173; 40 s runs with Chrome's tracing, allocation sampling)

- 27 makes almost no garbage (0.03 MB per frame), so its one long pause was not about garbage: V8's memory reducer started a full clean-up about 26.5 s after the flag in 3 of 3 runs, 16-20 ms (a third of it compacting the page's C++ memory), frame gap 25-30 ms, one lost frame. With `--no-memory-reducer`: none in 3 of 3 runs, quick clean-ups in 40 s 37 → 3, GC 1.9 → 0.8 ms/s. Left: one full clean-up at about 8 s (load-time memory, global limit), 6-10 ms, as before; its frame gap varied 16-20 ms before and 20-25 ms after (3 runs each, likely timing, not explained).
- 25 before: 2.31 MB per frame: drawing 1,092 KB (3 arrays per sprite for the scale; batch lists regrown each frame), `_moveSteps` 394, thread list copies about 450. After: 0.79 MB. GC 3.1 → 1.4 ms/s, draw 2.1 → 1.7 ms, work 7.4 → 7.0 (`game-bench`; `bench.mjs` work 7.38 ±0.83 → 7.46 ±1.60, so the work change is within noise). Both before and after runs had 20-24% CPU idle load; the before run is marked UNRELIABLE.
- 25's "261 MB heap, 14-16 ms" from the ranking is out of date. Now: heap still climbs to about 280-300 MB in the first 21-25 s (V8's limit after load), then a 6 ms full clean-up, then 4 ms ones every 2-2.5 s, frame gap about 16 ms (they fit in the frame). Not lowered by this work; no frame lost after the first 2 s, except one 33 ms gap at 26 s in one run with an earlier build, cause not looked at.
- What is left in 25 (0.79 MB): `_moveSteps` 387 KB (numbers passed on to `setXY`, reasoned), generator results 196 KB and `stepThread` 138 KB (each compiled script's `yield`, reasoned). Removing them means changing how compiled scripts run or call `setXY`, which extensions wrap: not worth it at 1.4 ms/s.
- The profiler charges inlined functions to their caller, so "`_drawThese` allocates" misled: a matrix-copy helper changed nothing (reverted); replacing parts in the running app found the getter.

## Pen, sound, say bubbles, broadcasts, big project (Session 194; roadmap item #2)

3 runs, 2 without the frame limit for max FPS, build VM `0ce264a`, Render `56bde15`, GUI `8bcc339`. Both runs are marked UNRELIABLE (CPU 23% before the runs, 36% once during 35), so trust the sizes more than the exact milliseconds. Raw: `bench\results\game_20261031_233624_s194-areas.json`, `game_20261031_234103_s194-areas-uncapped.json`; causes: `bench\area-probe.mjs`.

| # | FPS | p99 | work | GC ms/s | GC max | load | first | scripts | draw | live MB | max FPS |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 33 pen | 62.5 | 17.8 | 1.9 | 1.8 | 0.9 | 106 | 242 | 1.3 | 0.1 | 44 | 472 |
| 34 sound | 61.9 | 20.1 | 1.3 | 4.9 | 15.6 | 118 | 207 | 1.2 | 0.1 | 41 | 473 |
| 35 say | 62.2 | 25.8 | 2.3 | 9.9 | 8.7 | 122 | 242 | 2.3 | about 9 | 108 | 81 |
| 36 broadcasts | 62.4 | 24.8 | 9.0 | 55.1 | 12.4 | 116 | 263 | 8.5 | 0.1 | 63 | 94 |
| 37 big project | 62.5 | 17.9 | 0.1 | 0.7 | 1.2 | 6,839 | 7,197 | 0.0 | about 1 | 451 | not run |

Work leaves out bubble drawing in 35 at the limit: it seems to be drawn outside the measured step (reasoned, not checked), so it is in the draw column (the capped split reads 8.8 draw, -8.8 other); without the limit work is 11.3.

- **Pen, sound: no problem.** Sound has a rare single clean-up (15.6 ms; 91 ms once without the limit), measured but not explained.
- **Say bubbles: about 45-50 µs per changed bubble at drawing** (9 to 9.9 ms for 200). Only matters with very many bubbles changing every frame; the p99 of 25.8 ms shows a stutter not explained here.
- **Broadcasts: the largest cost found.** One broadcast heard by 5,000 clones costs 6.6 ms (1.3 µs per clone: thread start and restart), with 55 ms/s of clean-up. One nobody hears costs 0.08 ms with 5,000 clones. So a broadcast index (name → scripts) saves at most the 1.7 ms of the 20 unheard here; cheaper thread starts are the better idea.
- **Big project: load is the problem, 6.8 s for 106 MB.** In the profile 2.9 s of 7.3 s is `toDataURL`, the browser encoding pictures back into PNG (bitmaps at resolution 1); noise PNGs are the worst case for this. After loading: 451 MB live, 1 GB heap before a clean-up. Not looked into further: how a real project's pictures compare.

## Big project load (Session 196, section 182)

3 runs each, same options, before = VM `01a9cb4`, after = `0a43cd1`. Project 38 is 37 with flat game-like pictures instead of noise. Raw: `bench\results\game_20261101_011330_s196-before.json`, `game_20261101_012436_s196-after.json`.

| project | load ms, before → after | first frame ms | live MB | heap MB (highest seen) |
|---|---|---|---|---|
| 37 noise pictures | 6,683 → 3,715 | 7,001 → 4,069 | 451 → 437 | 825 → 1,242 |
| 38 flat pictures | 5,068 → 3,279 | 5,360 → 3,541 | 359 → 355 | 672 → 847 |

- Profile before: `toDataURL` 2.8 s of 7.9 s (37), 2.2 s of 6.1 s (38): flat pictures gain too, so the change is worth it on realistic art.
- **Memory hardly changed;** the highest heap went up (not explained, possibly later clean-up). Not a gain of this change.
- **The cost moves, it doesn't vanish, for what is used:** first save of 38 8.3 s against 7.6 s (the 200 files are made then). If every sprite's current costume is such a picture, the sprite list asks for all of them: 200 took 2.8 s right after load, about what the load used to spend. Opening the costume tab does the same for that sprite.
- **Only pictures at resolution 1 gain.** A project saved by this app holds resolution 2 files, which already waited for first use (section 164). JPGs and other formats at resolution 1 still load the old way.
- What's left in the load: blocks and workspace work, each piece small; nothing cheap and safe stood out, so nothing else was changed.

## Broadcast heard by many clones (Session 195, section 181)

3 runs each, same options, before = VM `0ce264a`, after = `01a9cb4`. The capped "before" run is marked UNRELIABLE (CPU 37% idle load, 40% in one run). Raw: `bench\results\game_20261101_000112_s195-before.json`, `game_20261101_000803_s195-before-uncapped.json`, `game_20261101_002348_s195-after.json`, `game_20261101_003040_s195-after-uncapped.json`. Causes: `bench\broadcast-probe.mjs`.

| project | work ms, before → after | GC ms/s | scripts ms | max FPS |
|---|---|---|---|---|
| 36 broadcasts | 8.9 → 3.8 | 54.3 → 36.8 | 9.6 → 3.7 | 101.8 → 213.2 |
| 25 bouncing clones | 5.0 → 4.3 | 1.6 → 1.0 | 4.5 → 4.0 | 167.7 → 178.6 |
| 26 bullet hell | 2.9 → 2.6 | 1.2 → 1.2 | 1.7 → 1.5 | 367.0 → 382.2 |
| 32 clone churn | 2.5 → 1.9 | 9.0 → 7.4 | 1.8 → 1.7 | 318.7 → 384.5 |

Without the frame limit GC goes up in 36 (92.9 → 114.1 ms/s) because it runs twice as many frames. Direct calls with 5,000 clones: unheard broadcast 0.11 → 0.013 ms; restart of all 5,000 7.5 → 3.0-3.5 ms. The gains in 25, 26 and 32 are small and may be partly the busy PC in the "before" runs.

- **Where the time went (before):** matching each clone's hat one by one, also for the 20 unheard broadcasts (largest own time, 22% of the profile); on restart, searching the thread list from the start for every clone; joining and hashing a thread ID string up to three times per clone; thread start objects.
- **Built:** matching once per shared set of blocks (this also gives the gain a broadcast index would have); restart tries the place after the last one first; each target remembers its last thread ID; `thread.variables` made on first read; first stack push without a 17-place array; no event array or `splice` array when not needed.
- **Left:** `tryCompile` and `stepThread` (each about 6% of the profile, idle included). Reasoned, not measured: most of that is each thread's own compiled function; sharing it would need a change to the compiler's output. Not tried.

## Core blocks, second batch (Session 198, section 184)

Before = `--set pmNoCoreInline`, after = none, same build (VM `6d9cfc4`'s code), 3 runs, not marked UNRELIABLE (CPU 21-22% during runs). Project 39: 22 of these blocks in a warp loop. Project 40: 8,000 clones chasing a player, 4-7 of these per frame next to ordinary blocks (the best realistic case, not a typical game). Raw: `bench\results\2026-11-01_141923_s198old.json`, `2026-11-01_142456_s198new.json`.

| Project | work ms before | after | |
| --- | --- | --- | --- |
| 39 loop | 40.89 ±0.63 | 25.86 ±0.25 | -36.8% (24.5 → 38.7 FPS) |
| 40 chase | 12.16 ±0.92 | 7.60 ±0.48 | -37.5% |
| 4, 14, 24, 25, 34 (none of these blocks) | | | no real change |

- A loop of one block hides the cost (`bench\core-cost.mjs`): 40-80 ns per call for the layer, since the JavaScript engine optimises that one call. Mixed scripts pay much more: before the change the profile showed `executeInCompatibilityLayer` 19% self in 39 and 7% in 40, plus its generators and garbage.
- A game with few of these blocks per frame gains in proportion; the 37% is not a general number.

## Core blocks, last batch (Session 199, section 185)

Before = `--set pmNoCoreInline`, after = none, same build, 3 runs; **every comparison was marked UNRELIABLE** (CPU 21-29% around the runs, PC in use). Raw: `bench\results\2026-11-01_150928_s199old.json`, `2026-11-01_151548_s199new.json`, `2026-11-01_153554_s199old2.json`, `2026-11-01_153654_s199new2.json`.

- 41 (18 of these blocks in a warp loop), work ms: 376.88 ±275 → 208.62 ±1.7, repeated 432.81 ±313 → 241.12 ±23. bench's verdict is "no real change" because the old path swung so widely between runs (cause not looked into); after is below before in both rounds.
- 34 (sound) 1.24 → 1.21, 35 (say bubbles) 2.34 → 2.32: no real change, as expected: their own work outweighs the layer. 4, 14, 24, 25: no real change.

## x and y position rounding (Session 200, section 186)

Before = VM `c09e384`, after = the same with section 186, 3 runs, not marked UNRELIABLE. Project 42 does nothing but read x and y (2,000,000 reads per frame): work 4.18 → 5.77 ms, about 0.8 ns per read. Project 4: no real change. Project 25 was called slower (4.51 → 7.39) but has no x or y position block, so its compiled code is unchanged: its work ms varies that much by itself (4.65 to 9.15 this day on the same code).

## Optimized shortcuts (Session 201, section 187)

Before = VM `83f8cd0`, after = with section 187, 3 runs, marked UNRELIABLE (PC busy before the "before" runs). Work ms: 43 (these blocks in a loop) 32.47 → 32.57, 27 1.03 → 1.02, 28 0.30 → 0.33: no real change.

## Set and change volume and sound effect (Session 202, section 188)

Before = `--set pmNoCoreInline`, after = none, same build, 3 runs, not marked UNRELIABLE. Project 44 (the 4 blocks in a warp loop, 20,000 rounds, one sound): work 8.07 → 4.63 ms (-42.6%). 34 and 4: no real change. 35 2.35 → 2.19 is section 185's say blocks (the switch turns those off too), not this change.

## Pure blocks (Session 203, section 189)

Before = `--set pmNoCheapCall`, after = none, same build, not marked UNRELIABLE. Project 45 (10 pure blocks of 8 extensions in a warp loop, 50,000 rounds): work 9.62 ±0.27 → 8.54 ±0.35 ms (-11.2%, 5 runs); an earlier 3 runs 9.22 → 8.67 (-6%, called no real change). 13 and 14: no real change. The switch also turns off section 160, so 22 and 24 say nothing about this change.

## Collision grid (Session 205, section 190)

Question: does a grid help when the candidate set is large? Tools: `bench\game-bench.mjs`, `bench\touch-probe.mjs` (new, CPU profile), `bench\grid-eq.mjs` (new, equality). 3 runs each, RTX 4060. Reliability flags: baseline capped marked UNRELIABLE, uncapped marked UNRELIABLE, scaled marked UNRELIABLE (idle load 25-35%); before/after: off not marked, on marked UNRELIABLE, scaled off marked UNRELIABLE, scaled on marked UNRELIABLE. Gains this large are well above that noise, small differences are not.

Measured, current engine (selection = profiler samples in `_candidatesTouching` or `_cachedCandidatesTouching`, share of the samples in `Runtime._step`):

| Project | FPS capped | Max FPS | Work ms | Selection share | Selection ms |
|---|---|---|---|---|---|
| 46 | 62.5 | 414 | 2.1 | 27% | 0.58 |
| 46 ×8 | | 43 | 21.6 | 30% | 5.79 |
| 47 | 9.1 | 8.9 | 116 | 77% | 74.0 |
| 48 | 38.7 | 42 | 23 | 77% | 18.1 |
| 48 ×2 | | 11 | 90 | 77% | 65.8 |
| 49 | 21.3 | 21.8 | 45 | 58% | 29.2 |

Reasoned: the true share in 47-49 is higher, since `isTouchingDrawables` itself takes another 13-15% and its only loops there are the `filter` before the full check and the pixel test. The split between functions inside (for example `_touchingBounds` 42% in 48, called once per question) is not to be trusted: the optimiser merges functions. The touching cache does not absorb this: each clone moves before it asks, so the table of sections 39-42 is out of date at each question and the full check runs (`_cachedCandidatesTouching` under 1%, `_candidatesTouching` 58-76%). Project 26's "1.0 ms" could not show this: its list holds one sprite.

Decision: build. Selection is far above 5% in every new project. In 46 (one asker) it is real but small in ms; there the grid stays off, since a single question per frame gains nothing.

Before/after, same build, `--uncapped`, before = `--set pmNoTouchingGrid`:

| Project | Work ms | Max FPS |
|---|---|---|
| 47 swarm | 100.7 → 5.2 | 9.9 → 189 |
| 48 far apart | 22.5 → 1.1 | 44 → 865 |
| 48 ×2 | 89.4 → 2.1 | 11.2 → 461 |
| 49 packed | 43.0 → 30.4 | 23.2 → 32.7 |
| 50 swarm with changing list | 119.8 → 5.8 | 8.3 → 171 |
| 46, 46 ×8 (grid not used) | 1.7 → 1.9, 20.4 → 21.2 | 533 → 501, 48 → 46: no real change expected (same path) |
| 26, 32 | 2.1 → 2.2, 2.4 → 2.3 | no real change |
| 25 (5 runs, repeated) | 5.6 → 5.1 | 176 → 191; the first 3-run try read 6.2 → 7.5 with 72% CPU load during it |

The "off" column still has the cost added to every move (two counters, `_skin` accessor), so it cannot show that cost; 25 against the Session 195 figures is the only hint (not compared, other builds). A first version made 49 worse (50 → 90 ms, every question visited the clones several times and sorted them); it now compares the list directly when the cells near the asker hold more entries than the whole list. 49's gain comes from skipping the `filter` and the preparing, not from the grid. GC in 50 goes from 7 to 12 ms/s (longest pause 5 → 13 ms). Not improved: touching color, "touching point", lists under 64, lists asked fewer than 32 times per frame.

## Ranking of the remaining ideas (Session 176; next after Session 179: clone deletion, seen in project 32)

The sizes of costs are measured; every gain below is a guess until built.

| Rank | Idea | Evidence | Measured or guess |
|---|---|---|---|
| done | Thread map kept up to date, not rebuilt every frame (section 168) | 17.8% of 25, ≈ 25% of engine work in 29 | measured above |
| done | "If on edge bounce" asks a quick box first (section 172) | project 25: work 11.1 → 7.1 ms, max FPS 96 → 153 | measured (the "before" max FPS run is marked UNRELIABLE) |
| done | Clone deleting and creating (section 171); pool of clone objects not built, see above | project 32 at ×4: 11 → 60 FPS | measured |
| done | Fewer GC pauses (section 173) | 27: the lost frame at 26.5 s gone; 25: garbage 2.3 → 0.8 MB per frame, GC 3.1 → 1.4 ms/s | measured |
| done | Faster start (section 174, Session 187) | editor cold start 4.2 → 3.05 s; game 1.83 → about 1.6 s | measured, see "Start-up" |
| done | Collision grid (section 190) | project 47: work 100.7 → 5.2 ms; earlier "1.0 ms" evidence could not show it (one candidate) | measured, see "Collision grid" |
| 7 | Typed variables / number lists (speed) | raycaster scripts 1.1 ms | measured: small |
| 8 | Custom block inlining | 27,000 calls 0.7 ms | measured: small |
| 9 | Worker for rendering | at most draw's 2.1 ms in 25 | gain limit measured: small now; large change |

Recommendation (Session 179): cheaper clone deletion first (part of rank 3), measured with 32 at ×2; then rank 2, measured with 25.

## Start-up (Session 187)
Real cold starts (process started afresh on the hidden desktop, RTX 4060), not page reloads: a reload is 370 ms and hides most of this. Tools: `docs/PROCEDURES.md` "Start-up".
- Editor, before: 4.2 s = 1650 ms before the page starts + 2500 ms page. After: 3.05 s = 840 + 2200.
- Built: `unzipper` loaded on first use (-800 ms, process part); audio service started early (first AudioContext 370 → 40 ms; tiny game 1830 → 1530-1630 ms to loaded).
- Left, not built: 860 ms is the page blocked on the GPU process's start (`isSupported`'s WebGL context in the first React render). `--disable-gpu` saves 950 ms (not usable), `--in-process-gpu` 400 ms (not used: a GPU crash would take the page with it); Graphite, Vulkan, ANGLE D3D11, shader cache, driver workarounds, GPU sandbox, high-performance GPU: no clear change. Idea: make the WebGL context after the rest of the first render, so the two run side by side (at most about 700 ms, a reasoned limit); the VM needs the renderer while loading a project, so it is a larger, riskier change.
- V8 code cache, skipped: on a restart the saved cache was not used for pages served through our handler (seen in traces; the likely cause, Chromium's check of the response's time, was not confirmed). Giving https the `codeCache` privilege makes it survive (3.8 MB read back), but cold start stayed 3.3 s: only 200-240 ms of the start is compiling and that cache holds few functions. With eager compile and script streaming off, compiling falls to 52 ms but the load event comes later (2430 → 2570 ms). No gain.
- SVG costumes as pictures at export, skipped: a 60-SVG + 30-WAV game (8 MB) is only about 100 ms slower to load than a one-costume game, since costumes wait for first use. One 200×200 SVG with 40 paths costs 14-40 ms on first use, the same PNG 1 ms, but a PNG loses sharpness when the sprite is drawn larger than the picture, a visible change; keeping both is a large change. Offer again if a game shows hitches from first use.
- Compressed sounds, skipped: same game, so at most part of those 100 ms; decoding all 30 WAVs is 100 ms in the background. The same game as one HTML file adds about 70 ms. Compression would mainly shrink the file; not built, so no sound comparison was needed.

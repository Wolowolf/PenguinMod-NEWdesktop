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

## Words used in the tables (Session 170's own table: raw file above)

Words: **frame** = time from one frame to the next (16.0 = the 60 FPS limit); **p99** = the slowest 1% of frames take at least this long (stutter); **work** = time the engine is busy inside a frame; **GC** = garbage collection, the JavaScript engine pausing to clean up memory no longer used (ms per second, and the longest single pause); **load** = `vm.loadProject`; **first** = from load start to the end of the first frame after the green flag (it creates the clones; for 25 that first frame alone took ≈ 420 ms); **split** from the engine's profiler (scripts = running blocks, touching = inside the touching checks, draw = the renderer drawing, rest = the step's own bookkeeping); **heap / live** = JavaScript memory after 30 s, as is / after a forced clean-up. GPU memory and GPU time are not measured: "draw" is the main-thread time spent handing the drawing to the graphics card.

## Windows idle mode spoils benchmarks (Session 179)

30 min after the last keyboard or mouse input Windows changes the session state (System log, Kernel-Power 566, "3 to 4"; probably the screen turning off). From then on every project is slower, through app restarts and rebuilds: 25 fell from 62 to about 40 FPS, scripts about twice as slow, quick clean-ups 6–12× as many. Touching the PC ended it at once (21:13:48: "4 to 6", 25 back at 62). Asking Windows to keep the display on does not end it. Why this mode slows the page is not known. `game-bench` now prints UNRELIABLE when the last change was to state 4. Earlier "busy PC" results may partly be this.

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

## Ranking of the remaining ideas (Session 176; next after Session 179: clone deletion, seen in project 32)

The sizes of costs are measured; every gain below is a guess until built.

| Rank | Idea | Evidence | Measured or guess |
|---|---|---|---|
| done | Thread map kept up to date, not rebuilt every frame (section 168) | 17.8% of 25, ≈ 25% of engine work in 29 | measured above |
| 2 | "If on edge bounce" asks a quick box first | 13–23% of 25 | cost measured; only helps projects using this block or similar; that clones far from edges skip the outline is a guess |
| 3 | Clone creation / recycling | first frame of 25 ≈ 400 ms | measured for 10,000 at once; constant spawning not measured |
| 4 | Fewer GC pauses | full clean-up 14–16 ms in 25 and 27, about once per run, can cost a frame | measured; causes not measured |
| 5 | Startup speed | load 130–180, first 280–610 ms | measured on tiny projects; lazy costumes already done |
| 6 | Collision grid | touching 1.0 ms with 2,000 bullets (now 19% of 26) | measured: small in ms |
| 7 | Typed variables / number lists (speed) | raycaster scripts 1.1 ms | measured: small |
| 8 | Custom block inlining | 27,000 calls 0.7 ms | measured: small |
| 9 | Worker for rendering | at most draw's 2.1 ms in 25 | gain limit measured: small now; large change |

Recommendation (Session 179): cheaper clone deletion first (part of rank 3), measured with 32 at ×2; then rank 2, measured with 25.

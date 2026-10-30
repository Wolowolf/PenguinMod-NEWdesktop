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

Already covered by older projects: touching (1, 6–8), maths loop (2), list search (3), 5,000 moving clones (4), deep custom-block recursion (5).

## Results (averages of 3 runs; ms per frame unless noted)

| # | FPS | frame | p99 | work | GC ms/s | GC max | load ms | first ms | scripts | touch | draw | rest | heap / live MB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 11.7 | 85.4 | 112.1 | 84.2 | 6.6 | 8.0 | 142 | 657 | 11.8 (14%) | 0.0 | 68.1 (81%) | 4.4 (5%) | 204 / 84 |
| 26 | 50.0 | 20.0 | 27.4 | 18.3 | 6.8 | 6.9 | 131 | 310 | 3.3 (17%) | 1.0 (5%) | 13.8 (69%) | 1.7 (9%) | 86 / 50 |
| 27 | 60 | 16.0 | 17.7 | 1.3 | 1.4 | 9.7 | 195 | 319 | 1.3 (92%) | 0.0 | 0.1 | 0.0 | 41 / 40 |
| 28 | 60 | 16.0 | 17.7 | 4.8 | 3.8 | 0.9 | 185 | 341 | 0.3 (5%) | 0.0 | 4.5 (90%) | 0.2 (5%) | 58 / 44 |
| 29 | 60 | 16.0 | 17.8 | 1.9 | 3.0 | 3.8 | 156 | 330 | 1.0 (50%) | 0.0 | 0.1 | 0.9 (46%) | 74 / 52 |
| 30 | 60 | 16.0 | 17.7 | 2.0 | 3.1 | 3.8 | 156 | 330 | 0.9 (49%) | 0.0 | 0.1 | 0.9 (46%) | 66 / 52 |
| 31 | 60 | 16.0 | 17.8 | 3.8 | 1.4 | 1.1 | 122 | 283 | 0.8 (27%) | 0.0 | 2.1 (72%) | 0.0 | 73 / 51 |

Words: **frame** = time from one frame to the next (16.0 = the 60 FPS limit); **p99** = the slowest 1% of frames take at least this long (stutter); **work** = time the engine is busy inside a frame; **GC** = garbage collection, the JavaScript engine pausing to clean up memory no longer used (ms per second, and the longest single pause); **load** = `vm.loadProject`; **first** = from load start to the end of the first frame after the green flag (it creates the clones; for 25 that first frame alone took ≈ 420 ms); **split** from the engine's profiler (scripts = running blocks, touching = inside the touching checks, draw = the renderer drawing, rest = the step's own bookkeeping); **heap / live** = JavaScript memory after 30 s, as is / after a forced clean-up. GPU memory and GPU time are not measured: "draw" is the main-thread time spent handing the drawing to the graphics card.

## What takes the most time per project (measured)

- 25 bouncing clones: drawing (81%), then scripts (14%); first frame 657 ms, of which ≈ 420 ms is the frame creating 10,000 clones.
- 26 bullet hell: drawing (69%); touching only 1.0 ms (5%); 1 in 100 frames takes 27+ ms.
- 27 raycaster: scripts (92%) but only 1.3 ms for 320 rays (≈ 200,000 inner loop rounds); one full GC (major clean-up) per run of 9.7 ms can cost a frame.
- 28 tile map: drawing (90%); list lookups and tile collision 0.3 ms.
- 29 / 30 custom blocks: 27,000 calls take ≈ 1 ms with or without screen refresh (no difference); the step's bookkeeping for 3,000 clone threads costs as much again (0.9 ms).
- 31 physics: drawing (72%), then Box2D's step (inside scripts, 0.8 ms).

## After section 163 (batched drawing, same build, switch on / off, 3 runs; also marked UNRELIABLE: PC busy)

| # | FPS off → on | work ms off → on | draw ms off → on |
|---|---|---|---|
| 25 | 14.9 → 56.3 | 66.3 → 17.2 | 50.0 → 2.1 |
| 26 | 58.4 → 60 (limit) | 15.2 → 4.8 | 10.0 → 0.5 |
| 28 | 60 → 60 | 3.9 → 1.0 | 3.3 → 0.4 |
| 31 | 60 → 60 | 3.3 → 2.0 | 1.6 → 0.2 |

Idea "batched drawing" (rank 1 of Session 170's ranking) is done.

## Measured again after section 163 (Session 176, 2026-10-30)

Build: GUI `47b7237`, VM `b10fff6`, Render `b193075`, 3 runs. **UNRELIABLE** (24% CPU idle load before the runs): trust the shares more than exact milliseconds. Raw: `benchesultsgame_20261030_173532_after-s163.json`.

| # | FPS | frame | p99 | work | GC ms/s | GC max | load | first | scripts | touch | draw | other | heap / live MB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 60.5 | 16.5 | 25.3 | 15.1 | 12.4 | 13.7 | 144 | 612 | 9.9 (64%) | 0.0 | 2.1 (14%) | 3.4 (22%) | 199 / 84 |
| 26 | 60 | 16.0 | 17.9 | 4.1 | 5.9 | 5.8 | 131 | 307 | 2.4 (47%) | 1.0 (19%) | 0.5 (9%) | 1.3 (25%) | 66 / 50 |
| 27 | 60 | 16.0 | 17.7 | 1.1 | 3.0 | 15.5 | 178 | 302 | 1.1 (93%) | 0.0 | 0.1 | 0.0 | 41 / 40 |
| 28 | 60 | 16.0 | 17.5 | 0.8 | 1.6 | 2.5 | 171 | 312 | 0.2 (28%) | 0.0 | 0.4 (48%) | 0.2 (24%) | 72 / 44 |
| 29 | 60 | 16.0 | 17.8 | 1.6 | 3.6 | 6.1 | 145 | 312 | 0.7 (46%) | 0.0 | 0.1 | 0.7 (48%) | 68 / 52 |
| 30 | 60 | 16.0 | 17.6 | 1.5 | 3.0 | 3.6 | 137 | 293 | 0.7 (47%) | 0.0 | 0.1 | 0.7 (48%) | 66 / 52 |
| 31 | 60 | 16.0 | 17.7 | 1.6 | 0.5 | 0.9 | 131 | 281 | 0.7 (79%) | 0.0 | 0.2 (18%) | 0.0 | 75 / 50 |

Sampled function times, one 5 s run, production build (share of all time; a one-off sample):
- 25: `updateThreadMap` 14.8% + `getIdFromTargetAndBlock` 3.0% = **17.8%, the biggest single item**: every frame the engine empties the thread map and refills it, making one text id per clone. `_getTransformedHullPoints` 7.0%, `transformPoint` 4.2%, `initFromPointsAABB` 2.1% = 13.3% is the exact outline box for "if on edge bounce" (up to 22.6% with `_calculateTransform`, `multiply`, `ortho`, which drawing partly needs anyway). Running the scripts themselves: `s` (resumes each script) 11.0%, `gen7` 2.9%, `_moveSteps` 2.7%.
- 29: of ≈ 490 ms of engine work in 5 s, `updateThreadMap` + id = 125 ms (≈ 25%); the 27,000 custom-block calls are less.

GC in 25 (first run of each build, 8 s), measured: switch off 103 quick clean-ups at 15.4 FPS, longest 0.7 ms; on 163 + 1 full clean-up at 58.4 FPS, longest 15.7 ms. Quick clean-ups per frame fell (0.83 → 0.35), so the rise in ms per second comes from more frames, not more garbage per frame. The longest pause is the single full clean-up that now falls inside the window. Why 25's p99 is 25 ms is not known: one full clean-up in 8 s can't explain 1% of frames (≈ 5), and quick ones take under 1 ms.

## Ranking of the remaining ideas (Session 176)

The sizes of costs are measured; every gain below is a guess until built.

| Rank | Idea | Evidence | Measured or guess |
|---|---|---|---|
| 1 | Thread map kept up to date, not rebuilt every frame | 17.8% of 25, ≈ 25% of engine work in 29 | cost measured; removing nearly all of it is a guess; small change |
| 2 | "If on edge bounce" asks a quick box first | 13–23% of 25 | cost measured; only helps projects using this block or similar; that clones far from edges skip the outline is a guess |
| 3 | Clone creation / recycling | first frame of 25 ≈ 400 ms | measured for 10,000 at once; constant spawning not measured |
| 4 | Fewer GC pauses | full clean-up 14–16 ms in 25 and 27, about once per run, can cost a frame | measured; causes not measured |
| 5 | Startup speed | load 130–180, first 280–610 ms | measured on tiny projects; lazy costumes already done |
| 6 | Collision grid | touching 1.0 ms with 2,000 bullets (now 19% of 26) | measured: small in ms |
| 7 | Typed variables / number lists (speed) | raycaster scripts 1.1 ms | measured: small |
| 8 | Custom block inlining | 27,000 calls 0.7 ms | measured: small |
| 9 | Worker for rendering | at most draw's 2.1 ms in 25 | gain limit measured: small now; large change |

Recommendation: rank 1, measured with 25, 26, 29, 30.

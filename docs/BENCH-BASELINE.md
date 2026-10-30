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

## Ranking of the ideas

| Rank | Idea | Evidence | Measured or guess |
|---|---|---|---|
| 1 | Batched drawing | drawing is 69–90% of work in 25, 26, 28, 31 | the cost is measured; that batching removes most of it is a guess (≈ 6.8 µs per sprite now in 25 suggests per-sprite overhead) |
| 2 | Clone creation / recycling | 10,000 clones = ≈ 420 ms first frame | measured for creating them at once; gain for games that spawn and delete clones constantly is a guess (not measured) |
| 3 | Worker for rendering | would let scripts and drawing overlap | guess: at most the smaller of scripts / draw per frame (≈ 12 ms of 85 in 25); large change |
| 4 | Fewer GC pauses (part of typed variables / number lists) | longest pauses 7–10 ms in 25, 26, 27 | pauses measured (25 and 26: ≈ 90 quick clean-ups in 8 s, so many short-lived objects per frame; 27: one full clean-up); their causes are guesses |
| 5 | Startup speed | load 120–200 ms, first frame 280–660 ms | measured on tiny projects; real projects with many costumes would gain more from lazy costumes (plan step (b)): guess |
| 6 | Collision grid | touching 1.0 ms with 2,000 bullets | measured: small |
| 7 | Typed variables / number lists (speed) | raycaster scripts 1.3 ms | measured: small |
| 8 | Custom block inlining | 27,000 calls ≈ 1 ms, warp or not | measured: small; thread bookkeeping per clone (0.9 ms) is as big |

Recommendation: batched drawing next (drawing of many sprites with the same costume in fewer draw calls), measured with projects 25, 26 and 28.

## After section 163 (batched drawing, same build, switch on / off, 3 runs; also marked UNRELIABLE: PC busy)

| # | FPS off → on | work ms off → on | draw ms off → on |
|---|---|---|---|
| 25 | 14.9 → 56.3 | 66.3 → 17.2 | 50.0 → 2.1 |
| 26 | 58.4 → 60 (limit) | 15.2 → 4.8 | 10.0 → 0.5 |
| 28 | 60 → 60 | 3.9 → 1.0 | 3.3 → 0.4 |
| 31 | 60 → 60 | 3.3 → 2.0 | 1.6 → 0.2 |

Now in 25 scripts are the biggest cost (10.9 ms of 17.2); idea 1 above is done, the rest of the ranking is unchanged and still needs measuring again before picking the next one.

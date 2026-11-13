# Compiler study (2026-11-11): TurboWarp / MistWarp compiler versus ours

Status 2026-11-13: built. Experiment C is section 236, A is sections 240–242, L is section 245; sections 243, 244, 246–248 went further on the same ground. This file keeps the study as it was run (the numbers below are from before those sections). Full notes, patches, runner, logs and generated code live
outside the repo in `C:\Users\elias\Documents\PenguinMod-test\bench\compiler-study\` (its `README.md` also says how to
rebuild the set-up, about 20 minutes; the clones and patched VM copies were not kept).

## What was compared (exact commits)

| Name | Repository | Commit |
|---|---|---|
| TurboWarp (new compiler) | TurboWarp/scratch-vm | `0cb82afe` (2026-10-31) |
| TurboWarp just before the new compiler | same | `6222be2a` |
| TurboWarp at the merge of the new compiler (PR 216) | same | `98df18ae` |
| MistWarp | MistWarp/scratch-vm | `77a13b33` (2026-11-08) |
| PenguinMod-Port (PenguinMod rebuilt on current TurboWarp) | penguinmod-port/scratch-vm | `2b1815c2` |
| Untouched PenguinMod (`pinned`) | Wolowolf/PenguinMod-Vm | `9c8e4461` |
| Ours (`desktop`, section 235) | Wolowolf/PenguinMod-Vm | `966b300a` |
| Benchmark (ScratchBench) | gradylink/scratch-bench (MIT) | `4099437b` |

Full commit hashes are in the study folder's `README.md`. Our compiler branches from TurboWarp at `1619bbf` (2022-12-11).

## Experiments (throwaway patches on a copy of our VM's compiler)

- **A, "type flow":** variable types flow into and out of if/else and through loops that cannot pause; a variable set
  to a fixed number is known as a number.
- **L, "locals"** (on top of A): variables kept in JavaScript locals inside loops that cannot pause and contain only
  safe block kinds, written back at the end of each round of the outermost such loop.
- **C, "helpers":** `x === x` instead of `isNaN(x)` in the three comparison helpers, number fast paths in `listGet`
  and `listReplace` (TurboWarp PRs 367 and 389).

## Results (app's Electron, V8 15.2, ScratchBench total score)

| | Warp timer off | Warp timer on (the editor's setting) |
|---|---|---|
| Untouched PenguinMod | 26,494 | |
| PenguinMod-Port | 25,025 | |
| Ours | 40,175 / 41,270 / 41,701 (three batches) | 26,730 |
| TurboWarp | 40,827 | 28,986 |
| Ours + C | 42,943 | 28,687 |
| Ours + A | 42,415 / 42,994 | 27,567 |
| Ours + A + L | 53,765 | |
| Ours + A + L + C | 54,871 | 28,783 |
| MistWarp | 68,123 | 33,463 |

All 39 non-scheduler checksums were the same for every VM and experiment. Totals of the same VM differ by 1 to 5%
between runs, single tests by up to 60%; nothing else may run on the PC meanwhile (the same code scored 29.5k and 36.2k
while an install was running). Plain Node (older V8): TurboWarp before the new compiler 24.4k, at the merge 28.5k, now
37.6k. Compile time of the benchmark project (85 scripts): 26 ms, with experiment A 108 ms.

## Findings

- TurboWarp's analysis tracks only the types of variables, clears everything at each pause, and is off inside loops
  while the warp timer is on. MistWarp's locals are off with the warp timer too.
- TurboWarp and MistWarp crash on the probe project's custom block `p2` ("for each" whose variable held text before
  the loop: they call `.toLowerCase()` on a number); their analysis does not record that "for each" writes its
  variable. Ours, the interpreter and old TurboWarp answer `p2 1234`. Known open holes upstream: issues 357 and 362.
- With the warp timer on, TurboWarp and ours generate the same code for the benchmark's sort; TurboWarp's lead there
  comes from the helpers (experiment C).
- The block inventory already says what each of the 2,196 extension blocks writes: 46 write variables, 1,598 never
  wait and write no variables, threads or scripts (useful for an allowed-kinds list).

## Limits of the experiments (to fix before any real version)

- A and L use a short list of block kinds and do not know extension kinds: a real version needs a list of allowed
  kinds for loop bodies, and "exit loop" / "continue loop" must switch it off, as the experiment does.
- L made two benchmark tests 12 to 15% slower (app_raycast, app_ast; not looked into).
  Looked into and built as section 245 (Session 264). app_ast was noise: the experiment's two runs differ by 23% from
  each other, and it is 5 to 16% faster with the real version. app_raycast was real (7% slower with everything in
  locals): the ray's map square (`floor` of the position, then stepped by 1) is a whole number; in the variable's
  object the JavaScript engine has noted "only small whole numbers" and computes with it as an integer, in a local it
  only sees `Math.floor`'s result, a fraction number, and converts on every use. Keeping just those two variables in
  their objects: 32% faster than without locals (and a throwaway `| 0` after the floor, which tells the engine
  "integer", made the all-locals code as fast: 87 → 125 rounds per ms). Rule in section 245: a variable the loop sets to the result of
  floor / ceiling / round stays in its object. Not the cause: re-wrapping fraction numbers handed to the compare
  helpers (0 garbage collections without locals, about 190 with; keeping those variables out changed nothing
  measurable). MistWarp's own rule (a variable stored into a list as a number that might be NaN stays in its
  object, `3d898e6c`) was measured and NOT taken over: here it made algo_matmul 1.25 times faster instead of 1.64
  (our list writes go through `listReplace`, a call, not a direct array store).
  Tools for such questions: `PenguinMod-test\bench\compiler-study\runner\one-vm.cjs` (`docs/PROCEDURES.md`).
- A's dry runs repeat the work of inner loops (a cache is needed); this is why compile time rose from 26 to 108 ms.
  Done in section 242 (Session 260): results remembered per loop and entry state, compile time about 1.5 times.
- The block-eq test cannot catch analysis mistakes (one block per script, no loops), so a fuzz test must come first.
  Done in Session 256: `docs/PROCEDURES.md` "Type-analysis fuzz test".

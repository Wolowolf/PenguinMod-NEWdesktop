// Builds the speech-model release (offline text to speech) from downloaded source files and writes
// app/speech-models.json. Run on a PC (node 20+), no npm packages needed:
//
//   node scripts/make-speech-models.mjs --tag speech-models-<n> --out <dir> [--ort <dir> --pocket <dir> --voices <dir>] [--supertonic <dir>]
//
// Only the packs whose sources are given are made, in release --tag; the others stay as
// app/speech-models.json has them (each pack names its release), so a new release holds only new files.
//
//   --ort     onnxruntime-web 1.30.0: dist/ort.wasm.bundle.min.mjs, dist/ort-wasm-simd-threaded.wasm, and
//             LICENSE + ThirdPartyNotices.txt from github.com/microsoft/onnxruntime at v1.30.0
//   --pocket  huggingface.co/KevinAHM/pocket-tts-onnx onnx/: LICENSE and, for each language folder below,
//             bundle.json, bos_before_voice.npy, tokenizer.model and the five *_int8.onnx files
//   --voices  the clips listed in VOICES below, from huggingface.co/kyutai/tts-voices, saved as <name>.wav
//   --supertonic  huggingface.co/Supertone/supertonic-3: LICENSE, onnx/ (the 4 .onnx files, tts.json,
//             unicode_indexer.json), voice_styles/ (F1-F5, M1-M5 .json) and COMMIT.txt (the commit downloaded)
//
// Output: <out>/assets/ (flat files to upload to the release, names "<pack>--<path>") and
// <out>/installed/<pack>/ (the layout the app keeps in resources/speech-models, for the local test).
// Each pack is downloaded by the app on its own (a language only when a project needs it).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const args = Object.fromEntries(process.argv.slice(2).reduce((list, arg, i, all) =>
  arg.startsWith("--") ? [...list, [arg.slice(2), all[i + 1]]] : list, []));
for (const key of ["tag", "out"]) {
  if (!args[key]) throw new Error(`missing --${key}`);
}
const pocket = ["ort", "pocket", "voices"].filter((key) => args[key]);
if (pocket.length && pocket.length < 3) throw new Error("--ort, --pocket and --voices go together");

const LANGUAGES = {
  english: "english_2026-04",
  french: "french_24l",
  german: "german",
  italian: "italian",
  portuguese: "portuguese",
  spanish: "spanish",
};
const POCKET_FILES = ["bundle.json", "bos_before_voice.npy", "tokenizer.model", "flow_lm_main_int8.onnx",
  "flow_lm_flow_int8.onnx", "mimi_decoder_int8.onnx", "mimi_encoder_int8.onnx", "text_conditioner_int8.onnx"];
// Commercial-safe Pocket TTS voices only (kyutai/tts-voices: vctk, alba-mackenna = CC BY 4.0;
// voice-zero, voice-donations = CC0). Never expresso or ears (CC BY-NC).
const VOICES = {
  alba: "alba-mackenna/casual.wav", anna: "vctk/p228_023_enhanced.wav", azelma: "vctk/p303_023_enhanced.wav",
  bill_boerst: "voice-zero/bill_boerst.wav", caro_davy: "voice-zero/caro_davy.wav",
  charles: "vctk/p254_023_enhanced.wav", eponine: "vctk/p262_023_enhanced.wav", eve: "vctk/p361_023_enhanced.wav",
  fantine: "vctk/p244_023_enhanced.wav", george: "vctk/p315_023_enhanced.wav", jane: "vctk/p339_023_enhanced.wav",
  javert: "voice-donations/Butter.wav", marius: "voice-donations/Selfie.wav", mary: "vctk/p333_023_enhanced.wav",
  michael: "vctk/p360_023_enhanced.wav", paul: "vctk/p259_023_enhanced.wav",
  peter_yearsley: "voice-zero/peter_yearsley.wav", stuart_bell: "voice-zero/stuart_bell.wav",
  vera: "vctk/p229_023_enhanced.wav",
};
const VOICE_RATE = 24000;
const VOICE_SECONDS = 10; // Pocket TTS uses at most 10 s of a voice clip

const out = path.resolve(args.out);
fs.rmSync(out, { recursive: true, force: true });
const packs = {};
const addFile = (pack, rel, data) => {
  const dest = path.join(out, "installed", pack, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, data);
  const asset = `${pack}--${rel.replace(/\//g, "~")}`;
  fs.mkdirSync(path.join(out, "assets"), { recursive: true });
  fs.writeFileSync(path.join(out, "assets", asset), data);
  (packs[pack] = packs[pack] || []).push({
    path: rel, asset, size: data.length, sha256: crypto.createHash("sha256").update(data).digest("hex"),
  });
};
const read = (...p) => fs.readFileSync(path.join(...p));

if (pocket.length) {
// onnxruntime-web (MIT)
addFile("onnxruntime", "ort.wasm.bundle.min.mjs", read(args.ort, "ort.wasm.bundle.min.mjs"));
addFile("onnxruntime", "ort-wasm-simd-threaded.wasm", read(args.ort, "ort-wasm-simd-threaded.wasm"));
addFile("onnxruntime", "LICENSE.txt", read(args.ort, "LICENSE"));
addFile("onnxruntime", "ThirdPartyNotices.txt", read(args.ort, "ThirdPartyNotices.txt"));

// Pocket TTS models (CC BY 4.0, Kyutai; ONNX export and int8 by KevinAHM), unchanged
for (const [language, folder] of Object.entries(LANGUAGES)) {
  for (const file of POCKET_FILES) addFile(`pocket-${language}`, file, read(args.pocket, folder, file));
  addFile(`pocket-${language}`, "LICENSE.txt", read(args.pocket, "LICENSE"));
  addFile(`pocket-${language}`, "SOURCE.txt", Buffer.from(
    "Pocket TTS by Kyutai (https://huggingface.co/kyutai/pocket-tts), CC BY 4.0.\n" +
    `ONNX export and int8 quantization by KevinAHM (https://huggingface.co/KevinAHM/pocket-tts-onnx), onnx/${folder}/, CC BY 4.0.\n` +
    "Files unchanged. Licence: LICENSE.txt (https://creativecommons.org/licenses/by/4.0/).\n"));
}

// Voices: 16-bit PCM WAV, resampled to 24 kHz mono and cut to 10 s
const readWav = (buf) => {
  let pos = 12, fmt = null, data = null;
  while (pos + 8 <= buf.length) {
    const id = buf.toString("ascii", pos, pos + 4), size = buf.readUInt32LE(pos + 4);
    if (id === "fmt ") fmt = { channels: buf.readUInt16LE(pos + 10), rate: buf.readUInt32LE(pos + 12), bits: buf.readUInt16LE(pos + 22) };
    if (id === "data") data = buf.subarray(pos + 8, pos + 8 + size);
    pos += 8 + size + (size & 1);
  }
  if (!fmt || !data || fmt.bits !== 16) throw new Error("not a 16-bit PCM wav");
  const frames = Math.floor(data.length / 2 / fmt.channels);
  const samples = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    for (let c = 0; c < fmt.channels; c++) sum += data.readInt16LE((i * fmt.channels + c) * 2);
    samples[i] = sum / fmt.channels / 32768;
  }
  return { rate: fmt.rate, samples };
};
// Windowed-sinc (Blackman, 64 taps per side) resampler with the cut-off below the lower Nyquist rate
const resample = (input, from, to) => {
  if (from === to) return input;
  const ratio = to / from, cutoff = Math.min(1, ratio) * 0.95, taps = 64;
  const output = new Float32Array(Math.floor(input.length * ratio));
  for (let i = 0; i < output.length; i++) {
    const centre = i / ratio, first = Math.ceil(centre - taps / cutoff), last = Math.floor(centre + taps / cutoff);
    let sum = 0, weight = 0;
    for (let j = Math.max(0, first); j <= Math.min(input.length - 1, last); j++) {
      const x = (j - centre) * cutoff;
      const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
      const w = 0.42 + 0.5 * Math.cos(Math.PI * x / taps) + 0.08 * Math.cos(2 * Math.PI * x / taps);
      sum += input[j] * sinc * w;
      weight += sinc * w;
    }
    output[i] = weight ? sum / weight : 0;
  }
  return output;
};
const writeWav = (samples, rate) => {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  return buf;
};
for (const name of Object.keys(VOICES)) {
  const { rate, samples } = readWav(read(args.voices, `${name}.wav`));
  addFile("pocket-voices", `${name}.wav`, writeWav(resample(samples, rate, VOICE_RATE).subarray(0, VOICE_RATE * VOICE_SECONDS), VOICE_RATE));
}
addFile("pocket-voices", "SOURCES.txt", Buffer.from(
  "Voice clips from https://huggingface.co/kyutai/tts-voices, resampled to 24 kHz mono and cut to 10 seconds.\n" +
  "CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/): alba (alba-mackenna, voice-acted by Alba MacKenna);\n" +
  "anna, azelma, charles, eponine, eve, fantine, george, jane, mary, michael, paul, vera (vctk: the VCTK corpus,\n" +
  "Centre for Speech Technology Research, University of Edinburgh, https://datashare.ed.ac.uk/handle/10283/3443;\n" +
  "the *_enhanced recordings cleaned by Kyutai with ai-coustics).\n" +
  "CC0: bill_boerst, caro_davy, peter_yearsley, stuart_bell (voice-zero, LibriVox readers); javert, marius\n" +
  "(voice-donations, Unmute Voice Donation Project).\n\n" +
  Object.entries(VOICES).map(([name, source]) => `${name}: ${source}`).join("\n") + "\n"));
addFile("pocket-voices", "LICENSE-CC-BY-4.0.txt", read(args.pocket, "LICENSE"));
}

// Supertonic 3 (Supertone Inc., OpenRAIL-M), unchanged; one model for all 31 languages
if (args.supertonic) {
  const st = args.supertonic;
  for (const file of ["duration_predictor.onnx", "text_encoder.onnx", "vector_estimator.onnx", "vocoder.onnx", "tts.json", "unicode_indexer.json"]) {
    addFile("supertonic", file, read(st, "onnx", file));
  }
  for (const voice of ["F1", "F2", "F3", "F4", "F5", "M1", "M2", "M3", "M4", "M5"]) addFile("supertonic", `${voice}.json`, read(st, "voice_styles", `${voice}.json`));
  addFile("supertonic", "LICENSE.txt", read(st, "LICENSE"));
  addFile("supertonic", "SOURCE.txt", Buffer.from(
    `Supertonic 3 by Supertone Inc. (https://huggingface.co/Supertone/supertonic-3, commit ${read(st, "COMMIT.txt").toString().trim()}).\n` +
    "Files from onnx/ and voice_styles/, unchanged (stored side by side here). Licence: OpenRAIL-M (LICENSE.txt).\n\n" +
    "The model is subject to the use-based restrictions in paragraph 5 and Attachment A of LICENSE.txt:\n" +
    "everyone who uses it, including a player of a game that contains it, agrees not to use it for any of\n" +
    "those purposes. Speech made with it must be disclosed as machine-generated (Attachment A, item e).\n"));
}

const appPin = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..", "app", "speech-models.json");
const old = fs.existsSync(appPin) ? JSON.parse(fs.readFileSync(appPin, "utf8")) : { packs: {} };
const pin = {
  _about: "Offline text-to-speech files (scripts/make-speech-models.mjs). The app downloads each pack from its release (tag) " +
    "when a project first needs it (files named <pack>--<path>), checks size and SHA-256, and keeps it in resources/speech-models/<pack>.",
  packs: Object.fromEntries(Object.entries(old.packs).filter(([name]) => !packs[name])
    .map(([name, pack]) => [name, Object.assign({ tag: pack.tag || old.tag }, pack)])
    .concat(Object.entries(packs).map(([name, files]) => [name, {
      tag: args.tag,
      version: crypto.createHash("sha256").update(files.map((f) => f.path + f.sha256).join("\n")).digest("hex").slice(0, 16),
      size: files.reduce((sum, f) => sum + f.size, 0),
      files,
    }]))),
};
fs.writeFileSync(appPin, JSON.stringify(pin, null, 2) + "\n");
for (const name of Object.keys(packs)) {
  fs.writeFileSync(path.join(out, "installed", name, "version.json"), JSON.stringify({ version: pin.packs[name].version }) + "\n");
}
for (const [name, pack] of Object.entries(pin.packs).filter(([name]) => packs[name])) console.log(`${name}: ${pack.files.length} files, ${(pack.size / 1e6).toFixed(1)} MB`);

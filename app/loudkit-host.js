// Loudkit speech for "Make a speech sound" (Text To Speech), in its own process (started by
// electron-main.js with utilityProcess) so the app stays responsive while it works. Loudkit's code
// with onnxruntime-node (speech pack loudkit-engine), the models (loudkit-turbo = loudr-1-turbo,
// loudkit-natural = loudr-1) and the voice-cloning graphs (loudkit-cloning, shared by both models)
// are speech packs the app downloads the first time they are needed. One request at a time, in order.
const path = require("path");
const { pathToFileURL } = require("url");

let loudkit = null;
const engines = {}; // pack name -> Promise of an Engine
let enroller = null;
const clones = new Map(); // "<sound key>|<language>" -> voice profile (the same profile works with both models)
let queue = Promise.resolve();

// A promise that is forgotten when it fails, so the next request tries again
const retrying = (promise, forget) => {
  promise.catch(forget);
  return promise;
};

async function speak({ engineDir, speechDir, model, text, voice, clone, language, speed }) {
  loudkit = loudkit || retrying(import(pathToFileURL(path.join(engineDir, "dist", "loudkit.mjs")).href), () => { loudkit = null; });
  const lk = await loudkit;
  engines[model] = engines[model] || retrying(lk.Engine.load(path.join(speechDir, model), { onnxProvider: "cpu" }), () => { delete engines[model]; });
  const e = await engines[model];
  let profile;
  if (clone) {
    const key = `${clone.key}|${language}`;
    if (!clones.has(key)) {
      enroller = enroller || retrying(lk.Enroller.load(path.join(speechDir, "loudkit-cloning", "onnx"), { onnxProvider: "cpu" }), () => { enroller = null; });
      const enrolled = await (await enroller).enroll(clone.samples, clone.sampleRate);
      clones.set(key, lk.profileFrom(enrolled, { name: "clone", language, sampleRate: clone.sampleRate }));
      while (clones.size > 20) clones.delete(clones.keys().next().value);
    }
    profile = clones.get(key);
  } else {
    profile = e.voice(voice);
  }
  // A fixed seed: the same settings give the same sound
  const result = await e.synthesize(text, profile, { seed: 7, language, speed });
  return { samples: result.audio, sampleRate: result.sampleRate };
}

process.parentPort.on("message", ({ data }) => {
  queue = queue.then(async () => {
    try {
      process.parentPort.postMessage(Object.assign({ id: data.id }, await speak(data)));
    } catch (error) {
      process.parentPort.postMessage({ id: data.id, error: String((error && error.message) || error) });
    }
  });
});

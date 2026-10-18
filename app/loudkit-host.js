// Loudkit speech for "Make a speech sound" (Text To Speech), in its own process (started by
// electron-main.js with utilityProcess) so the app stays responsive while it works. Loudkit's code
// with onnxruntime-node (speech pack loudkit-engine) and the model (loudkit-turbo) are speech packs
// the app downloads the first time they are needed. One request at a time, in order.
const path = require("path");
const { pathToFileURL } = require("url");

let engine = null;
let queue = Promise.resolve();

async function speak({ engineDir, modelDir, text, voice, language, speed }) {
  if (!engine) {
    engine = import(pathToFileURL(path.join(engineDir, "dist", "loudkit.mjs")).href)
      .then(({ Engine }) => Engine.load(modelDir, { onnxProvider: "cpu" }));
    engine.catch(() => { engine = null; }); // tried again with the next request
  }
  const e = await engine;
  // A fixed seed: the same settings give the same sound
  const result = await e.synthesize(text, e.voice(voice), { seed: 7, language, speed });
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

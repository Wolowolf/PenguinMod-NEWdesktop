const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  session,
  protocol,
  net,
  Menu,
  shell,
} = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { pathToFileURL } = require("url");
const updater = require("./updater");

let mainWindow = null;
let isQuitting = false;

const PRELOAD_PATH = path.join(__dirname, "preload.js");
const SETTINGS_FILE = path.join(app.getPath("userData"), "app-settings.json");

// The in-app updater installs releases of MY fork (see app/updater.js for what it does to the files).
const UPDATE_REPO = "Wolowolf/PenguinMod-NEWdesktop";
const UPDATE_ASSET = "win-unpacked.zip";
const LEFTOVERS_FILE = path.join(app.getPath("userData"), "update-leftovers.json");
let updateInProgress = false;

// The offline library (Kenney, game-icons.net, sound generators), served at
// https://studio.penguinmod.com/__library__/. It sits next to the app in resources/offline-library,
// outside resources/app, so app updates don't download it again; app/offline-library.json says which
// version this app needs. PMDESKTOP_LIBRARY_DIR points elsewhere (the local test uses it).
const LIBRARY_DIR = process.env.PMDESKTOP_LIBRARY_DIR || path.join(process.resourcesPath, "offline-library");
const LIBRARY_PREFIX = "/__library__/";

// The Electron zip the packager makes Windows programs with, served at
// https://studio.penguinmod.com/__packager-electron__/. Like the offline library it sits in
// resources/packager-electron, has its own release (app/packager-electron.json) and is downloaded once.
// PMDESKTOP_PACKAGER_ELECTRON_DIR points elsewhere (the local test uses it).
const ELECTRON_DIR = process.env.PMDESKTOP_PACKAGER_ELECTRON_DIR || path.join(process.resourcesPath, "packager-electron");
const ELECTRON_PREFIX = "/__packager-electron__/";
// Offline text to speech (onnxruntime-web, voices, models), served at
// https://studio.penguinmod.com/__speech__/<pack>/. Each pack is downloaded on its own the first
// time a project needs it (app/speech-models.json). PMDESKTOP_SPEECH_DIR points elsewhere (the local test uses it).
const SPEECH_DIR = process.env.PMDESKTOP_SPEECH_DIR || path.join(process.resourcesPath, "speech-models");
const SPEECH_PREFIX = "/__speech__/";

// The offline packager (CI builds it from the Wolowolf/PenguinMod-Packager fork with the editor's
// own VM and Render), at the address the editor's "Package project" button opens.
const PACKAGER_PATH = "/PenguinMod-Packager";

const folders = {
  editor: path.join(__dirname, "build"),
  packager: path.join(__dirname, "PenguinMod-Packager"),
  turbowarp: path.join(__dirname, "TurboWarp-ExtensionsGallery"),
  penguinmod: path.join(__dirname, "PenguinMod-ExtensionsGallery"),
  sharkpools: path.join(__dirname, "SharkPools-Extensions"),
};

function getNodeJSSetting() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
      return data.__I_KNOW_WHAT_IM_DOING_CLANKER_SO_DANGEROUSLY_ENABLE_NODEJS__ || false;
    }
  } catch (err) {
    console.error("[Settings] Load error:", err);
  }
  return false;
}

function getLocalFile(url) {
  const parsed = new URL(url);
  const pathClean = parsed.pathname.replace(/^\/+/, "");

  if (/^https:\/\/extensions\.turbowarp\.org\//.test(url)) {
    return path.join(folders.turbowarp, pathClean);
  }
  if (/^https:\/\/extensions\.penguinmod\.com\//.test(url)) {
    return path.join(folders.penguinmod, pathClean);
  }
  if (/^https:\/\/sharkpool-sp\.github\.io\/SharkPools-Extensions/.test(url)) {
    const localPath = parsed.pathname.replace(/^\/SharkPools-Extensions\/?/, "");
    return path.join(folders.sharkpools, localPath);
  }
  if (/^https:\/\/sharkpools-extensions\.vercel\.app\//.test(url)) {
    return path.join(folders.sharkpools, pathClean);
  }
  if (/^https:\/\/raw\.githubusercontent\.com\/SharkPool-SP\/SharkPools-Extensions\/refs\/heads\/main\//.test(url)) {
    const localPath = parsed.pathname.replace(/^\/SharkPools-Extensions\/refs\/heads\/main\/?/, "");
    return path.join(folders.sharkpools, localPath);
  }
  return null;
}

// ---- extension names (Session 73) ------------------------------------------------------------
// The editor treats the extensions of the three offline galleries like built-ins: a project saves
// only the extension's ID, and this list (ID => gallery address) tells the editor where to load
// it from. It is read from the gallery folders once (the ID is the first `id:` after `getInfo`
// in each extension file); a file whose ID can't be found is left out and keeps being saved with
// its address, as before.
let extensionIdTable = null;
function getExtensionIdTable() {
  if (extensionIdTable) return extensionIdTable;
  const table = {};
  const roots = [
    { dir: folders.penguinmod, base: "https://extensions.penguinmod.com/", sub: "extensions" },
    { dir: folders.turbowarp, base: "https://extensions.turbowarp.org/", sub: "" },
    { dir: folders.sharkpools, base: "https://sharkpools-extensions.vercel.app/", sub: "extension-code" }
  ];
  const walk = (dir, rel, base) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const entry of entries) {
      if (entry.name === "node_modules") continue;
      const full = path.join(dir, entry.name);
      const relPath = rel ? rel + "/" + entry.name : entry.name;
      if (entry.isDirectory()) { walk(full, relPath, base); continue; }
      if (!entry.name.endsWith(".js")) continue;
      let source;
      try { source = fs.readFileSync(full, "utf8"); } catch (e) { continue; }
      if (!/Scratch\.extensions\.register/.test(source)) continue;
      const getInfoAt = source.indexOf("getInfo");
      if (getInfoAt < 0) continue;
      const match = /\bid\s*:\s*(['"`])([A-Za-z0-9_.\-]+)\1/.exec(source.slice(getInfoAt));
      if (!match || Object.prototype.hasOwnProperty.call(table, match[2])) continue;
      table[match[2]] = base + relPath.split("/").map(encodeURIComponent).join("/");
    }
  };
  for (const root of roots) {
    const start = root.sub ? path.join(root.dir, root.sub) : root.dir;
    walk(start, root.sub, root.base);
  }
  extensionIdTable = table;
  return table;
}

// ---- in-app updater ------------------------------------------------------------------------

// The folder the app is installed in (where "PenguinMod Desktop.exe" is), or null if this copy
// can't be updated in place (running from source, not Windows, unexpected layout).
function getInstallDir() {
  if (!app.isPackaged || process.platform !== "win32") return null;
  const dir = path.dirname(process.execPath);
  const expected = path.join(dir, "resources", "app", "app");
  if (path.resolve(__dirname).toLowerCase() !== expected.toLowerCase()) return null;
  return dir;
}

// Written by the CI build: which release this copy of the app was built as.
function readBuildInfo() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, "build-info.json"), "utf8"));
  } catch {
    return null;
  }
}

function sendUpdateProgress(phase, percent, text) {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("update-progress", { phase, percent, text });
    }
  } catch { }
}

async function runUpdateCheck(win) {
  if (updateInProgress) return;
  const say = (type, message, detail) =>
    dialog.showMessageBoxSync(win, { type, buttons: ["OK"], message, detail, noLink: true });

  const installDir = getInstallDir();
  if (!installDir) {
    say("info", "Updates are only available in the installed Windows app.",
      "This copy isn't running from an installed (or unzipped) build, so it can't be updated in place.");
    return;
  }

  updateInProgress = true;
  const tmpZip = path.join(os.tmpdir(), `penguinmod-update-${process.pid}.zip`);
  try {
    const res = await net.fetch(`https://api.github.com/repos/${UPDATE_REPO}/releases?per_page=30`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) {
      throw new Error(`GitHub answered HTTP ${res.status}` + (res.status === 403 ? " (too many requests, try again later)." : "."));
    }
    const found = updater.pickRelease(await res.json(), UPDATE_REPO, UPDATE_ASSET);
    if (!found) {
      say("info", "No update found.", `There is no finished release with ${UPDATE_ASSET} in ${UPDATE_REPO} yet.`);
      return;
    }
    const { release, asset } = found;
    const current = readBuildInfo();
    if (current && current.tag === release.tag_name) {
      const offeredLibrary = await offerLibrary(win, installDir);
      const offeredElectron = await offerElectron(win, installDir);
      if (offeredLibrary || offeredElectron) return;
      say("info", "You're up to date.", `Installed build: ${release.tag_name}`);
      return;
    }

    const mb = (asset.size / 1024 / 1024).toFixed(0);
    const choice = dialog.showMessageBoxSync(win, {
      type: "question",
      buttons: ["Install update", "Cancel"],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
      message: "An update is available.",
      detail:
        `New build: ${release.tag_name}\n` +
        `Installed: ${current ? current.tag : "unknown"}\n` +
        `Download size: about ${mb} MB\n` +
        "(plus, only if this update needs a newer one: the offline library, about 180 MB, " +
        "and the packager's Electron, about 92 MB)\n\n" +
        "The app will restart when it is done. Save your project first; unsaved changes are lost. " +
        "Your settings and saved files are not touched.",
    });
    if (choice !== 0) return;

    updater.assertWritable(installDir);
    await updater.downloadFile(net.fetch.bind(net), asset.browser_download_url, tmpZip, {
      expectedSize: asset.size,
      expectedDigest: asset.digest || "",
      onProgress: sendUpdateProgress,
    });
    // The offline library first: the running (old) app doesn't use it, so a new one can be put in place
    // safely. If this fails, nothing of the app is changed.
    const libraryPin = await updater.libraryPinFromZip(tmpZip);
    if (updater.libraryNeeded(installDir, libraryPin)) await installLibrary(installDir, libraryPin);
    const electronPin = await updater.electronPinFromZip(tmpZip);
    if (updater.electronNeeded(installDir, electronPin)) await installElectron(installDir, electronPin);
    updater.cleanupLeftovers(LEFTOVERS_FILE, installDir);
    const result = await updater.applyUpdateFromZip(tmpZip, installDir, {
      exeName: path.basename(process.execPath),
      leftoversFile: LEFTOVERS_FILE,
      onProgress: sendUpdateProgress,
    });

    sendUpdateProgress("done");
    say("info", "Update installed.",
      `${result.changed} file(s) replaced, ${result.added} added, ${result.removed} removed.\nThe app will restart now.`);
    isQuitting = true;
    app.relaunch();
    app.exit(0);
  } catch (err) {
    console.error("[updater] failed", err);
    sendUpdateProgress("done");
    say("error", "The update failed.", String((err && err.message) || err));
  } finally {
    updateInProgress = false;
    try { fs.unlinkSync(tmpZip); } catch { }
  }
}

function cleanupOldUpdateFiles() {
  const installDir = getInstallDir();
  if (!installDir) return;
  try { updater.cleanupLeftovers(LEFTOVERS_FILE, installDir); } catch { }
  try { updater.cleanupLibraryLeftovers(installDir); } catch { }
}

// Downloads the offline library this app needs from the fork's release and puts it in place.
async function installLibrary(installDir, pin) {
  const tmpZip = path.join(os.tmpdir(), `penguinmod-library-${process.pid}.zip`);
  try {
    await updater.downloadFile(net.fetch.bind(net), updater.libraryUrl(UPDATE_REPO, pin), tmpZip, {
      expectedSize: pin.size || 0,
      expectedDigest: pin.sha256 ? `sha256:${pin.sha256}` : "",
      onProgress: sendUpdateProgress,
    });
    await updater.installLibraryFromZip(tmpZip, installDir, pin, sendUpdateProgress);
  } finally {
    try { fs.unlinkSync(tmpZip); } catch { }
  }
}

// If this app's offline library is missing or out of date (for example after updating from a version
// that didn't have one), offers to download it. Returns false only when nothing was needed.
async function offerLibrary(win, installDir) {
  const pin = updater.readLibraryPin(path.join(__dirname, "offline-library.json"));
  if (!updater.libraryNeeded(installDir, pin)) return false;
  const choice = dialog.showMessageBoxSync(win, {
    type: "question",
    buttons: ["Download", "Not now"],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
    message: "The offline library is missing or out of date.",
    detail:
      "It holds the Kenney sprites, backdrops and sounds, the game-icons.net icons and the sound generators " +
      `used by the libraries.\nDownload size: about ${Math.round((pin.size || 0) / 1048576)} MB, only once.`,
  });
  if (choice !== 0) return true;
  updater.assertWritable(installDir);
  await installLibrary(installDir, pin);
  sendUpdateProgress("done");
  dialog.showMessageBoxSync(win, { type: "info", buttons: ["OK"], noLink: true, message: "The offline library is installed." });
  return true;
}

// Downloads the packager's Electron zip this app needs from the fork's release and puts it in place.
async function installElectron(installDir, pin) {
  const tmpFile = path.join(os.tmpdir(), `penguinmod-electron-${process.pid}.zip`);
  try {
    await updater.downloadFile(net.fetch.bind(net), updater.libraryUrl(UPDATE_REPO, pin), tmpFile, {
      expectedSize: pin.size || 0,
      expectedDigest: pin.sha256 ? `sha256:${pin.sha256}` : "",
      onProgress: sendUpdateProgress,
    });
    updater.installElectronFile(tmpFile, installDir, pin);
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { }
  }
}

// If the packager's Electron is missing or out of date (an app updated by an updater from before
// Session 30 has none), offers to download it. Returns false only when nothing was needed.
async function offerElectron(win, installDir) {
  const pin = updater.readLibraryPin(path.join(__dirname, "packager-electron.json"));
  if (!updater.electronNeeded(installDir, pin)) return false;
  const choice = dialog.showMessageBoxSync(win, {
    type: "question",
    buttons: ["Download", "Not now"],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
    message: "The packager's Electron is missing or out of date.",
    detail:
      "The packager needs it to make Windows programs (\"Electron Windows application\"); HTML and zip " +
      `don't.\nDownload size: about ${Math.round((pin.size || 0) / 1048576)} MB, only once.`,
  });
  if (choice !== 0) return true;
  updater.assertWritable(installDir);
  await installElectron(installDir, pin);
  sendUpdateProgress("done");
  dialog.showMessageBoxSync(win, { type: "info", buttons: ["OK"], noLink: true,
    message: "The packager's Electron is installed.", detail: "Click \"Package\" in the packager again." });
  return true;
}

// The packager asked for an Electron zip the app doesn't have: offer the download (after the
// request has been answered, so the packager isn't left waiting).
function offerElectronOnRequest() {
  const installDir = getInstallDir();
  if (!installDir || updateInProgress) return;
  updateInProgress = true;
  setTimeout(async () => {
    const win = BrowserWindow.getFocusedWindow() || mainWindow;
    try {
      await offerElectron(win, installDir);
    } catch (err) {
      console.error("[packager-electron] failed", err);
      sendUpdateProgress("done");
      dialog.showMessageBoxSync(win, { type: "error", buttons: ["OK"], noLink: true,
        message: "The packager's Electron could not be installed.", detail: String((err && err.message) || err) });
    } finally {
      updateInProgress = false;
    }
  }, 0);
}

// Offline text to speech asks for the packs a project needs (/__speech__/install?packs=a,b): offers
// to download the missing ones (app/speech-models.json) and answers {ok} once they are in place.
async function installSpeechPacksOnRequest(names) {
  const pin = (() => {
    try { return JSON.parse(fs.readFileSync(path.join(__dirname, "speech-models.json"), "utf8")); } catch { return null; }
  })();
  if (!pin || !pin.packs || names.some((name) => !pin.packs[name])) return { ok: false, reason: "unknown" };
  const missing = names.filter((name) => updater.speechPackNeeded(SPEECH_DIR, name, pin.packs[name]));
  if (!missing.length) return { ok: true };
  if (updateInProgress) return { ok: false, reason: "busy" };
  updateInProgress = true;
  const win = BrowserWindow.getFocusedWindow() || mainWindow;
  try {
    const size = missing.reduce((sum, name) => sum + pin.packs[name].size, 0);
    const choice = dialog.showMessageBoxSync(win, {
      type: "question",
      buttons: ["Download", "Not now"],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
      message: "Text to speech needs files that are not downloaded yet.",
      detail: `${missing.join(", ")}\nDownload size: about ${Math.round(size / 1048576)} MB, only once. ` +
        "After that, speech works offline.",
    });
    if (choice !== 0) return { ok: false, reason: "declined" };
    fs.mkdirSync(SPEECH_DIR, { recursive: true });
    fs.accessSync(SPEECH_DIR, fs.constants.W_OK);
    for (const name of missing) {
      await updater.installSpeechPack(net.fetch.bind(net), UPDATE_REPO, pin.tag, SPEECH_DIR, name, pin.packs[name], sendUpdateProgress);
    }
    sendUpdateProgress("done");
    return { ok: true };
  } catch (err) {
    console.error("[speech-models] failed", err);
    sendUpdateProgress("done");
    dialog.showMessageBoxSync(win, { type: "error", buttons: ["OK"], noLink: true,
      message: "The text to speech files could not be downloaded.", detail: String((err && err.message) || err) });
    return { ok: false, reason: "failed" };
  } finally {
    updateInProgress = false;
  }
}

async function offerLibraryAtStart(win) {
  const installDir = getInstallDir();
  if (!installDir || updateInProgress) return;
  updateInProgress = true;
  try {
    await offerLibrary(win, installDir);
  } catch (err) {
    console.error("[library] failed", err);
    sendUpdateProgress("done");
    dialog.showMessageBoxSync(win, { type: "error", buttons: ["OK"], noLink: true,
      message: "The offline library could not be installed.", detail: String((err && err.message) || err) });
  } finally {
    updateInProgress = false;
  }
}

function setupAppMenu(win) {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ label: app.name, submenu: [{ role: 'quit' }] }] : []),
    {
      label: 'System',
      submenu: [
        { label: 'Check for Updates', click: () => runUpdateCheck(win) },
        { label: 'Reload', click: () => win.webContents.reloadIgnoringCache() }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// shitty patch because for some reason using data uris in project_url param errors here
const pendingLocalFiles = new Map();

function storeLocalFile(filePath) {
  const buf = fs.readFileSync(filePath);
  const id = `localfile-${Date.now()}`;
  pendingLocalFiles.set(id, buf);
  return `https://studio.penguinmod.com/__localfile__/${id}`;
}

// ---- game login (Google Auth / Discord Auth extensions) ----------------------------------------
// Opens a Google or Discord login page in the user's own browser and waits on this PC
// (http://127.0.0.1) for the page the login sends the user back to (OAuth "loopback" redirect).
// A redirect_uri without a port gets a free one. Answers {redirectUri, params} or {error}.
// The same helper is in the packager's template for packaged desktop games.
const LOGIN_PAGES = [
  { host: "accounts.google.com", path: "/o/oauth2/" },
  { host: "discord.com", path: "/oauth2/authorize" },
  { host: "discord.com", path: "/api/oauth2/authorize" },
];
let stopLogin = null;
ipcMain.handle("pm-login-loopback", (event, authUrl) => new Promise((resolve) => {
  if (stopLogin) stopLogin({ error: "another login started" });
  let auth, redirect;
  try {
    auth = new URL(String(authUrl));
    redirect = new URL(auth.searchParams.get("redirect_uri") || "");
  } catch (_) {
    resolve({ error: "bad login address" });
    return;
  }
  if (auth.protocol !== "https:" || !LOGIN_PAGES.some((p) => auth.host === p.host && auth.pathname.startsWith(p.path))) {
    resolve({ error: "not a Google or Discord login page" });
    return;
  }
  if (redirect.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(redirect.hostname)) {
    resolve({ error: "the return address must start with http://127.0.0.1" });
    return;
  }
  const http = require("http");
  let timer = null;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, redirect.origin);
    if (url.pathname !== redirect.pathname) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end('<!doctype html><meta charset="utf-8"><title>Login</title>' +
      '<p style="font:16px sans-serif;margin:40px">Done. You can close this tab and go back to the game.</p>');
    finish({ redirectUri: redirect.href, params: Object.fromEntries(url.searchParams) });
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  const finish = (answer) => {
    if (stopLogin !== finish) return;
    stopLogin = null;
    clearTimeout(timer);
    server.close();
    resolve(answer);
  };
  stopLogin = finish;
  server.on("error", (err) => finish({ error: err.code === "EADDRINUSE" ? `port ${redirect.port} is already in use` : String(err.message || err) }));
  timer = setTimeout(() => finish({ error: "timed out" }), 5 * 60 * 1000);
  const host = redirect.hostname === "[::1]" ? "::1" : "127.0.0.1";
  server.listen(Number(redirect.port) || 0, host, () => {
    if (!redirect.port) {
      redirect.port = String(server.address().port);
      auth.searchParams.set("redirect_uri", redirect.href);
    }
    shell.openExternal(auth.href).catch((err) => finish({ error: String(err.message || err) }));
  });
}));
ipcMain.handle("pm-login-cancel", () => {
  if (stopLogin) stopLogin({ error: "cancelled" });
});

// ---- asset libraries: key sign-up pages and downloads ----------------------------------------

// Only these pages (where the library keys are made) can be opened in the user's own browser.
const KEY_PAGES = ["pixabay.com", "pro.europeana.eu", "www.europeana.eu", "api.openverse.org", "docs.openverse.org"];
ipcMain.handle("pm-open-external", async (_event, url) => {
  try {
    const u = new URL(url);
    if (u.protocol === "https:" && KEY_PAGES.includes(u.host)) {
      await shell.openExternal(u.href);
      return true;
    }
  } catch (_) { }
  return false;
});

// Downloads a picture or a sound for the libraries when its site doesn't allow pages to (no CORS) or
// doesn't answer the page. Only images and audio, at most 40 MB and 30 s, in a separate session
// without this app's cookies. With `range` ("bytes=<from>-<to>", at most 256 KB) only that part of the
// file, e.g. short samples of a song for its waveform colours; `total` is then the file's whole size. net.request, not fetch: Electron's fetch gets stuck (no answer, an error
// in the log) when a server sends a header with non-English letters, e.g. a museum's file name.
const MAX_ASSET_BYTES = 40 * 1024 * 1024;
const ASSET_TIMEOUT = 30000;
const MAX_RANGE_BYTES = 256 * 1024;
let assetSession = null;
ipcMain.handle("pm-fetch-bytes", (_event, url, range) => new Promise((resolve) => {
  let u;
  try {
    u = new URL(url);
  } catch (_) {
    resolve({ ok: false, status: 0 });
    return;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    resolve({ ok: false, status: 0 });
    return;
  }
  const part = typeof range === "string" ? /^bytes=(\d{1,10})-(\d{1,10})$/.exec(range) : null;
  if (range !== undefined && range !== null && (!part || +part[2] < +part[1] || +part[2] - +part[1] >= MAX_RANGE_BYTES)) {
    resolve({ ok: false, status: 0 });
    return;
  }
  if (!assetSession) assetSession = session.fromPartition("pm-asset-downloads");
  const req = net.request({ url: u.href, session: assetSession });
  if (part) req.setHeader("Range", range);
  const timer = setTimeout(() => finish({ ok: false, status: 408 }), ASSET_TIMEOUT);
  let finished = false;
  function finish(result) {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    if (!result.ok) req.abort();
    resolve(result);
  }
  req.on("response", (res) => {
    const header = (name) => String([].concat(res.headers[name] || "")[0]);
    const type = header("content-type");
    if (res.statusCode < 200 || res.statusCode > 299 || !/^(image|audio)\//i.test(type) ||
      (part && res.statusCode !== 206)) { // a server that ignores the range would send the whole file
      finish({ ok: false, status: res.statusCode });
      return;
    }
    const total = part ? Number((/\/(\d+)$/.exec(header("content-range")) || [])[1]) || 0 : 0;
    if (+(header("content-length") || 0) > MAX_ASSET_BYTES) {
      finish({ ok: false, status: 413 });
      return;
    }
    const chunks = [];
    let size = 0;
    res.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_ASSET_BYTES) finish({ ok: false, status: 413 });
      else chunks.push(chunk);
    });
    res.on("end", () => {
      const buf = Buffer.concat(chunks);
      finish({ ok: true, status: res.statusCode, type, total, data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length) });
    });
    res.on("error", () => finish({ ok: false, status: 0 }));
  });
  req.on("error", () => finish({ ok: false, status: 0 }));
  req.end();
}));

// Openverse and Pixabay say in each answer how much of their request limit is left, but don't let
// pages read it: these answers get an Access-Control-Expose-Headers entry for the library's counter.
const LIMIT_HOSTS = ["api.openverse.org", "pixabay.com"];
function exposeLimitHeaders(res) {
  const names = [];
  res.headers.forEach((_value, name) => {
    if (/ratelimit/i.test(name)) names.push(name);
  });
  if (!names.length) return res;
  const headers = new Headers(res.headers);
  const exposed = headers.get("access-control-expose-headers");
  headers.set("access-control-expose-headers", (exposed ? exposed + ", " : "") + names.join(", "));
  const noBody = [101, 204, 205, 304].includes(res.status);
  return new Response(noBody ? null : res.body, { status: res.status, statusText: res.statusText, headers });
}

// The editor's Extensions tab reads the offline galleries' extension lists (section 46), which come
// from other addresses than the editor's: their files say every page may read them.
function allowAnyReader(res) {
  const headers = new Headers(res.headers);
  headers.set("access-control-allow-origin", "*");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

// A file of the offline library, the packager or its Electron, or 404 (never the internet). Paths
// can't leave `dir`.
function serveFolderFile(dir, encodedPath) {
  try {
    const parts = encodedPath.split("/").map(decodeURIComponent);
    if (parts.some((p) => !p || p === "." || p === ".." || /[\\\0]/.test(p))) throw new Error("bad path");
    const base = path.resolve(dir);
    const filePath = path.resolve(base, ...parts);
    if (filePath.startsWith(base + path.sep) && fs.statSync(filePath).isFile()) {
      return net.fetch(pathToFileURL(filePath).href);
    }
  } catch (_) { }
  return new Response("Not found", { status: 404 });
}

// The packager page uses relative links, so its address without the final "/" is sent to the one
// with it; a folder address gets the folder's index.html.
function servePackagerFile(url) {
  if (url.pathname === PACKAGER_PATH) {
    return Response.redirect(`https://${url.host}${PACKAGER_PATH}/${url.search}`, 301);
  }
  let rest = url.pathname.slice(PACKAGER_PATH.length + 1);
  if (!rest || rest.endsWith("/")) rest += "index.html";
  return serveFolderFile(folders.packager, rest);
}

// ---- upstream servers ----------------------------------------------------------------------------
// The app never contacts the servers of the projects it is built from (PenguinMod, TurboWarp,
// SharkPool) or Scratch's. The addresses it serves itself (the editor at studio.penguinmod.com, the
// extension galleries) come from its own folders above; anything missing there is answered "blocked"
// instead of being fetched online. Online sources of the asset libraries (Openverse, Pixabay, ...) and
// other third parties are not affected. (The packager and its Electron zip are served by the app too.)
// To reverse: delete this block, its check in setupProtocol() and setupUpstreamBlock().
const UPSTREAM_DOMAINS = ["penguinmod.com", "turbowarp.org", "turbowarp.xyz", "scratch.mit.edu"];
const UPSTREAM_HOSTS = [
  "sharkpool-sp.github.io", "sharkpools-extensions.vercel.app",
  "penguinmod-extensions-gallery.vercel.app", "pm-bapi.vercel.app",
];
// raw.githubusercontent.com/<owner>/ and api.github.com/repos/<owner>/ (the SharkPool gallery asked
// GitHub for SharkPool's newest commits); api.github.com/repos/Wolowolf/ (the updater) is not affected.
const UPSTREAM_GITHUB_OWNERS = ["penguinmod", "turbowarp", "sharkpool-sp"];
function isUpstreamUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (_) {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  if (UPSTREAM_HOSTS.includes(host)) return true;
  if (UPSTREAM_DOMAINS.some((domain) => host === domain || host.endsWith("." + domain))) return true;
  const pathParts = parsed.pathname.split("/");
  if (host === "raw.githubusercontent.com") {
    return UPSTREAM_GITHUB_OWNERS.includes((pathParts[1] || "").toLowerCase());
  }
  if (host === "api.github.com" && (pathParts[1] === "repos" || pathParts[1] === "users")) {
    return UPSTREAM_GITHUB_OWNERS.includes((pathParts[2] || "").toLowerCase());
  }
  return false;
}

// https is handled by setupProtocol(); this covers the other kinds of connection.
function setupUpstreamBlock() {
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ["http://*/*", "ws://*/*", "wss://*/*"] },
    (details, callback) => callback({ cancel: isUpstreamUrl(details.url) })
  );
}

function setupProtocol() {
  protocol.handle("https", (request) => {
    try {
      const url = new URL(request.url);

      if (url.host === "studio.penguinmod.com" && url.pathname.startsWith("/__localfile__/")) {
        const id = url.pathname.replace("/__localfile__/", "");
        const buf = pendingLocalFiles.get(id);
        if (buf) {
          pendingLocalFiles.delete(id);
          return new Response(buf, {
            headers: { "Content-Type": "application/octet-stream" }
          });
        }
        return new Response("Not found", { status: 404 });
      }
      if (url.host === "studio.penguinmod.com" && url.pathname === "/__extension-ids__.json") {
        return new Response(JSON.stringify(getExtensionIdTable()), {
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
        });
      }
      if (url.host === "studio.penguinmod.com" && url.pathname.startsWith(LIBRARY_PREFIX)) {
        return serveFolderFile(LIBRARY_DIR, url.pathname.slice(LIBRARY_PREFIX.length));
      }
      if (url.host === "studio.penguinmod.com" &&
        (url.pathname === PACKAGER_PATH || url.pathname.startsWith(PACKAGER_PATH + "/"))) {
        return servePackagerFile(url);
      }
      if (url.host === "studio.penguinmod.com" && url.pathname.startsWith(ELECTRON_PREFIX)) {
        const res = serveFolderFile(ELECTRON_DIR, url.pathname.slice(ELECTRON_PREFIX.length));
        if (res instanceof Response && res.status === 404) offerElectronOnRequest();
        return res;
      }
      // The pack list (files, sizes) for the packager, which copies the files a project uses
      if (url.host === "studio.penguinmod.com" && url.pathname === SPEECH_PREFIX + "packs.json") {
        return new Response(fs.readFileSync(path.join(__dirname, "speech-models.json")), {
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
        });
      }
      if (url.host === "studio.penguinmod.com" && url.pathname === SPEECH_PREFIX + "install") {
        const names = (url.searchParams.get("packs") || "").split(",").filter(Boolean);
        return installSpeechPacksOnRequest(names).then((result) => new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
        }));
      }
      if (url.host === "studio.penguinmod.com" && url.pathname.startsWith(SPEECH_PREFIX)) {
        return serveFolderFile(SPEECH_DIR, url.pathname.slice(SPEECH_PREFIX.length));
      }
      const hostMap = {
        "studio.penguinmod.com": { dir: folders.editor, def: "editor.html" },
        "extensions.penguinmod.com": { dir: folders.penguinmod, def: "index.html" },
        "extensions.turbowarp.org": { dir: folders.turbowarp, def: "index.html" }
      };

      if (hostMap[url.host]) {
        const cfg = hostMap[url.host];
        let filename = url.pathname.replace(/^\/+/, "");
        if (!filename || filename === cfg.def) filename = cfg.def;

        const filePath = path.join(cfg.dir, filename);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const fileUrl = new URL('file://' + filePath);
          fileUrl.search = url.search;
          fileUrl.hash = url.hash;
          if (url.host === "studio.penguinmod.com") return net.fetch(fileUrl.href);
          return net.fetch(fileUrl.href).then(allowAnyReader);
        }
      }

      if (["sharkpools-extensions.vercel.app", "sharkpool-sp.github.io"].includes(url.host)) {
        let filename = url.pathname.replace(/^\/+/, "");
        if (filename.startsWith("SharkPools-Extensions")) {
          filename = filename.replace("SharkPools-Extensions", "");
        }
        filename = filename.replace(/^\/+/, "");
        if (!filename) filename = "index.html";

        const filePath = path.join(folders.sharkpools, filename);
        const decoded = decodeURIComponent(filePath);
        if (fs.existsSync(decoded) && fs.statSync(decoded).isFile()) {
          const fileUrl = new URL('file://' + filePath);
          fileUrl.search = url.search;
          fileUrl.hash = url.hash;
          return net.fetch(fileUrl.href).then(allowAnyReader);
        }
      }

      const filePath = getLocalFile(request.url);
      if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const fileUrl = new URL('file://' + filePath);
        fileUrl.search = url.search;
        fileUrl.hash = url.hash;
        return net.fetch(fileUrl.href);
      }
      if (isUpstreamUrl(request.url)) {
        return new Response("Blocked: this app does not contact this server.", { status: 403 });
      }
      if (LIMIT_HOSTS.includes(url.host)) {
        return net.fetch(request, { bypassCustomProtocolHandlers: true }).then(exposeLimitHeaders);
      }
    } catch (err) {
      console.error(`[HTTPS Interceptor] Error parsing ${request.url}:`, err);
    }
    return net.fetch(request, { bypassCustomProtocolHandlers: true });
  });
}

function setupHeaderSpoofing() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = details.responseHeaders;
    delete headers["x-frame-options"];
    delete headers["X-Frame-Options"];
    callback({ responseHeaders: headers });
  });

  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const { requestHeaders, url } = details;
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.host === "www.youtube.com" || parsedUrl.host === "www.youtube-nocookie.com") {
        requestHeaders["Origin"] = "https://penguinmod.com";
        requestHeaders["Referer"] = "https://penguinmod.com/";
      }
    } catch (_) { }
    callback({ requestHeaders });
  });
}

if (process.env.NOPROXY === "true") {
  app.commandLine.appendSwitch('no-proxy-server');
}
// Laptops with two graphics chips: draw the stage with the strong one.
app.commandLine.appendSwitch('force_high_performance_gpu');

app.whenReady().then(() => {
  cleanupOldUpdateFiles();
  setupProtocol();
  setupUpstreamBlock();
  setupHeaderSpoofing();
  const fileToOpen = process.argv.length >= 2 ? process.argv[1] : null;
  createWindow(fileToOpen);
});

// This build is for packaged projects, not for the PenguinMod sharing website: links to the
// website and to Discord do nothing. (studio.penguinmod.com and extensions.penguinmod.com are
// the offline editor and extension gallery and keep working.)
const BLOCKED_HOSTS = [
  "penguinmod.com", "www.penguinmod.com", "projects.penguinmod.com", "docs.penguinmod.com",
  "discord.gg", "discord.com", "www.discord.com"
];
function isBlockedWebsite(url) {
  try {
    return BLOCKED_HOSTS.includes(new URL(url).host);
  } catch (_) {
    return false;
  }
}

app.on("web-contents-created", (_event, contents) => {
  contents.on("will-navigate", (event, url) => {
    if (isBlockedWebsite(url)) event.preventDefault();
  });
});

function createWindow(fileToOpen) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    try { mainWindow.destroy(); } catch { }
    mainWindow = null;
  }
  if (getNodeJSSetting()) {
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: "question",
      buttons: ["OK", "Cancel"],
      defaultId: 0,
      cancelId: 1,
      message: "WARNING!!!",
      detail: "You have the __I_KNOW_WHAT_IM_DOING_CLANKER_SO_DANGEROUSLY_ENABLE_NODEJS__ setting enabled in your setting file, this enables electron's nodejs functionality, this means that ANY PROJECTS OR UNSANDBOXED extensions have UNRESTRICTED ACCESS to your computer, nodejs can run commands, delete or create files without asking, and do tons of horrible stuff without you knowing about, please DO NOT load projects you DO NOT trust, as they can do ANYTHING!!!",
      noLink: true,
    }) === 0;
    if (!choice) app.quit();
  }

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    webPreferences: {
      nodeIntegration: getNodeJSSetting(),
      contextIsolation: !getNodeJSSetting(),
      sandbox: !getNodeJSSetting(),
      nativeWindowOpen: true,
      preload: PRELOAD_PATH,
      webSecurity: !getNodeJSSetting(),
      // Projects keep running at full speed when the window is covered or minimised.
      backgroundThrottling: false,
    },
  });

  let startUrl = "";
  // Only an existing file is opened as a project (an unpackaged app started as "electron ." gets the folder ".").
  if (fileToOpen && fs.statSync(fileToOpen, { throwIfNoEntry: false })?.isFile()) {
    try {
      const projectUrl = storeLocalFile(fileToOpen);
      startUrl = `https://studio.penguinmod.com/editor.html?project_url=${encodeURIComponent(projectUrl)}`;
    } catch (err) {
      console.error("[main] Failed to load local project file:", err);
    }
  }
  mainWindow.loadURL(startUrl.length > 0 ? startUrl : "https://studio.penguinmod.com/editor.html");
  const win = mainWindow;
  win.webContents.once("did-finish-load", () => setTimeout(() => offerLibraryAtStart(win), 2000));

  mainWindow.webContents.on("console-message", ({ level, message, lineNumber, sourceId, frame }) => {
    const prefix = `[renderer:${sourceId}:${lineNumber}]`;
    // Electron 44 gives the level as a word ("info", "warning", "error", "debug"), older versions as 0-3.
    if (level === "warning" || level === "error" || level >= 2) console.error(prefix, message);
    else console.log(prefix, message);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isBlockedWebsite(url)) return { action: "deny" };
    return {
      action: "allow",
      overrideBrowserWindowOptions: {
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: false,
          preload: PRELOAD_PATH,
          webSecurity: true
        }
      }
    };
  });

  setupDialogs();
  setupAppMenu(mainWindow);

  mainWindow.on("closed", () => (mainWindow = null));
  mainWindow.webContents.on('before-input-event', (event, input) => { // allow devtools with ctrl shift i, something breaks that here
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  let isUnloadDialogOpen = false;
  mainWindow.webContents.on("will-prevent-unload", (event) => {
    if (isUnloadDialogOpen) return;
    isUnloadDialogOpen = true;

    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: "warning",
      buttons: ["Leave", "Cancel"],
      defaultId: 0,
      cancelId: 1,
      message: "The page is trying to prevent unload. Do you want to leave?",
      detail: "Any unsaved changes may be lost.",
    });

    isUnloadDialogOpen = false;
    if (choice === 0) event.preventDefault();
  });

  //mainWindow.webContents.on("render-process-gone", () => createWindow());
  //mainWindow.webContents.on("crashed", () => createWindow());

  // reload on window unresponsiveness
  /*mainWindow.on("unresponsive", () => {
      try { mainWindow.webContents.reloadIgnoringCache(); } catch { }
      setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
              try { mainWindow.destroy(); } catch { }
              createWindow();
          }
      }, 1500);
  });*/
}

app.on("before-quit", () => {
  isQuitting = true;
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy();
});

app.on("activate", () => {
  if (mainWindow) {
    mainWindow.show();
  } else {
    const fileToOpen = process.argv.length >= 2 ? process.argv[1] : null;
    createWindow(fileToOpen);
  }
});

app.on("window-all-closed", () => {
  app.quit();
});

process.on("uncaughtException", (err) => console.error("[main] uncaughtException:", err));
process.on("unhandledRejection", (reason) => console.error("[main] unhandledRejection:", reason));

function setupDialogs() {
  ipcMain.on("electron-alert", (event, message, opts = {}) => {
    try {
      dialog.showMessageBoxSync(BrowserWindow.fromWebContents(event.sender), {
        type: opts.type || "info",
        buttons: ["OK"],
        defaultId: 0,
        message: String(message ?? ""),
        detail: opts.detail || undefined,
        noLink: true,
      });
    } catch (e) {
      console.error("[main] alert dialog fail", e);
    }
    event.returnValue = null;
  });

  ipcMain.on("electron-confirm", (event, message, opts = {}) => {
    try {
      const choice = dialog.showMessageBoxSync(BrowserWindow.fromWebContents(event.sender), {
        type: opts.type || "question",
        buttons: opts.buttons || ["OK", "Cancel"],
        defaultId: opts.defaultId === 1 ? 1 : 0,
        cancelId: opts.cancelId === 1 ? 1 : 1,
        message: String(message ?? ""),
        detail: opts.detail || undefined,
        noLink: true,
      });
      event.returnValue = choice === 0;
    } catch (e) {
      console.error("[main] confirm dialog fail", e);
      event.returnValue = false;
    }
  });

  ipcMain.on("electron-prompt-sync", (event, { message, defaultValue }) => {
    const parent = BrowserWindow.fromWebContents(event.sender);
    let result = null;

    const promptWindow = new BrowserWindow({
      width: 400,
      height: 150,
      parent,
      modal: true,
      show: false,
      frame: false,
      transparent: false,
      backgroundColor: "#ffffff",
      resizable: false,
      alwaysOnTop: true,
      webPreferences: { nodeIntegration: true, contextIsolation: false },
    });

    const escapeHtml = (s) => String(s ?? "").replace(/[&<>"'`]/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;"
    })[c]);

    // basic custom prompts template
    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><style>
    html, body { margin:0; height:100%; font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: transparent; }
    .wrapper { height:100%; display:flex; align-items:center; justify-content:center; padding:14px; box-sizing:border-box; }
    .dialog { width:100%; background:white; border-radius:12px; padding:18px; box-sizing:border-box; }
    .message { font-size:14px; margin-bottom:14px; line-height:1.45; max-height:90px; overflow:auto; }
    input { width:100%; padding:8px 10px; font-size:14px; border-radius:6px; border:1px solid #ccc; margin-bottom:18px; box-sizing:border-box; }
    input:focus { outline:none; border-color:#007aff; box-shadow:0 0 0 2px rgba(0,122,255,0.25); }
    .buttons { display:flex; justify-content:flex-end; gap:10px; }
    button { font-size:13px; padding:6px 14px; border-radius:6px; border:none; cursor:pointer; }
    #cancel { background:#f1f1f1; } #cancel:hover { background:#e4e4e4; }
    #ok { background:#007aff; color:white; } #ok:hover { background:#0062cc; }
    </style></head>
    <body>
    <div class="wrapper"><div class="dialog">
    <div class="message">${escapeHtml(message)}</div>
    <input id="input" value="${escapeHtml(defaultValue)}">
    <div class="buttons">
    <button id="cancel">Cancel</button>
    <button id="ok">OK</button>
    </div>
    </div></div>
    <script>
    const { ipcRenderer } = require('electron');
    const input = document.getElementById('input');
    const ok = document.getElementById('ok');
    const cancel = document.getElementById('cancel');
    ok.onclick = () => ipcRenderer.send('electron-prompt-done-sync', input.value);
    cancel.onclick = () => ipcRenderer.send('electron-prompt-done-sync', null);
    input.addEventListener('keydown', e => { if(e.key==='Enter') ok.click(); if(e.key==='Escape') cancel.click(); });
    input.focus(); input.select();
    </script>
    </body></html>`;

    ipcMain.once("electron-prompt-done-sync", (ev, val) => {
      result = val;
      try { promptWindow.destroy(); } catch { }
      event.returnValue = result;
    });

    promptWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
    promptWindow.once("ready-to-show", () => promptWindow.show());
  });
}

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

const folders = {
  editor: path.join(__dirname, "build"),
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
      if (await offerLibrary(win, installDir)) return;
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
        "(plus the offline library, about 180 MB, if this update needs a newer one)\n\n" +
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
// without this app's cookies. net.request, not fetch: Electron's fetch gets stuck (no answer, an error
// in the log) when a server sends a header with non-English letters, e.g. a museum's file name.
const MAX_ASSET_BYTES = 40 * 1024 * 1024;
const ASSET_TIMEOUT = 30000;
let assetSession = null;
ipcMain.handle("pm-fetch-bytes", (_event, url) => new Promise((resolve) => {
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
  if (!assetSession) assetSession = session.fromPartition("pm-asset-downloads");
  const req = net.request({ url: u.href, session: assetSession });
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
    if (res.statusCode < 200 || res.statusCode > 299 || !/^(image|audio)\//i.test(type)) {
      finish({ ok: false, status: res.statusCode });
      return;
    }
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
      finish({ ok: true, status: res.statusCode, type, data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length) });
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

// A file of the offline library, or 404 (never the internet). Paths can't leave LIBRARY_DIR.
function serveLibraryFile(encodedPath) {
  try {
    const parts = encodedPath.split("/").map(decodeURIComponent);
    if (parts.some((p) => !p || p === "." || p === ".." || /[\\\0]/.test(p))) throw new Error("bad path");
    const base = path.resolve(LIBRARY_DIR);
    const filePath = path.resolve(base, ...parts);
    if (filePath.startsWith(base + path.sep) && fs.statSync(filePath).isFile()) {
      return net.fetch(pathToFileURL(filePath).href);
    }
  } catch (_) { }
  return new Response("Not found", { status: 404 });
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
      if (url.host === "studio.penguinmod.com" && url.pathname.startsWith(LIBRARY_PREFIX)) {
        return serveLibraryFile(url.pathname.slice(LIBRARY_PREFIX.length));
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
          return net.fetch(fileUrl.href);
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
          return net.fetch(fileUrl.href);
        }
      }

      const filePath = getLocalFile(request.url);
      if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const fileUrl = new URL('file://' + filePath);
        fileUrl.search = url.search;
        fileUrl.hash = url.hash;
        return net.fetch(fileUrl.href);
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

app.whenReady().then(() => {
  cleanupOldUpdateFiles();
  setupProtocol();
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
    },
  });

  let startUrl = "";
  if (fileToOpen) {
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
    if (level >= 2) console.error(prefix, message);
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

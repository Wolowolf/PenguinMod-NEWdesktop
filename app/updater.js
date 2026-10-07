"use strict";
// Update engine for PenguinMod Desktop (my fork).
// It knows nothing about Electron, so it can be tested on its own.
//
// An update is the `win-unpacked.zip` of a release of the fork. Inside the zip every
// file sits under `builds/win-unpacked/`, which is exactly the layout of the install folder:
//   PenguinMod Desktop.exe, *.dll, *.pak, locales/...     (Electron itself)
//   resources/app/package.json, resources/app/node_modules/...   (dependencies)
//   resources/app/app/...                                  (main.js, preload, editor, extension galleries)
//
// What happens to each file:
//   - different in the zip  -> replaced
//   - only in the zip       -> added
//   - same                  -> left alone
//   - only on disk, inside resources/app (old editor chunks, the old home page, ...) -> removed
//   - only on disk, anywhere else (for example the installer's "Uninstall ....exe") -> never touched
//     (this includes resources/offline-library and resources/packager-electron, which have their own
//     downloads: see the end of this file)
// Nothing in the install folder is changed until the whole zip has been checked and every
// new file has been written next to its old one. If a step then fails, everything is rolled back.

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");
const unzipper = require("unzipper");

const ZIP_PREFIX = "builds/win-unpacked/";
const APP_DIR = "resources/app"; // stale files are only removed below this folder
const OLD = ".old"; // the previous version of a file, kept until the update is finished
const NEW = ".new"; // the new version of a file, written before anything is swapped

const key = (rel) => rel.split(path.sep).join("/").toLowerCase(); // Windows paths are case-insensitive
const noop = () => { };

// Turns a path from the zip into a full path inside installDir, or null if it is not safe.
function safeTarget(installDir, rel) {
  if (!rel || rel.includes("\0")) return null;
  const parts = rel.split("/");
  if (parts.some((p) => p === "" || p === "." || p === "..")) return null;
  const target = path.resolve(installDir, ...parts);
  const r = path.relative(installDir, target);
  if (!r || r.startsWith("..") || path.isAbsolute(r)) return null;
  return target;
}

function listFiles(dir) {
  const out = [];
  (function walk(d) {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out.push(p);
    }
  })(dir);
  return out;
}

function removeIfExists(p) {
  try { fs.unlinkSync(p); } catch (err) { if (err.code !== "ENOENT") throw err; }
}

function pruneEmptyDirs(dir, stopDir) {
  const stop = path.resolve(stopDir);
  let d = path.resolve(dir);
  while (d.length > stop.length && d.toLowerCase().startsWith(stop.toLowerCase())) {
    try { fs.rmdirSync(d); } catch { return; } // not empty (or in use): stop
    d = path.dirname(d);
  }
}

// ---------------------------------------------------------------------------------------------
// Which release to install
// ---------------------------------------------------------------------------------------------

// `releases` is the JSON list from the GitHub API. Returns the newest published release that
// really has the zip uploaded (a release exists a few minutes before its files are attached),
// or null. The asset must come from this repo's own release downloads.
function pickRelease(releases, repo, assetName) {
  if (!Array.isArray(releases)) return null;
  const base = `https://github.com/${repo}/releases/download/`;
  const time = (r) => Date.parse(r.published_at || r.created_at || 0) || 0;
  const sorted = releases.filter((r) => r && !r.draft).sort((a, b) => time(b) - time(a));
  for (const release of sorted) {
    const asset = (release.assets || []).find(
      (a) => a.name === assetName && a.state === "uploaded" && String(a.browser_download_url).startsWith(base)
    );
    if (asset) return { release, asset };
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------------------------

// fetchFn is Electron's net.fetch (or any fetch). Checks the size, and the SHA-256 when GitHub gives one.
async function downloadFile(fetchFn, url, destPath, { expectedSize = 0, expectedDigest = "", onProgress = noop } = {}) {
  const res = await fetchFn(url, { headers: { Accept: "application/octet-stream" } });
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);

  const total = parseInt(res.headers.get("content-length") || "0", 10) || expectedSize;
  const hash = crypto.createHash("sha256");
  const reader = res.body.getReader();
  const fileStream = fs.createWriteStream(destPath);
  let received = 0;

  await new Promise((resolve, reject) => {
    fileStream.on("error", reject);
    function pump() {
      reader.read().then(({ done, value }) => {
        if (done) { fileStream.end(resolve); return; }
        received += value.length;
        hash.update(value);
        const mb = (received / 1024 / 1024).toFixed(1);
        if (total > 0) {
          onProgress("download", Math.round((received / total) * 100), `Downloading… ${mb} / ${(total / 1024 / 1024).toFixed(1)} MB`);
        } else {
          onProgress("download", -1, `Downloading… ${mb} MB`);
        }
        fileStream.write(Buffer.from(value), (err) => (err ? reject(err) : pump()));
      }).catch(reject);
    }
    pump();
  });

  if (expectedSize && received !== expectedSize) {
    throw new Error(`The download is incomplete (${received} of ${expectedSize} bytes).`);
  }
  const sha = hash.digest("hex");
  if (/^sha256:/i.test(expectedDigest) && sha !== expectedDigest.slice(7).toLowerCase()) {
    throw new Error("The download is corrupted (checksum does not match).");
  }
  return { bytes: received, sha256: sha };
}

// ---------------------------------------------------------------------------------------------
// Applying the zip
// ---------------------------------------------------------------------------------------------

// Fails early, before anything is downloaded, if the install folder can't be written to
// (for example when installed under "Program Files" without admin rights).
function assertWritable(installDir) {
  const probe = path.join(installDir, "resources", "app", `.write-test-${process.pid}`);
  try {
    fs.writeFileSync(probe, "x");
    fs.unlinkSync(probe);
  } catch (err) {
    throw new Error(
      `The install folder is not writable (${err.code || err.message}).\n${installDir}\n` +
      "Reinstall into a folder you own (the default per-user location works), or start the app as administrator."
    );
  }
}

// Removes leftovers (.old files) of earlier updates that could not be deleted at the time
// (the running .exe and .dll files can be renamed, but not deleted, while they are in use).
function cleanupLeftovers(leftoversFile, installDir) {
  let list;
  try { list = JSON.parse(fs.readFileSync(leftoversFile, "utf8")); } catch { return; }
  if (!Array.isArray(list)) { removeIfExists(leftoversFile); return; }
  const root = path.resolve(installDir);
  const remaining = [];
  for (const p of list) {
    const full = path.resolve(String(p));
    const inside = path.relative(root, full);
    if (!full.endsWith(OLD) || inside.startsWith("..") || path.isAbsolute(inside)) continue; // never touch anything else
    try {
      removeIfExists(full);
      pruneEmptyDirs(path.dirname(full), path.join(root, ...APP_DIR.split("/")));
    } catch { remaining.push(full); }
  }
  if (remaining.length) fs.writeFileSync(leftoversFile, JSON.stringify(remaining));
  else removeIfExists(leftoversFile);
}

function sameAsEntry(target, entry) {
  let st;
  try { st = fs.statSync(target); } catch { return false; }
  if (!st.isFile() || st.size !== entry.uncompressedSize) return false;
  const data = fs.readFileSync(target);
  if (typeof zlib.crc32 === "function" && typeof entry.crc32 === "number") return zlib.crc32(data) === entry.crc32;
  return null; // can't tell from the checksum, caller compares the content
}

async function planUpdate(zipPath, installDir, requiredEntries, onProgress) {
  const directory = await unzipper.Open.file(zipPath);
  const inZip = new Map(); // lowercase relative path -> { entry, rel, target }
  for (const entry of directory.files) {
    if (entry.type !== "File" || !entry.path.startsWith(ZIP_PREFIX)) continue;
    const rel = entry.path.slice(ZIP_PREFIX.length);
    if (!rel) continue;
    const target = safeTarget(installDir, rel);
    if (!target) throw new Error(`The update contains an unsafe path and was rejected: ${rel}`);
    inZip.set(key(rel), { entry, rel, target });
  }
  for (const req of requiredEntries) {
    if (!inZip.has(key(req))) throw new Error(`The update package is incomplete (missing ${req}); nothing was changed.`);
  }

  const writes = [];
  let unchanged = 0;
  let i = 0;
  for (const item of inZip.values()) {
    i++;
    onProgress("compare", Math.round((i / inZip.size) * 100), item.rel);
    let same = sameAsEntry(item.target, item.entry);
    if (same === null) same = Buffer.compare(fs.readFileSync(item.target), await item.entry.buffer()) === 0;
    if (same) unchanged++;
    else writes.push({ ...item, existed: fs.existsSync(item.target) });
  }

  const appRoot = path.join(installDir, ...APP_DIR.split("/"));
  const stale = [];
  const junk = []; // .old / .new files that earlier runs left behind
  for (const p of listFiles(appRoot)) {
    if (inZip.has(key(path.relative(installDir, p)))) continue;
    if (/\.(old|new)$/i.test(p)) junk.push(p);
    else stale.push(p);
  }
  return { writes, stale, junk, unchanged };
}

// Applies the zip to installDir. Options:
//   exeName        file name of the running .exe (must be in the zip)
//   leftoversFile  where to remember .old files that are still locked
//   onProgress     (phase, percent, text)
// Returns { added, changed, removed, unchanged }.
async function applyUpdateFromZip(zipPath, installDir, { exeName, leftoversFile, onProgress = noop }) {
  const required = [exeName, "resources/app/package.json", "resources/app/app/electron-main.js", "resources/app/app/build/editor.html"];
  const plan = await planUpdate(zipPath, installDir, required, onProgress);

  // 1. Stage: write every new file next to its target as <name>.new. The install is not touched yet.
  const staged = [];
  try {
    let i = 0;
    for (const w of plan.writes) {
      i++;
      onProgress("write", Math.round((i / Math.max(plan.writes.length, 1)) * 100), w.rel);
      fs.mkdirSync(path.dirname(w.target), { recursive: true });
      const data = await w.entry.buffer();
      fs.writeFileSync(w.target + NEW, data);
      staged.push(w.target + NEW);
      if (typeof zlib.crc32 === "function" && typeof w.entry.crc32 === "number" && zlib.crc32(data) !== w.entry.crc32) {
        throw new Error(`Writing ${w.rel} failed (the file on disk does not match the update).`);
      }
    }
  } catch (err) {
    for (const p of staged) { try { removeIfExists(p); } catch { } }
    throw err;
  }

  // 2. Commit: old file -> .old, .new -> real name. Stale files -> .old. Roll back on any error.
  const done = [];
  const tombs = [];
  try {
    let i = 0;
    const total = plan.writes.length + plan.stale.length;
    for (const w of plan.writes) {
      onProgress("swap", Math.round((++i / Math.max(total, 1)) * 100), w.rel);
      let hadOld = false;
      if (fs.existsSync(w.target)) {
        removeIfExists(w.target + OLD);
        fs.renameSync(w.target, w.target + OLD);
        hadOld = true;
        tombs.push(w.target + OLD);
      }
      done.push({ kind: "write", target: w.target, hadOld });
      fs.renameSync(w.target + NEW, w.target);
    }
    for (const p of plan.stale) {
      onProgress("swap", Math.round((++i / Math.max(total, 1)) * 100), path.relative(installDir, p));
      removeIfExists(p + OLD);
      fs.renameSync(p, p + OLD);
      tombs.push(p + OLD);
      done.push({ kind: "remove", target: p });
    }
    for (const req of required) {
      if (!fs.existsSync(path.join(installDir, ...req.split("/")))) throw new Error(`After updating, ${req} is missing.`);
    }
  } catch (err) {
    const failed = [];
    for (const op of done.reverse()) {
      try {
        if (op.kind === "remove") {
          fs.renameSync(op.target + OLD, op.target);
        } else {
          removeIfExists(op.target);
          if (op.hadOld) fs.renameSync(op.target + OLD, op.target);
        }
      } catch (e) { failed.push(path.basename(op.target)); }
    }
    for (const w of plan.writes) { try { removeIfExists(w.target + NEW); } catch { } }
    err.message += failed.length
      ? `\nWARNING: ${failed.length} file(s) could not be restored (${failed.slice(0, 3).join(", ")}${failed.length > 3 ? ", …" : ""}). Please reinstall the app.`
      : "\nThe previous version was restored and nothing was changed.";
    throw err;
  }

  // 3. Clean up. Files that are still in use (the running .exe/.dll) are remembered and deleted at the next start.
  const locked = [];
  for (const p of tombs) {
    try { removeIfExists(p); pruneEmptyDirs(path.dirname(p), path.join(installDir, ...APP_DIR.split("/"))); } catch { locked.push(p); }
  }
  for (const p of plan.junk) { try { removeIfExists(p); } catch { } }
  if (leftoversFile) {
    try {
      if (locked.length) fs.writeFileSync(leftoversFile, JSON.stringify(locked));
      else removeIfExists(leftoversFile);
    } catch { }
  }

  return {
    added: plan.writes.filter((w) => !w.existed).length,
    changed: plan.writes.filter((w) => w.existed).length,
    removed: plan.stale.length,
    unchanged: plan.unchanged,
  };
}

// ---------------------------------------------------------------------------------------------
// Offline library (resources/offline-library: Kenney, game-icons.net, sound generators)
// ---------------------------------------------------------------------------------------------
// It is not in win-unpacked.zip (it would make every update ~180 MB bigger). Each app version says
// which library it needs in app/offline-library.json ({version, tag, asset, size, sha256}); the
// library is a zip in that release of this repo, with every file under `offline-library/`.
// It is downloaded only when the installed version (resources/offline-library/version.json) differs.

const LIBRARY_DIR = "resources/offline-library";
const LIBRARY_PREFIX = "offline-library/";

const libraryDir = (installDir) => path.join(installDir, ...LIBRARY_DIR.split("/"));

function installedLibraryVersion(installDir) {
  try {
    return String(JSON.parse(fs.readFileSync(path.join(libraryDir(installDir), "version.json"), "utf8")).version);
  } catch {
    return null;
  }
}

// Reads a pin file (app/offline-library.json, app/packager-electron.json); null if it is unusable.
function readLibraryPin(file) {
  try {
    const pin = JSON.parse(fs.readFileSync(file, "utf8"));
    return pin && pin.version && pin.tag && pin.asset ? pin : null;
  } catch {
    return null;
  }
}

// A pin an update needs: app/<pinFile> inside the update zip (null if it has none).
async function pinFromZip(zipPath, pinFile) {
  const directory = await unzipper.Open.file(zipPath);
  const entry = directory.files.find((f) => f.path === `${ZIP_PREFIX}resources/app/app/${pinFile}`);
  if (!entry) return null;
  const pin = JSON.parse((await entry.buffer()).toString("utf8"));
  return pin && pin.version && pin.tag && pin.asset ? pin : null;
}

// The library an update needs: app/offline-library.json inside the update zip (null if it has none).
const libraryPinFromZip = (zipPath) => pinFromZip(zipPath, "offline-library.json");

const libraryNeeded = (installDir, pin) => !!pin && installedLibraryVersion(installDir) !== String(pin.version);

// Where a pinned file is: its release of this repo.
const libraryUrl = (repo, pin) =>
  `https://github.com/${repo}/releases/download/${encodeURIComponent(pin.tag)}/${encodeURIComponent(pin.asset)}`;

// Puts a filled staging folder in place of `target`; the old one is put back if that fails.
function replaceFolder(target, staging) {
  const backup = target + OLD;
  fs.rmSync(backup, { recursive: true, force: true });
  if (fs.existsSync(target)) fs.renameSync(target, backup);
  try {
    fs.renameSync(staging, target);
  } catch (err) {
    if (fs.existsSync(backup) && !fs.existsSync(target)) fs.renameSync(backup, target);
    throw err;
  }
  try { fs.rmSync(backup, { recursive: true, force: true }); } catch { }
}

// Unpacks a downloaded (and already checked) library zip next to the old library, then swaps them.
// If the swap fails, the old library is put back.
async function installLibraryFromZip(zipPath, installDir, pin, onProgress = noop) {
  const target = libraryDir(installDir);
  const staging = target + NEW;
  fs.rmSync(staging, { recursive: true, force: true });
  try {
    const directory = await unzipper.Open.file(zipPath);
    const files = directory.files.filter((f) => f.type === "File" && f.path.startsWith(LIBRARY_PREFIX));
    if (!files.length) throw new Error("The offline library download is empty.");
    let i = 0;
    for (const f of files) {
      const rel = f.path.slice(LIBRARY_PREFIX.length);
      const dest = safeTarget(staging, rel);
      if (!dest) throw new Error(`The offline library contains an unsafe path and was rejected: ${rel}`);
      onProgress("library", Math.round((++i / files.length) * 100), rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, await f.buffer());
    }
    const version = String(JSON.parse(fs.readFileSync(path.join(staging, "version.json"), "utf8")).version);
    if (version !== String(pin.version)) throw new Error(`The offline library has version ${version}, expected ${pin.version}.`);
  } catch (err) {
    fs.rmSync(staging, { recursive: true, force: true });
    throw err;
  }
  replaceFolder(target, staging);
}

// Removes half-finished or old library and packager-Electron folders left by an interrupted install.
function cleanupLibraryLeftovers(installDir) {
  for (const dir of [libraryDir(installDir), electronDir(installDir)]) {
    for (const p of [dir + NEW, dir + OLD]) {
      try { fs.rmSync(p, { recursive: true, force: true }); } catch { }
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Electron for the packager (resources/packager-electron)
// ---------------------------------------------------------------------------------------------
// The Windows 64-bit Electron zip the offline packager makes Windows programs with. Like the
// offline library it is not in win-unpacked.zip but in its own release of this repo, pinned in
// app/packager-electron.json ({version, tag, asset, size, sha256}). It is kept as it is (the
// packager reads the zip itself) next to a version.json, and downloaded only when that differs.

const ELECTRON_DIR = "resources/packager-electron";

const electronDir = (installDir) => path.join(installDir, ...ELECTRON_DIR.split("/"));

function installedElectronVersion(installDir) {
  try {
    return String(JSON.parse(fs.readFileSync(path.join(electronDir(installDir), "version.json"), "utf8")).version);
  } catch {
    return null;
  }
}

const electronPinFromZip = (zipPath) => pinFromZip(zipPath, "packager-electron.json");

const electronNeeded = (installDir, pin) => !!pin && installedElectronVersion(installDir) !== String(pin.version);

// Puts a downloaded (and already checked) Electron zip in place, with its version.json, in a new
// folder that then replaces the old one (put back if that fails).
function installElectronFile(filePath, installDir, pin) {
  if (!/^[\w.-]+$/.test(pin.asset) || /^\.+$/.test(pin.asset)) {
    throw new Error(`Unexpected file name for the packager's Electron: ${pin.asset}`);
  }
  const target = electronDir(installDir);
  const staging = target + NEW;
  fs.rmSync(staging, { recursive: true, force: true });
  try {
    fs.mkdirSync(staging, { recursive: true });
    fs.copyFileSync(filePath, path.join(staging, pin.asset));
    fs.writeFileSync(path.join(staging, "version.json"), JSON.stringify({ version: String(pin.version) }) + "\n");
  } catch (err) {
    fs.rmSync(staging, { recursive: true, force: true });
    throw err;
  }
  replaceFolder(target, staging);
}

module.exports = {
  pickRelease, downloadFile, assertWritable, cleanupLeftovers, applyUpdateFromZip, ZIP_PREFIX,
  installedLibraryVersion, readLibraryPin, libraryPinFromZip, libraryNeeded, libraryUrl,
  installLibraryFromZip, cleanupLibraryLeftovers,
  installedElectronVersion, electronPinFromZip, electronNeeded, installElectronFile,
};

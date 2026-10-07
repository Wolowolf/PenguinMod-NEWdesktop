/*
 * Makes the Electron zip the offline packager builds Windows programs from: Electron's official
 * win32-x64 zip with only electron.exe changed (icon and version text), exactly what TurboWarp's
 * electron-bin/generate-windows.js does (so the Electron name and icon are not misused).
 * The app ships it in resources/packager-electron/ (app/packager-electron.json says which release).
 *
 * Run it on a PC (not in CI), then publish the zip as its own release (see CHANGES.md):
 *   npm install --prefix <tools> rcedit@3 extract-zip@2 archiver@5
 *   node scripts/make-packager-electron.mjs --tools <tools> --work <folder> --electron <version> --icon <default-icon.ico>
 *
 * <icon> is src/packager/images/default-icon.ico of the packager. The official zip is downloaded
 * from github.com/electron/electron and checked against the SHASUMS256.txt of the same release.
 * Prints the file name, size and SHA-256 to copy into app/packager-electron.json and the packager
 * fork's src/packager/large-assets.js.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';
import { createRequire } from 'module';

const args = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
for (const required of ['tools', 'work', 'electron', 'icon']) {
  if (!args[required]) { console.error(`Missing --${required} (see the top of this file)`); process.exit(1); }
}
const require = createRequire(path.join(path.resolve(args.tools), 'node_modules', 'x.js'));
const rcedit = require('rcedit');
const extractZip = require('extract-zip');
const archiver = require('archiver');

const version = args.electron;
const work = path.resolve(args.work);
const name = `electron-v${version}-win32-x64.zip`;
const base = `https://github.com/electron/electron/releases/download/v${version}`;
const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');

const download = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
};

fs.rmSync(work, { recursive: true, force: true });
fs.mkdirSync(work, { recursive: true });

console.log(`Downloading Electron ${version}`);
const official = await download(`${base}/${name}`);
const sums = (await download(`${base}/SHASUMS256.txt`)).toString();
const expected = sums.split('\n').map((l) => l.trim().split(/\s+\*?/)).find((p) => p[1] === name)?.[0];
if (!expected) throw new Error(`${name} is not in SHASUMS256.txt`);
if (sha256(official) !== expected) throw new Error('The download does not match SHASUMS256.txt');
console.log(`Official zip: ${official.length} bytes, SHA-256 ${expected} (matches SHASUMS256.txt)`);

const officialPath = path.join(work, `official-${name}`);
fs.writeFileSync(officialPath, official);
const folder = path.join(work, 'files');
await extractZip(officialPath, { dir: folder });

console.log('Running rcedit');
await rcedit(path.join(folder, 'electron.exe'), {
  icon: path.resolve(args.icon),
  // Replace Electron's version with something generic
  'version-string': '1.0.0',
  'file-version': '1.0.0',
  'product-version': '1.0.0'
});

console.log('Compressing');
const out = path.join(work, name);
await new Promise((resolve, reject) => {
  const archive = archiver('zip', { zlib: { level: zlib.constants.Z_BEST_COMPRESSION } });
  const stream = fs.createWriteStream(out);
  stream.on('error', reject);
  stream.on('close', resolve);
  archive.on('error', reject);
  archive.directory(folder, false);
  archive.pipe(stream);
  archive.finalize();
});

const data = fs.readFileSync(out);
console.log(`Output: ${out}`);
console.log(`Size: ${data.length} bytes`);
console.log(`SHA-256: ${sha256(data)}`);

// Deletes the extension files of the offline galleries copied into app/ (CI, after the galleries are
// copied there): every gallery extension is built into the VM, which loads the built-in copy when a
// gallery tile asks for the old address, so the galleries only keep their pages, listings and tiles.
// Also deletes the galleries' other extension scripts that nothing can load (UNLOADABLE below).
// The list is the VM's moved-gallery-extensions.json (ID => old gallery address).
// Usage: node scripts/remove-moved-gallery-files.js <moved-gallery-extensions.json> <app folder>
// Stops with an error if a listed file is not there (the list and the galleries disagree).
const fs = require('fs');
const path = require('path');

const [listFile, appDir] = process.argv.slice(2);
if (!listFile || !appDir) {
  console.error('Usage: node scripts/remove-moved-gallery-files.js <moved-gallery-extensions.json> <app folder>');
  process.exit(1);
}

// Same folders as `folders` in app/electron-main.js
const GALLERIES = [
  { prefix: 'https://extensions.penguinmod.com/', dir: 'PenguinMod-ExtensionsGallery' },
  { prefix: 'https://extensions.turbowarp.org/', dir: 'TurboWarp-ExtensionsGallery' },
  { prefix: 'https://sharkpools-extensions.vercel.app/', dir: 'SharkPools-Extensions' }
];

const moved = JSON.parse(fs.readFileSync(listFile, 'utf8'));
const missing = [];
let removed = 0;
for (const [id, address] of Object.entries(moved)) {
  const gallery = GALLERIES.find(g => address.startsWith(g.prefix));
  if (!gallery) {
    missing.push(`${id}: no gallery for ${address}`);
    continue;
  }
  const file = path.join(appDir, gallery.dir, ...address.slice(gallery.prefix.length).split('/'));
  if (!fs.existsSync(file)) {
    missing.push(`${id}: ${file}`);
    continue;
  }
  fs.unlinkSync(file);
  removed++;
}
if (missing.length) {
  console.error(`Not found (${missing.length}):\n${missing.join('\n')}`);
  process.exit(1);
}
console.log(`Removed ${removed} gallery copies of extensions built into the VM`);

// Other extension scripts in the galleries that nothing can load (test and example extensions, old
// aliases, extensions the app removed). Removed when present.
const UNLOADABLE = [
  'TurboWarp-ExtensionsGallery/test',
  'TurboWarp-ExtensionsGallery/docs-examples',
  'TurboWarp-ExtensionsGallery/LukeManiaStudios',
  'TurboWarp-ExtensionsGallery/TheShovel/CustomStyles.js',
  'TurboWarp-ExtensionsGallery/XmerOriginals',
  'SharkPools-Extensions/tests',
  'SharkPools-Extensions/extension-utils/MO'
];
let removedOther = 0;
for (const item of UNLOADABLE) {
  const target = path.join(appDir, ...item.split('/'));
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true });
    removedOther++;
  }
}
console.log(`Removed ${removedOther} of ${UNLOADABLE.length} unloadable extension scripts or folders`);

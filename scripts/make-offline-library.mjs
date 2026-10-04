/*
 * Builds the offline library: every Kenney pack in library/kenney-packs.json, the game-icons.net
 * icons and the three sound generators (jsfxr, ZzFX, Bfxr) at their commits in upstream.json.
 * The app ships it in resources/offline-library/ and the updater only downloads it when its
 * version changes (library/offline-library.json says which release holds it).
 *
 * Run it on a PC (not in CI), then publish the zip as its own release (see CHANGES.md):
 *   npm install --prefix <tools> pngjs@7 unzipper@0.12
 *   node scripts/make-offline-library.mjs --tools <tools> --work <folder> --version <n> [--zips <folder>]
 *
 * <work> receives offline-library/ (the folder), offline-library-<n>.zip and offline-library.json
 * (the size and SHA-256 to copy into library/offline-library.json). Kenney zips are cached in
 * --zips (default <work>/kenney-zips) and only downloaded when missing.
 *
 * What is kept from each Kenney pack: the PNG images and the sounds, without double-size copies,
 * sprite sheets, vector sources, previews and samples. Packs that only come as tile sheets are cut
 * into single tiles. Images of 32 px or less are enlarged (sharp pixels) so they are usable sprites.
 * An image is also a backdrop when it has no see-through pixels and is big enough to fill the stage.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
for (const required of ['tools', 'work', 'version']) {
    if (!args[required]) throw new Error(`missing --${required} (see the comment at the top of this file)`);
}
const need = createRequire(path.join(path.resolve(args.tools), 'node_modules', 'x.js'));
const { PNG } = need('pngjs');
const unzipper = need('unzipper');

const work = path.resolve(args.work);
const zipsDir = path.resolve(args.zips || path.join(work, 'kenney-zips'));
const out = path.join(work, 'offline-library');
const kenney = JSON.parse(fs.readFileSync(path.join(repo, 'library', 'kenney-packs.json'), 'utf8')).packs;
const pins = JSON.parse(fs.readFileSync(path.join(repo, 'upstream.json'), 'utf8'));

// Backdrop rule: no see-through pixels, at least this big, and not much taller than wide.
const BACKDROP_MIN_SIDE = 192;
const BACKDROP_MIN_RATIO = 0.75; // width / height
const BACKDROP_MAX_RATIO = 3;
const SMALL = 32; // images this small (largest side) are enlarged...
const SMALL_TARGET = 64; // ...by a whole factor, to at least this size

// Opaque, but not backgrounds: kept as sprites only.
const BACKDROP_EXCLUDE = new Set(['light-masks', 'letter-tiles', 'particle-pack']);

const SKIP_DIR = /(^|\/)((double|retina|large \(|spritesheets?|tilesheets?|tilemaps?|vectors?|[2-9]x|@[2-9]x|preview|promo|samples?)[^/]*|[^/]*\([2-9] ?[x×]\))\//i;
const PX_VARIANT = /^(.*) \((\d+)px\)$/; // "Default (128px)" and "Default (256px)": keep the largest
// Plain ASCII paths only (Windows' zip tool can't store "×").
const cleanPath = p => p.replace(/×/g, 'x').replace(/[^\x20-\x7E]/g, '_');
const SKIP_ROOT = /^(preview|sample|cover|thumbnail|promo|license)[^/]*\.(png|jpg)$/i;
const SOUND = /\.(ogg|wav|mp3)$/i;

const titleCase = s => s.replace(/[-_]+/g, ' ').replace(/\b[a-z]/g, c => c.toUpperCase());
const wait = ms => new Promise(r => setTimeout(r, ms));

let filesWritten = 0;
function writeFile(rel, data) {
    filesWritten++;
    const p = path.join(out, ...rel.split('/'));
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, data);
}

// Decodes a PNG; returns { png, opaque } or null if it can't be read.
function readPng(buffer) {
    let png;
    try { png = PNG.sync.read(buffer); } catch { return null; }
    let opaque = true;
    for (let i = 3; i < png.data.length; i += 4) if (png.data[i] !== 255) { opaque = false; break; }
    return { png, opaque };
}

function enlarge(png, k) {
    const big = new PNG({ width: png.width * k, height: png.height * k });
    for (let y = 0; y < big.height; y++) {
        for (let x = 0; x < big.width; x++) {
            const s = (((y / k) | 0) * png.width + ((x / k) | 0)) * 4;
            const d = (y * big.width + x) * 4;
            png.data.copy(big.data, d, s, s + 4);
        }
    }
    return big;
}

// Adds one image to the library. Returns the index entry flags/size, or null if it was skipped.
function addImage(rel, buffer, decoded, noBackdrop = false) {
    const info = decoded || readPng(buffer);
    if (!info) return null;
    const { png, opaque } = info;
    const ratio = png.width / png.height;
    const backdrop = !noBackdrop && opaque && Math.min(png.width, png.height) >= BACKDROP_MIN_SIDE &&
        ratio >= BACKDROP_MIN_RATIO && ratio <= BACKDROP_MAX_RATIO;
    let w = png.width, h = png.height;
    const largest = Math.max(w, h);
    if (largest <= SMALL) {
        const k = Math.ceil(SMALL_TARGET / largest);
        const big = enlarge(png, k);
        buffer = PNG.sync.write(big);
        w = big.width; h = big.height;
    } else if (decoded) {
        buffer = PNG.sync.write(png);
    }
    writeFile(rel, buffer);
    return { flags: 1 | (backdrop ? 2 : 0), w, h };
}

// Tile sheet description, e.g. "Tile size • 16px × 16px" and "Space between tiles • 1px" / "MARGIN: 1".
function sheetLayout(text) {
    const size = text.match(/tile size[^0-9]*(\d+)\s*(?:px)?\s*[x×]\s*(\d+)/i);
    const gap = text.match(/(?:space between tiles|margin)[^0-9]*(\d+)/i);
    return size ? { tw: +size[1], th: +size[2], gap: gap ? +gap[1] : 0 } : null;
}

async function downloadKenney() {
    fs.mkdirSync(zipsDir, { recursive: true });
    for (const [slug, p] of Object.entries(kenney)) {
        const file = path.join(zipsDir, `${slug}.zip`);
        if (fs.existsSync(file) && fs.statSync(file).size === p.bytes) continue;
        console.log(`downloading ${slug}`);
        const res = await fetch(p.zip, { headers: { 'User-Agent': 'PenguinMod Desktop fork (offline library build)' } });
        if (!res.ok) throw new Error(`${slug}: HTTP ${res.status}`);
        fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
        await wait(500);
    }
}

async function addKenney(index) {
    const slugs = Object.keys(kenney).sort();
    for (const slug of slugs) {
        const packIndex = index.packs.push([slug, titleCase(slug), kenney[slug].category]) - 1;
        const dir = await unzipper.Open.file(path.join(zipsDir, `${slug}.zip`));
        const files = dir.files.filter(f => f.type === 'File' && !/(^|\/)\./.test(f.path));
        let kept = files.filter(f => !SKIP_DIR.test(f.path) && !SKIP_ROOT.test(f.path) &&
            (/\.png$/i.test(f.path) || SOUND.test(f.path)));
        // Same image in several "(Npx)" folders: keep the largest size.
        const largest = {};
        const variant = f => {
            const parts = f.path.split('/');
            const i = parts.findIndex(d => PX_VARIANT.test(d));
            if (i === -1) return null;
            const [, base, px] = parts[i].match(PX_VARIANT);
            return { key: [...parts.slice(0, i), base, ...parts.slice(i + 1)].join('/'), px: +px };
        };
        for (const f of kept) {
            const v = variant(f);
            if (v && !(largest[v.key] >= v.px)) largest[v.key] = v.px;
        }
        kept = kept.filter(f => { const v = variant(f); return !v || largest[v.key] === v.px; });
        let count = 0;
        for (const f of kept) {
            const file = cleanPath(f.path);
            const rel = `kenney/${slug}/${file}`;
            const data = await f.buffer();
            if (SOUND.test(f.path)) {
                writeFile(rel, data);
                index.kenney.push([packIndex, file, 4, 0, 0]);
                count++;
                continue;
            }
            const added = addImage(rel, data, null, BACKDROP_EXCLUDE.has(slug));
            if (added) { index.kenney.push([packIndex, file, added.flags, added.w, added.h]); count++; }
        }
        if (!kept.some(f => /\.png$/i.test(f.path))) {
            // Sheet-only pack: cut the transparent sheets into tiles.
            const texts = await Promise.all(files.filter(f => /\.txt$/i.test(f.path)).map(f => f.buffer().then(b => b.toString('utf8'))));
            const layout = texts.map(sheetLayout).find(Boolean);
            const sheets = files.filter(f => /(tilesheets?|spritesheets?)\/[^/]*transparent\.png$/i.test(f.path) && !/packed/i.test(f.path));
            if (layout && sheets.length) {
                for (const sheet of sheets) {
                    const info = readPng(await sheet.buffer());
                    if (!info) continue;
                    const { png } = info;
                    const name = path.basename(sheet.path, '.png').replace(/[_-]?transparent$/i, '') || 'tiles';
                    let n = 0;
                    for (let y = 0; y + layout.th <= png.height; y += layout.th + layout.gap) {
                        for (let x = 0; x + layout.tw <= png.width; x += layout.tw + layout.gap) {
                            const tile = new PNG({ width: layout.tw, height: layout.th });
                            PNG.bitblt(png, tile, x, y, layout.tw, layout.th, 0, 0);
                            n++;
                            let empty = true, opaque = true;
                            for (let i = 3; i < tile.data.length; i += 4) {
                                if (tile.data[i] !== 0) empty = false;
                                if (tile.data[i] !== 255) opaque = false;
                            }
                            if (empty) continue;
                            const relPath = `Tiles/${name}/tile_${String(n).padStart(4, '0')}.png`;
                            const added = addImage(`kenney/${slug}/${relPath}`, null, { png: tile, opaque });
                            if (added) { index.kenney.push([packIndex, relPath, added.flags, added.w, added.h]); count++; }
                        }
                    }
                }
            }
        }
        console.log(`${slug}: ${count}`);
    }
}

function clonePinned(name) {
    const dir = path.join(work, 'src', name);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(path.dirname(dir), { recursive: true });
        execFileSync(process.execPath, [path.join(repo, 'scripts', 'clone-pinned.js'), name, dir], { stdio: 'inherit' });
    }
    return dir;
}

function copyTree(from, to, skip = () => false, rel = '') {
    for (const e of fs.readdirSync(path.join(from, rel), { withFileTypes: true })) {
        const r = rel ? `${rel}/${e.name}` : e.name;
        if (e.name === '.git' || skip(r)) continue;
        if (e.isDirectory()) copyTree(from, to, skip, r);
        else writeFile(`${to}/${r}`, fs.readFileSync(path.join(from, ...r.split('/'))));
    }
}

// game-icons.net files are a black 512×512 square with the icon in white (the website's look). As a
// sprite: no square, the icon in black on transparent, 128 px (it can be recoloured in the paint editor).
let iconsNotConverted = 0;
function spriteIcon(svg) {
    if (!svg.includes('<path d="M0 0h512v512H0z"/>')) iconsNotConverted++;
    return svg
        .replace('<path d="M0 0h512v512H0z"/>', '')
        .replace(/fill="#fff"/g, 'fill="#000"')
        .replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">',
            '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 512 512">');
}

function addGameIcons(index) {
    const dir = clonePinned('game-icons');
    const authors = fs.readdirSync(dir, { withFileTypes: true })
        .filter(e => e.isDirectory() && !e.name.startsWith('.')).map(e => e.name).sort();
    for (const author of authors) {
        const authorIndex = index.gameIcons.authors.push([author, titleCase(author)]) - 1;
        const walk = rel => {
            for (const e of fs.readdirSync(path.join(dir, author, rel), { withFileTypes: true })) {
                const r = rel ? `${rel}/${e.name}` : e.name;
                if (e.isDirectory()) walk(r);
                else if (/\.svg$/i.test(e.name)) {
                    const name = e.name.replace(/\.svg$/i, '');
                    writeFile(`game-icons/${author}/${name}.svg`, spriteIcon(fs.readFileSync(path.join(dir, author, r), 'utf8')));
                    index.gameIcons.icons.push([authorIndex, name]);
                }
            }
        };
        walk('');
    }
    console.log(`game-icons: ${index.gameIcons.icons.length} icons by ${authors.length} authors` +
        ` (${iconsNotConverted} without the usual black square, kept as they are)`);
}

function addGenerators() {
    const skips = {
        jsfxr: r => /^(e2e-tests\.js|tests\.js|playwright\.config\.js|sfxr-to-wav|.*screenshot.*\.png|package\.json)$/i.test(r),
        ZzFX: r => /^(screenshot\.png|social\.png|package\.json)$/i.test(r),
        bfxr2: r => /^(examples|docs|tools|tests|bin|upload|gzipper|templates|node_modules)(\/|$)/.test(r) ||
            /^(compile\.js|insert_templates\.js|template_links\.txt|package(-lock)?\.json|DEVELOPMENT\.md)$/.test(r)
    };
    const folders = { jsfxr: 'jsfxr', ZzFX: 'zzfx', bfxr2: 'bfxr' };
    for (const [name, folder] of Object.entries(folders)) {
        copyTree(clonePinned(name), `generators/${folder}`, skips[name]);
        console.log(`generator ${folder}: ${pins[name].commit.slice(0, 7)}`);
    }
}

const README = `Offline library of PenguinMod Desktop (Wolowolf/PenguinMod-NEWdesktop)

kenney/       Every pack of Kenney (https://kenney.nl) in the 2D, Textures and Audio categories,
              CC0 1.0 (public domain, no credit needed). Double-size copies, sprite sheets, vector
              sources and previews were left out; tile sheets were cut into tiles; images of 32 px or
              less were enlarged.
game-icons/   game-icons.net icons (https://github.com/game-icons/icons), CC BY 3.0: credit the
              author shown in each icon's folder (https://creativecommons.org/licenses/by/3.0/).
              Changed for use as sprites: no black square behind the icon, icon in black, 128 px.
generators/   Sound effect generators. jsfxr (Unlicense), ZzFX (MIT), Bfxr (MIT); their licence files
              are inside their folders. Sounds you make with them are yours.
index.json    The list the editor reads.
`;

async function main() {
    fs.rmSync(out, { recursive: true, force: true });
    fs.mkdirSync(out, { recursive: true });
    await downloadKenney();
    const index = { v: 1, packs: [], kenney: [], gameIcons: { authors: [], icons: [] } };
    await addKenney(index);
    addGameIcons(index);
    addGenerators();
    const version = {
        version: String(args.version),
        created: new Date().toISOString().slice(0, 10),
        kenneyPacks: index.packs.length,
        kenneyFiles: index.kenney.length,
        gameIcons: pins['game-icons'].commit,
        generators: { jsfxr: pins.jsfxr.commit, zzfx: pins.ZzFX.commit, bfxr: pins.bfxr2.commit }
    };
    writeFile('index.json', JSON.stringify(index));
    writeFile('version.json', JSON.stringify(version, null, 2) + '\n');
    writeFile('README.txt', README);

    const zipName = `offline-library-${args.version}.zip`;
    const zipPath = path.join(work, zipName);
    fs.rmSync(zipPath, { force: true });
    // Windows' own tar (bsdtar) writes standard zip files.
    execFileSync(process.platform === 'win32' ? 'C:\\Windows\\System32\\tar.exe' : 'zip',
        process.platform === 'win32' ? ['-a', '-c', '-f', zipPath, '-C', work, 'offline-library'] : ['-qr', zipPath, 'offline-library'],
        { cwd: work, stdio: 'inherit' });
    const inZip = (await unzipper.Open.file(zipPath)).files.filter(f => f.type === 'File').length;
    if (inZip !== filesWritten) throw new Error(`the zip has ${inZip} files, but ${filesWritten} were written`);
    const data = fs.readFileSync(zipPath);
    const pin = {
        _about: 'The offline library the app needs (scripts/make-offline-library.mjs builds it). CI and the updater download this file from the release below and check its size and SHA-256.',
        version: String(args.version),
        tag: `offline-library-${args.version}`,
        asset: zipName,
        size: data.length,
        sha256: crypto.createHash('sha256').update(data).digest('hex')
    };
    fs.writeFileSync(path.join(work, 'offline-library.json'), JSON.stringify(pin, null, 2) + '\n');
    console.log(JSON.stringify({ ...version, zipMB: Math.round(data.length / 1048576), sha256: pin.sha256 }));
}

main().catch(err => { console.error(err); process.exit(1); });

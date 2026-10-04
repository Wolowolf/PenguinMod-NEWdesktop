// PenguinMod Desktop (patch section 16): where the asset libraries get their assets.
//   Offline (the app's resources/offline-library, served at /__library__/):
//     Kenney (CC0), game-icons.net (CC BY 3.0) and the jsfxr / ZzFX / Bfxr sound generators.
//   Online: Openverse (images, sound effects, music) and Iconify (icon sets).
// Only licences that allow commercial use and changes are offered: never NC, ND, SA or GPL.
// Every added costume or sound gets a `pmCredit` record (saved in the project); pm-credits.js
// turns the ones that need credit into the note of the "credit" sprite.
import DOMPurify from 'dompurify';
import {inlineSvgFonts} from 'scratch-svg-renderer';
import {costumeUpload, soundUpload, spriteUpload} from './file-uploader.js';
import gameIconsMeta from './pm-game-icons-meta.json'; // tags and author names from game-icons.net

export const LIBRARY_URL = '/__library__/';
const OPENVERSE = 'https://api.openverse.org/v1/';
const ICONIFY = 'https://api.iconify.design/';

const encodePath = p => p.split('/').map(encodeURIComponent).join('/');
const words = s => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const niceName = file => file.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
const MIME = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml',
    webp: 'image/webp', bmp: 'image/bmp', ogg: 'audio/ogg', wav: 'audio/wav', mp3: 'audio/mpeg', flac: 'audio/flac'
};
const mimeOf = url => MIME[(url.split(/[?#]/)[0].split('.').pop() || '').toLowerCase()] || '';

const CC0 = {license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/'};
const CC_BY_3 = {license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/'};

// ---- offline library ---------------------------------------------------------------------------

let offlineIndex = null;
const prepareIndex = index => {
    const kenney = index.kenney.map(([pack, file, flags, w, h]) => {
        const [slug, title] = index.packs[pack];
        const name = niceName(file.split('/').pop());
        const url = `${LIBRARY_URL}kenney/${encodePath(`${slug}/${file}`)}`;
        return {
            key: `kenney:${slug}/${file}`, source: 'kenney', name, subtitle: title, pack,
            sound: (flags & 4) !== 0, sprite: (flags & 1) !== 0, backdrop: (flags & 2) !== 0,
            thumb: (flags & 4) ? null : url, url, mime: mimeOf(file), w, h,
            search: `${title} ${file}`.toLowerCase(),
            credit: {src: 'kenney', id: `${slug}/${file}`, title: name, by: 'Kenney', url: 'https://kenney.nl', ...CC0, needsCredit: false}
        };
    });
    const authors = index.gameIcons.authors;
    const squash = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const tagsOf = {};
    for (const [tag, ids] of Object.entries(gameIconsMeta.tags)) {
        for (const id of ids) (tagsOf[id] = tagsOf[id] || []).push(tag);
    }
    const gameIcons = index.gameIcons.icons.map(([author, icon]) => {
        const [folder, folderName] = authors[author];
        const known = gameIconsMeta.authors[squash(folder)];
        const authorName = known ? known.name : folderName;
        const id = `${folder}/${icon}`;
        const url = `${LIBRARY_URL}game-icons/${encodePath(`${id}.svg`)}`;
        const name = niceName(icon);
        const tags = tagsOf[id] || [];
        return {
            key: `game-icons:${id}`, source: 'gameIcons', name, subtitle: `by ${authorName}`, id, tags,
            sprite: true, studio: true, badge: folder === 'badges', thumb: url, url, mime: 'image/svg+xml', svgSize: 128,
            search: `${icon} ${folder} ${authorName} ${tags.join(' ')}`.toLowerCase(),
            credit: {
                src: 'game-icons', id, title: name, by: authorName,
                url: folder === 'badges' && known ? known.url : `https://game-icons.net/1x1/${id}.html`,
                ...CC_BY_3, needsCredit: true
            }
        };
    });
    const byId = {};
    for (const item of gameIcons) byId[item.id] = item;
    const tagLists = {};
    for (const [tag, ids] of Object.entries(gameIconsMeta.tags)) tagLists[tag] = ids.map(id => byId[id]).filter(Boolean);
    return {packs: index.packs.map(p => p[1]), categories: index.packs.map(p => p[2]), kenney, gameIcons, tagLists};
};

// game-icons badges: a dark disc with a white symbol, but the offline library turned the symbol black.
// Their files are read once and fixed, and used for the tiles and when they are added.
let badgesLoaded = null;
export const loadBadges = () => {
    if (!badgesLoaded) {
        badgesLoaded = loadOfflineIndex().then(index => Promise.all(index.gameIcons.filter(item => item.badge).map(item =>
            fetch(item.url).then(res => res.text()).then(svg => {
                item.svgText = svg.replace(/<path fill="#000"/g, '<path fill="#fff"');
                item.thumb = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(item.svgText)}`;
            })
        )).then(() => index.gameIcons.filter(item => item.badge)));
        badgesLoaded.catch(() => {
            badgesLoaded = null;
        });
    }
    return badgesLoaded;
};

export const gameIconTags = async () => {
    const index = await loadOfflineIndex();
    return Object.keys(index.tagLists).map(tag => ({tag, count: index.tagLists[tag].length}));
};

// Kenney images that can fill a background (the Textures category), for the studio's texture list.
export const textureItems = async () => {
    const index = await loadOfflineIndex();
    return index.kenney.filter(item => item.sprite && index.categories[item.pack] === 'Textures');
};

export const loadOfflineIndex = () => {
    if (!offlineIndex) {
        offlineIndex = fetch(`${LIBRARY_URL}index.json`)
            .then(res => {
                if (!res.ok) throw new Error('The offline library is not installed. System → Check for Updates downloads it.');
                return res.json();
            })
            .then(prepareIndex);
        offlineIndex.catch(() => {
            offlineIndex = null;
        });
    }
    return offlineIndex;
};

const fitsKind = (item, kind) => (kind === 'sound' ? item.sound : kind === 'backdrop' ? item.backdrop : item.sprite);

// Offline search: every word must appear in the pack/folder/file name (or the icon's tags).
// `filter` is a Kenney pack number, or a game-icons tag.
export const searchOffline = async (source, kind, query, filter) => {
    const index = await loadOfflineIndex();
    let list = index.kenney;
    if (source === 'gameIcons') {
        await loadBadges();
        list = typeof filter === 'string' && filter ? index.tagLists[filter] || [] : index.gameIcons;
    }
    const tokens = words(query);
    return list.filter(item => fitsKind(item, kind) &&
        (source !== 'kenney' || filter === undefined || filter < 0 || item.pack === filter) &&
        tokens.every(t => item.search.includes(t)));
};

// The neighbours of an icon in one of its tags (the "‹ tag ›" rows of the studio).
export const tagNeighbours = async (item, tag) => {
    const index = await loadOfflineIndex();
    const list = index.tagLists[tag] || [];
    const i = list.indexOf(item);
    if (i === -1 || list.length < 2) return {prev: null, next: null, count: list.length};
    return {prev: list[(i - 1 + list.length) % list.length], next: list[(i + 1) % list.length], count: list.length};
};

export const offlinePacks = async kind => {
    const index = await loadOfflineIndex();
    const used = new Set(index.kenney.filter(item => fitsKind(item, kind)).map(item => item.pack));
    return index.packs.map((title, i) => ({title, i})).filter(p => used.has(p.i));
};

// ---- Openverse ---------------------------------------------------------------------------------

const OPENVERSE_LICENSES = ['cc0', 'pdm', 'by']; // no NC, ND, SA
const openverseLicense = r => (r.license === 'cc0' ? 'CC0' : r.license === 'pdm' ? 'Public domain' :
    `CC ${r.license.toUpperCase()}${r.license_version ? ` ${r.license_version}` : ''}`);

const openverseItem = (kind, r) => {
    const sound = kind === 'sound';
    const title = (r.title || 'Untitled').trim();
    return {
        key: `openverse:${r.id}`, source: 'openverse', name: niceName(title) || 'Untitled',
        subtitle: [r.creator && `by ${r.creator}`, r.source].filter(Boolean).join(' · '),
        sound, thumb: sound ? null : r.thumbnail, url: r.url,
        fallbackUrl: sound ? null : `${OPENVERSE}images/${r.id}/thumb/?full_size=true`,
        svgFit: 360, // big vector drawings would cover the whole stage
        mime: r.filetype ? (MIME[r.filetype] || '') : mimeOf(r.url || ''),
        duration: r.duration ? r.duration / 1000 : 0,
        credit: {
            src: 'openverse', id: r.id, title, by: r.creator || '', byUrl: r.creator_url || '',
            url: r.foreign_landing_url || '', source: r.source || '',
            license: openverseLicense(r), licenseUrl: r.license_url || '', needsCredit: r.license === 'by'
        }
    };
};

// type: images 'illustration' | 'all'; sounds 'sfx' | 'music' | 'all'
export const searchOpenverse = async (kind, query, page, type) => {
    const params = new URLSearchParams({q: query, license: OPENVERSE_LICENSES.join(','), page_size: '20', page: String(page)});
    let endpoint = 'images/';
    if (kind === 'sound') {
        endpoint = 'audio/';
        // Freesound = sound effects, Jamendo = music (Wikimedia audio is mostly speech: left out)
        params.set('source', type === 'music' ? 'jamendo' : type === 'sfx' ? 'freesound' : 'freesound,jamendo');
    } else if (kind === 'backdrop') {
        params.set('aspect_ratio', 'wide,square');
        params.set('extension', 'jpg'); // JPEG has no see-through pixels: it always fills the stage
    } else if (type === 'illustration') {
        params.set('category', 'illustration');
    }
    const res = await fetch(`${OPENVERSE}${endpoint}?${params}`);
    if (res.status === 401) return {items: [], done: true}; // past the limit for apps without a key
    if (!res.ok) throw new Error(`Openverse answered HTTP ${res.status}.`);
    const json = await res.json();
    const items = (json.results || [])
        .filter(r => OPENVERSE_LICENSES.includes(r.license) && r.url)
        .map(r => openverseItem(kind, r));
    return {items, done: page >= (json.page_count || 0), total: json.result_count || 0};
};

// ---- Iconify -----------------------------------------------------------------------------------

const ICON_LICENSES = /^(MIT|ISC|Apache-2\.0|CC0-1\.0|Unlicense|BSD-2-Clause|BSD-3-Clause|CC-BY-3\.0|CC-BY-4\.0)$/;
const ICON_NO_CREDIT = /^(CC0-1\.0|Unlicense)$/;
// Brand and technology logos are trademarks even when the drawing is free; game-icons has its own offline tab.
const ICON_SKIP_CATEGORIES = new Set(['Logos', 'Programming']);
const ICON_SKIP_SETS = new Set(['game-icons', 'fa6-brands', 'fa-brands']);

let iconSets = null;
const loadIconSets = () => {
    if (!iconSets) {
        iconSets = fetch(`${ICONIFY}collections`)
            .then(res => {
                if (!res.ok) throw new Error(`Iconify answered HTTP ${res.status}.`);
                return res.json();
            })
            .then(all => {
                const sets = {};
                for (const [prefix, info] of Object.entries(all)) {
                    const spdx = info.license && info.license.spdx;
                    if (!spdx || !ICON_LICENSES.test(spdx) || ICON_SKIP_CATEGORIES.has(info.category) ||
                        ICON_SKIP_SETS.has(prefix) || info.hidden) continue;
                    sets[prefix] = info;
                }
                return sets;
            });
        iconSets.catch(() => {
            iconSets = null;
        });
    }
    return iconSets;
};

const iconItem = (sets, id) => {
    const [prefix, icon] = id.split(':');
    const set = sets[prefix];
    if (!set) return null;
    const spdx = set.license.spdx;
    return {
        key: `iconify:${id}`, source: 'iconify', name: niceName(icon), subtitle: set.name, sprite: true, studio: true,
        prefix, icon, thumb: null, svgText: null, iconSvg: null, // filled in by loadIconSvgs
        url: `${ICONIFY}${prefix}/${icon}.svg?color=%23000000`, mime: 'image/svg+xml', svgSize: 128,
        credit: {
            src: 'iconify', id, title: niceName(icon), set: set.name,
            by: (set.author && set.author.name) || set.name, byUrl: (set.author && set.author.url) || '',
            license: set.license.title || spdx, licenseUrl: set.license.url || '', spdx,
            needsCredit: !ICON_NO_CREDIT.test(spdx)
        }
    };
};

export const searchIconify = async query => {
    const sets = await loadIconSets();
    const params = new URLSearchParams({query, limit: '999', prefixes: Object.keys(sets).join(',')});
    const res = await fetch(`${ICONIFY}search?${params}`);
    if (!res.ok) throw new Error(`Iconify answered HTTP ${res.status}.`);
    const json = await res.json();
    return (json.icons || []).map(id => iconItem(sets, id)).filter(Boolean);
};

// Iconify's tags are the categories of each icon set (e.g. "Animals & Nature"); some sets have none.
const collections = {};
const loadCollection = prefix => {
    if (!collections[prefix]) {
        collections[prefix] = fetch(`${ICONIFY}collection?prefix=${encodeURIComponent(prefix)}`)
            .then(res => {
                if (!res.ok) throw new Error(`Iconify answered HTTP ${res.status}.`);
                return res.json();
            })
            .then(json => json.categories || {});
        collections[prefix].catch(() => {
            delete collections[prefix];
        });
    }
    return collections[prefix];
};

export const iconifyTagsFor = async item => {
    const categories = await loadCollection(item.prefix);
    return Object.keys(categories).filter(name => categories[name].includes(item.icon));
};

// All icons of one category of a set, as library items.
export const iconifyCategory = async (prefix, category) => {
    const [sets, categories] = await Promise.all([loadIconSets(), loadCollection(prefix)]);
    return (categories[category] || []).map(icon => iconItem(sets, `${prefix}:${icon}`)).filter(Boolean);
};

export const iconifyNeighbours = async (item, category) => {
    const sets = await loadIconSets();
    const list = (await loadCollection(item.prefix))[category] || [];
    const i = list.indexOf(item.icon);
    if (i === -1 || list.length < 2) return {prev: null, next: null, count: list.length};
    const prev = iconItem(sets, `${item.prefix}:${list[(i - 1 + list.length) % list.length]}`);
    const next = iconItem(sets, `${item.prefix}:${list[(i + 1) % list.length]}`);
    await loadIconSvgs([prev, next]);
    return {prev, next, count: list.length};
};

// Fetches the drawings of these Iconify results, one request per icon set (the public API refuses
// with HTTP 429 when every preview is its own request). Fills in each item's svgText and thumb.
export const loadIconSvgs = async items => {
    const byPrefix = {};
    for (const item of items) {
        if (item.source === 'iconify' && !item.svgText) (byPrefix[item.prefix] = byPrefix[item.prefix] || []).push(item);
    }
    await Promise.all(Object.keys(byPrefix).map(async prefix => {
        const list = byPrefix[prefix];
        const res = await fetch(`${ICONIFY}${prefix}.json?icons=${list.map(item => encodeURIComponent(item.icon)).join(',')}`);
        if (!res.ok) throw new Error(`Iconify answered HTTP ${res.status}.`);
        const json = await res.json();
        for (const item of list) {
            const alias = json.aliases && json.aliases[item.icon];
            const icon = (json.icons || {})[item.icon] || (alias && (json.icons || {})[alias.parent]);
            if (!icon) continue;
            const w = icon.width || json.width || 16;
            const h = icon.height || json.height || 16;
            // iconSvg keeps "currentColor" (the studio recolours it); svgText is the plain black version
            item.iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" ` +
                `viewBox="${icon.left || 0} ${icon.top || 0} ${w} ${h}">${icon.body}</svg>`;
            item.svgText = item.iconSvg.replace(/currentColor/g, '#000000');
            // previews at 96 px tall (many sets draw on a 16-32 px grid, which would look tiny)
            const thumb = item.svgText.replace(`width="${w}" height="${h}"`, `width="${Math.round(96 * w / h)}" height="96"`);
            item.thumb = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(thumb)}`;
        }
    }));
};

// ---- adding to the project ---------------------------------------------------------------------

// The editor measures an SVG by its viewBox but draws it at its width/height; when they differ the
// sprite is drawn away from its centre. This redraws the content in a box of the size it is shown at
// (`maxSide` sets that size, e.g. 128 for icons; `fitSide` only shrinks bigger drawings to it).
// Returns the data unchanged if it can't be read.
const normalizeSvg = (data, maxSide, fitSide) => {
    const doc = new DOMParser().parseFromString(new TextDecoder().decode(data), 'image/svg+xml');
    const svg = doc.documentElement;
    if (!svg || svg.nodeName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length) return data;
    const num = value => (/^\s*[\d.]+\s*(px)?\s*$/.test(value || '') ? parseFloat(value) : NaN);
    const box = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    const [vx, vy, vw, vh] = box.length === 4 && box.every(Number.isFinite) ? box :
        [0, 0, num(svg.getAttribute('width')), num(svg.getAttribute('height'))];
    if (!(vw > 0 && vh > 0)) return data;
    let w = num(svg.getAttribute('width'));
    let h = num(svg.getAttribute('height'));
    if (maxSide) {
        w = vw * maxSide / Math.max(vw, vh);
        h = vh * maxSide / Math.max(vw, vh);
    } else if (!(w > 0 && h > 0)) {
        w = vw;
        h = vh;
    }
    if (fitSide && Math.max(w, h) > fitSide) {
        const k = fitSide / Math.max(w, h);
        w *= k;
        h *= k;
    }
    if (w !== vw || h !== vh || vx !== 0 || vy !== 0) {
        const g = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('transform', `scale(${w / vw} ${h / vh}) translate(${-vx} ${-vy})`);
        while (svg.firstChild) g.appendChild(svg.firstChild);
        svg.appendChild(g);
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    }
    svg.setAttribute('width', String(w));
    svg.setAttribute('height', String(h));
    svg.removeAttribute('preserveAspectRatio');
    return new TextEncoder().encode(new XMLSerializer().serializeToString(doc)).buffer;
};

const download = async item => {
    if (item.pngData) return {data: item.pngData, type: 'image/png'};
    if (item.svgText) return {data: new TextEncoder().encode(item.svgText).buffer, type: 'image/svg+xml'};
    let res = null;
    try {
        res = await fetch(item.url);
    } catch (err) {
        if (!item.fallbackUrl) throw err;
    }
    if ((!res || !res.ok) && item.fallbackUrl) res = await fetch(item.fallbackUrl);
    if (!res.ok) throw new Error(`download failed (HTTP ${res.status})`);
    const type = item.mime || (res.headers.get('content-type') || '').split(';')[0].trim() || mimeOf(item.url);
    return {data: await res.arrayBuffer(), type};
};

// Adds a costume made by the studio as it is, centred, bypassing the normal upload:
//   png: drawn at twice its size; the upload would enlarge it again and make it blurry (resolution 2).
//   svg: the upload's cleaning removes SVG filters (shadow, outline) and leaves the parts invisible,
//        so it is cleaned here the same way (DOMPurify, no scripts or links) but with filters allowed.
const addStudioCostume = (vm, kind, data, format, size, name, credit) => {
    const storage = vm.runtime.storage;
    const png = format === 'png';
    const bytes = png ? new Uint8Array(data) : new TextEncoder().encode(DOMPurify.sanitize(new TextDecoder().decode(data),
        {USE_PROFILES: {svg: true, svgFilters: true}}));
    const asset = storage.createAsset(png ? storage.AssetType.ImageBitmap : storage.AssetType.ImageVector,
        png ? storage.DataFormat.PNG : storage.DataFormat.SVG, bytes, null, true);
    const center = png ? size : size / 2;
    const costume = {
        name, dataFormat: format, asset, md5: `${asset.assetId}.${format}`, assetId: asset.assetId,
        bitmapResolution: png ? 2 : 1, rotationCenterX: center, rotationCenterY: center, pmCredit: credit
    };
    if (kind === 'sprite') {
        return vm.addSprite(JSON.stringify({
            name, isStage: false, x: 0, y: 0, visible: true, size: 100, rotationStyle: 'all around', direction: 90,
            draggable: false, currentCostume: 0, blocks: {}, variables: {}, costumes: [costume], sounds: []
        }));
    }
    return kind === 'backdrop' ? vm.addBackdrop(costume.md5, costume) : vm.addCostume(costume.md5, costume);
};

// Adds `item` as a new sprite, a costume of the current sprite, a backdrop or a sound.
export const addAsset = async (vm, kind, item, name = item.name) => {
    const downloaded = await download(item);
    const type = downloaded.type;
    const data = type === 'image/svg+xml' ? normalizeSvg(downloaded.data, item.svgSize, item.svgFit) : downloaded.data;
    const credit = Object.assign({v: 1}, item.credit);
    const assetName = (name || kind).slice(0, 80);
    if (item.studioSize) {
        return addStudioCostume(vm, kind, data, item.pngData ? 'png' : 'svg', item.studioSize, assetName, credit);
    }
    return new Promise((resolve, reject) => {
        if (kind === 'sound') {
            soundUpload(data, type, vm.runtime.storage, vmSound => {
                vmSound.name = assetName;
                vmSound.pmCredit = credit;
                vm.addSound(vmSound).then(resolve, reject);
            }, reject);
        } else if (kind === 'sprite') {
            spriteUpload(data, type, assetName, vm, json => {
                const sprite = JSON.parse(json);
                sprite.costumes.forEach(costume => {
                    costume.pmCredit = credit;
                });
                vm.addSprite(JSON.stringify(sprite)).then(resolve, reject);
            }, reject);
        } else {
            costumeUpload(data, type, vm, costumes => {
                Promise.all(costumes.map((costume, i) => {
                    costume.name = i ? `${assetName} ${i + 1}` : assetName;
                    costume.pmCredit = credit;
                    return kind === 'backdrop' ? vm.addBackdrop(costume.md5, costume) : vm.addCostume(costume.md5, costume);
                })).then(resolve, reject);
            }, reject);
        }
    });
};

// ---- icon studio -------------------------------------------------------------------------------

// The icon as the studio needs it: its SVG and the colour that "is" the icon.
export const loadStudioIcon = async item => {
    if (item.source === 'iconify') {
        if (!item.iconSvg) await loadIconSvgs([item]);
        if (!item.iconSvg) throw new Error('Iconify did not send this icon.');
        return {svg: item.iconSvg, ink: 'currentColor', badge: false};
    }
    if (item.badge) await loadBadges();
    const svg = item.svgText || await (await fetch(item.url)).text();
    return {svg, ink: '#000', badge: !!item.badge};
};

const textureCache = {};
export const textureDataUrl = async item => {
    if (!textureCache[item.key]) {
        const blob = await (await fetch(item.url)).blob();
        textureCache[item.key] = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
    return textureCache[item.key];
};

// Draws the studio's SVG at `pixels` × `pixels` into a PNG (fonts embedded so text keeps its font).
const renderPng = (svg, pixels) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = pixels;
        canvas.getContext('2d').drawImage(img, 0, 0, pixels, pixels);
        canvas.toBlob(blob => (blob ? blob.arrayBuffer().then(resolve, reject) : reject(new Error('could not draw the picture'))), 'image/png');
    };
    img.onerror = () => reject(new Error('could not draw the picture'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(inlineSvgFonts(svg))}`;
});

// Adds an icon made in the studio, as a vector drawing or (png) as a picture that keeps every effect.
// The credit says the icon was modified; a badge adds its own credit line.
export const addStudioAsset = async (vm, kind, item, svg, {png, size, badge}) => {
    const credit = Object.assign({}, item.credit, item.source === 'gameIcons' ? {changes: 'modified'} : {modified: true});
    if (badge) credit.extra = [Object.assign({}, badge.credit, {changes: 'recoloured'})];
    const made = {name: item.name, credit, svgText: svg, svgSize: size, studioSize: size};
    if (png) made.pngData = await renderPng(svg, size * 2);
    return addAsset(vm, kind, made);
};

// A sound made with one of the generators (a .wav the generator wanted to download).
export const addGeneratedSound = async (vm, generator, url, name) => {
    const res = await fetch(url);
    const data = await res.arrayBuffer();
    return new Promise((resolve, reject) => {
        soundUpload(data, 'audio/wav', vm.runtime.storage, vmSound => {
            vmSound.name = (name || generator).slice(0, 80);
            vmSound.pmCredit = {v: 1, src: generator, title: vmSound.name, needsCredit: false};
            vm.addSound(vmSound).then(resolve, reject);
        }, reject);
    });
};

// The "Surprise" buttons: a random Kenney item (offline, no credit needed).
export const addRandomOfflineAsset = async (vm, kind) => {
    try {
        const index = await loadOfflineIndex();
        const pool = index.kenney.filter(item => fitsKind(item, kind));
        const item = pool[Math.floor(Math.random() * pool.length)];
        if (item) await addAsset(vm, kind, item);
    } catch (err) {
        // eslint-disable-next-line no-alert
        alert(`Surprise failed: ${err.message}`);
    }
};

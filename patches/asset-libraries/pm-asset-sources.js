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
import searchWords from './pm-search-words.json'; // related words for the search (from WordNet)
import {getKey, openverseToken, setKey} from './pm-api-keys.js';

export const LIBRARY_URL = '/__library__/';
const OPENVERSE = 'https://api.openverse.org/v1/';
const ICONIFY = 'https://api.iconify.design/';

const encodePath = p => p.split('/').map(encodeURIComponent).join('/');
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
const KENNEY_JUNK = /^(preview|sample|information|instructions?|update|changes)\b/i;
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
    }).filter(item => !KENNEY_JUNK.test(item.name)); // pack previews and info sheets, not assets
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

// ---- search ------------------------------------------------------------------------------------

// Words as the related-words list splits them (camelCase, separators, digits).
const tokenize = s => s.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

// Words of our asset names that are synonyms or kinds of `word` ("fruit" -> apple, banana...), from WordNet.
const relatedCache = {};
export const relatedWords = word => {
    if (!relatedCache[word]) {
        const out = new Set();
        for (const stem of [word, word.replace(/ies$/, 'y'), word.replace(/es$/, ''), word.replace(/s$/, '')]) {
            for (const i of searchWords.related[stem] || []) out.add(searchWords.words[i]);
        }
        out.delete(word);
        relatedCache[word] = out;
    }
    return relatedCache[word];
};

export const shuffle = list => {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
};

// Score of an item for a search (0 = no match). Every word typed must match: in the name (best), in
// the pack / folder / tags, or through a related word ("fruit" finds "apple").
const score = (item, queryTokens) => {
    if (!item.words) {
        item.words = new Set(tokenize(item.search));
        item.nameWords = new Set(tokenize(item.name));
        item.nameLower = item.name.toLowerCase();
    }
    let total = 0;
    for (const t of queryTokens) {
        if (item.nameLower.includes(t)) total += 4;
        else if (item.search.includes(t)) total += 3;
        else {
            let best = 0;
            for (const w of relatedWords(t)) {
                if (item.nameWords.has(w)) {
                    best = 2;
                    break;
                }
                if (item.words.has(w)) best = 1;
            }
            if (!best) return 0;
            total += best;
        }
    }
    return total;
};

// Ranks `list` for `query` (best first); an empty query gives everything in random order.
export const rank = (list, query) => {
    const tokens = tokenize(query);
    if (!tokens.length) return shuffle(list);
    const scored = [];
    for (const item of list) {
        const s = score(item, tokens);
        if (s) scored.push([s, item]);
    }
    return scored.sort((a, b) => b[0] - a[0]).map(x => x[1]);
};

// Offline search. `filter` is a Kenney pack number, or a game-icons tag. Without a search and without
// a filter, everything comes in random order (a new mix every time the library opens).
export const searchOffline = async (source, kind, query, filter) => {
    const index = await loadOfflineIndex();
    let list = index.kenney;
    if (source === 'gameIcons') {
        await loadBadges();
        list = typeof filter === 'string' && filter ? index.tagLists[filter] || [] : index.gameIcons;
    }
    const filtered = (source === 'gameIcons' && filter) || (source === 'kenney' && filter >= 0);
    list = list.filter(item => fitsKind(item, kind) &&
        (source !== 'kenney' || filter === undefined || filter < 0 || item.pack === filter));
    if (!query.trim() && filtered) return list; // a pack or tag is shown in its own order
    return rank(list, query);
};

// The neighbours of an icon in one of its tags (the "‹ tag ›" rows of the studio).
export const tagNeighbours = async (item, tag) => {
    const index = await loadOfflineIndex();
    const list = index.tagLists[tag] || [];
    const i = list.indexOf(item);
    if (i === -1 || list.length < 2) return {prev: null, next: null, count: list.length};
    return {prev: list[(i - 1 + list.length) % list.length], next: list[(i + 1) % list.length], count: list.length};
};

// Waveform and length of a sound, read from the file itself (48 peaks between 0 and 1).
let decoder = null;
const WAVE_BARS = 48;
export const loadWaveform = async item => {
    if (item.peaks) return item;
    const data = await (await fetch(item.url)).arrayBuffer();
    if (!decoder) decoder = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 2, 44100);
    const audio = await decoder.decodeAudioData(data);
    const samples = audio.getChannelData(0);
    const step = Math.max(1, Math.floor(samples.length / WAVE_BARS));
    const peaks = [];
    for (let i = 0; i < WAVE_BARS; i++) {
        let max = 0;
        for (let j = i * step; j < Math.min((i + 1) * step, samples.length); j++) max = Math.max(max, Math.abs(samples[j]));
        peaks.push(max);
    }
    const top = Math.max(...peaks) || 1;
    item.peaks = peaks.map(p => p / top);
    item.duration = audio.duration;
    return item;
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

// Openverse's own preview service fails for SVG files (HTTP 424): use the source's small previews.
const openverseThumb = r => {
    const url = r.url || '';
    const wiki = url.match(/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/(\w)\/(\w\w)\/([^/?#]+)$/);
    if (wiki) return `https://upload.wikimedia.org/wikipedia/commons/thumb/${wiki[1]}/${wiki[2]}/${wiki[3]}/250px-${wiki[3]}${/\.svg$/i.test(wiki[3]) ? '.png' : ''}`;
    if (/staticflickr\.com\/.*_[a-z]\.jpg$/i.test(url)) return url.replace(/_[a-z]\.jpg$/i, '_n.jpg');
    if (r.filetype === 'svg' || /\.svg$/i.test(url)) return url;
    return r.thumbnail;
};

const openverseItem = (kind, r) => {
    const sound = kind === 'sound';
    const title = (r.title || 'Untitled').trim();
    return {
        key: `openverse:${r.id}`, source: 'openverse', name: niceName(title) || 'Untitled',
        subtitle: [r.creator && `by ${r.creator}`, r.source].filter(Boolean).join(' · '),
        sound, thumb: sound ? null : openverseThumb(r), url: r.url,
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
    // filter_dead=false: Openverse skips checking every link (about a third faster); broken previews fall back
    const params = new URLSearchParams({q: query, license: OPENVERSE_LICENSES.join(','), page_size: '20', page: String(page),
        filter_dead: 'false'});
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
    const url = `${OPENVERSE}${endpoint}?${params}`;
    const cached = memo.get(url);
    if (cached) return cached;
    // With the user's own key: 100 searches a minute and 10,000 a day (20 and 200 without one).
    let res = await fetch(url, {headers: {Authorization: `Bearer ${await openverseToken()}`}});
    if (res.status === 401) {
        setKey('openverse', Object.assign({}, getKey('openverse'), {token: null})); // the token ran out early
        res = await fetch(url, {headers: {Authorization: `Bearer ${await openverseToken()}`}});
    }
    if (res.status === 429) {
        throw new Error('Openverse\'s limit is reached for now (100 searches a minute, 10,000 a day; 20 and 200 until your ' +
            'email address is confirmed). Try again in a minute.');
    }
    if (!res.ok) throw new Error(`Openverse answered HTTP ${res.status}.`);
    const json = await res.json();
    const items = (json.results || [])
        .filter(r => OPENVERSE_LICENSES.includes(r.license) && r.url)
        .map(r => openverseItem(kind, r));
    const result = {items, done: page >= (json.page_count || 0), total: json.result_count || 0};
    memo.set(url, result);
    return result;
};

// Results kept for this session (the same search twice costs no request).
const memo = new Map();

// ---- Pixabay (user's key: 100 searches a minute, no daily limit) ---------------------------------
// Pixabay asks apps to keep results for 24 hours and to show where the images come from.

const PIXABAY_CACHE = 'pmdesktop:pixabayCache';
const pixabayCache = () => {
    try {
        const all = JSON.parse(localStorage.getItem(PIXABAY_CACHE)) || {};
        const now = Date.now();
        for (const k of Object.keys(all)) if (all[k].time < now - 24 * 3600 * 1000) delete all[k];
        return all;
    } catch (e) {
        return {};
    }
};

// type: 'vector' | 'illustration' | 'photo' | 'all'. Without a search: a random everyday subject.
export const searchPixabay = async (kind, query, page, type, randomWord) => {
    const key = (getKey('pixabay') || {}).key;
    const q = (query.trim() || randomWord || '').slice(0, 100);
    const params = new URLSearchParams({
        q, page: String(page), per_page: '40', safesearch: 'true',
        image_type: kind === 'backdrop' ? 'photo' : (type || 'all')
    });
    if (kind === 'backdrop') params.set('orientation', 'horizontal');
    const id = params.toString();
    const cache = pixabayCache();
    let json = cache[id] && cache[id].json;
    if (!json) {
        const res = await fetch(`https://pixabay.com/api/?key=${encodeURIComponent(key)}&${id}`);
        if (res.status === 429) throw new Error('Pixabay\'s limit of 100 searches a minute is reached. Try again in a minute.');
        if (res.status === 400 || res.status === 401) throw new Error('Pixabay does not accept your key any more. Change it with "Change key".');
        if (!res.ok) throw new Error(`Pixabay answered HTTP ${res.status}.`);
        json = await res.json();
        // only what the tiles need, so many searches fit in the 24-hour cache
        json = {totalHits: json.totalHits, hits: (json.hits || []).map(h => ({
            id: h.id, tags: h.tags, user: h.user, pageURL: h.pageURL, previewURL: h.previewURL,
            webformatURL: h.webformatURL, largeImageURL: h.largeImageURL, type: h.type
        }))};
        cache[id] = {time: Date.now(), json};
        try {
            localStorage.setItem(PIXABAY_CACHE, JSON.stringify(cache));
        } catch (e) { /* cache full: results are still shown */ }
    }
    const items = json.hits.map(h => {
        const name = niceName((h.tags || 'image').split(',')[0]);
        return {
            key: `pixabay:${h.id}`, source: 'pixabay', name, subtitle: `by ${h.user}`,
            thumb: h.webformatURL || h.previewURL, url: h.largeImageURL || h.webformatURL,
            fallbackUrl: h.webformatURL, mime: mimeOf(h.largeImageURL || h.webformatURL || ''),
            credit: {
                src: 'pixabay', id: String(h.id), title: name, by: h.user, url: h.pageURL,
                license: 'Pixabay Content License', licenseUrl: 'https://pixabay.com/service/license-summary/', needsCredit: false
            }
        };
    });
    return {items, done: page * 40 >= Math.min(json.totalHits || 0, 500)};
};

// ---- Europeana (user's key: no limits) ------------------------------------------------------------
// Museum and archive images. reusability=open also returns CC BY-SA: removed here (no SA, ND or NC).

const EUROPEANA_OK = /creativecommons\.org\/(publicdomain\/(mark|zero)\/|licenses\/by\/)/i;
const europeanaLicense = rights => {
    if (/publicdomain\/mark/i.test(rights)) return 'Public domain';
    if (/publicdomain\/zero/i.test(rights)) return 'CC0';
    const v = rights.match(/licenses\/by\/([\d.]+)/i);
    return `CC BY${v ? ` ${v[1]}` : ''}`;
};
const first = v => (Array.isArray(v) ? v[0] : v) || '';

export const searchEuropeana = async (kind, query, page, randomWord) => {
    const key = (getKey('europeana') || {}).key;
    const rows = 24;
    const start = (page - 1) * rows + 1;
    const params = new URLSearchParams({
        wskey: key, query: query.trim() || randomWord || '*', rows: String(rows), start: String(start),
        reusability: 'open', media: 'true', qf: 'TYPE:IMAGE', profile: 'standard'
    });
    const url = `https://api.europeana.eu/record/v2/search.json?${params}`;
    let result = memo.get(url);
    if (result) return result;
    const res = await fetch(url);
    if (res.status === 400 || res.status === 401) throw new Error('Europeana does not accept your key any more. Change it with "Change key".');
    if (!res.ok) throw new Error(`Europeana answered HTTP ${res.status}.`);
    const json = await res.json();
    const items = (json.items || []).filter(it => EUROPEANA_OK.test(first(it.rights))).map(it => {
        const rights = first(it.rights);
        const title = String(first(it.title) || 'Untitled').trim();
        const itemPage = String(it.guid || '').replace(/\?.*$/, '');
        const creator = String(first(it.dcCreator) || '').trim();
        const institution = String(first(it.dataProvider) || '').trim();
        return {
            key: `europeana:${it.id}`, source: 'europeana', name: title.slice(0, 80),
            subtitle: [creator && `by ${creator}`, institution].filter(Boolean).join(' · '),
            thumb: first(it.edmPreview), url: first(it.edmIsShownBy) || first(it.edmPreview),
            fallbackUrl: first(it.edmPreview), mime: '',
            credit: {
                src: 'europeana', id: it.id, title, by: creator, institution, url: itemPage,
                license: europeanaLicense(rights), licenseUrl: rights, needsCredit: /licenses\/by\//i.test(rights)
            }
        };
    });
    // Europeana pages through the first 1,000 results this way
    result = {items, done: start + rows > Math.min(json.totalResults || 0, 1000)};
    memo.set(url, result);
    return result;
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

const iconifySearch = async (query, limit) => {
    const sets = await loadIconSets();
    const params = new URLSearchParams({query, limit: String(limit), prefixes: Object.keys(sets).join(',')});
    const res = await fetch(`${ICONIFY}search?${params}`);
    if (!res.ok) throw new Error(`Iconify answered HTTP ${res.status}.`);
    const json = await res.json();
    return (json.icons || []).map(id => iconItem(sets, id)).filter(Boolean);
};

const unique = lists => {
    const seen = new Set();
    const out = [];
    for (const list of lists) {
        for (const item of list) {
            if (!seen.has(item.key)) {
                seen.add(item.key);
                out.push(item);
            }
        }
    }
    return out;
};

// Everyday subjects for the random mix shown before anything is searched.
const RANDOM_WORDS = ['star', 'heart', 'sword', 'tree', 'cat', 'dog', 'house', 'car', 'rocket', 'fire', 'water', 'sun',
    'moon', 'cloud', 'music', 'robot', 'ghost', 'skull', 'crown', 'key', 'gem', 'coin', 'flag', 'flower', 'fish', 'bird',
    'apple', 'castle', 'shield', 'bomb', 'map', 'book', 'ball', 'bolt', 'leaf', 'mountain', 'planet', 'dragon', 'pizza',
    'cake', 'gift', 'trophy', 'bell', 'camera', 'clock', 'eye', 'hand', 'smile', 'snow', 'hammer', 'arrow', 'potion',
    'train', 'plane', 'ship', 'bug', 'paw', 'horse', 'chess', 'dice', 'alien', 'tent', 'candy', 'soccer', 'guitar'];
const pick = (list, n) => shuffle(list).slice(0, n);
export const randomSubject = () => pick(RANDOM_WORDS, 1)[0];

// Iconify search, plus a few related words ("fruit" also searches apple, banana...); without a
// search, a random mix of three everyday subjects.
export const searchIconify = async query => {
    const q = query.trim();
    if (!q) return shuffle(unique(await Promise.all(pick(RANDOM_WORDS, 3).map(w => iconifySearch(w, 64)))));
    const related = tokenize(q).length === 1 ? pick(Array.from(relatedWords(q.toLowerCase())), 3) : [];
    const [main, ...more] = await Promise.all([iconifySearch(q, 999), ...related.map(w => iconifySearch(w, 48))]);
    return unique([main, ...more]);
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

// One file: directly, or through the app when the site doesn't allow pages to download it (many
// museum and photo sites). Returns {data, type} or null.
const fetchFile = async url => {
    if (!url) return null;
    try {
        const res = await fetch(url);
        if (res.ok) return {data: await res.arrayBuffer(), type: (res.headers.get('content-type') || '').split(';')[0].trim()};
    } catch (err) { /* blocked for pages: try through the app */ }
    if (typeof window !== 'undefined' && window.PMDesktop && window.PMDesktop.fetchBytes) {
        const res = await window.PMDesktop.fetchBytes(url);
        if (res && res.ok) return {data: res.data, type: (res.type || '').split(';')[0].trim()};
    }
    return null;
};

const download = async item => {
    if (item.pngData) return {data: item.pngData, type: 'image/png'};
    if (item.svgText) return {data: new TextEncoder().encode(item.svgText).buffer, type: 'image/svg+xml'};
    let file = await fetchFile(item.url);
    // the full file must really be a picture or a sound (some sites send a web page instead)
    if (!file || !/^(image|audio)\//.test(file.type || item.mime || mimeOf(item.url))) file = await fetchFile(item.fallbackUrl);
    if (!file) throw new Error('the file could not be downloaded');
    const type = /^(image|audio)\//.test(file.type) ? file.type : (item.mime || mimeOf(item.url));
    return {data: file.data, type};
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

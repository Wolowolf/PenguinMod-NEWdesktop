/*
 * Builds patches/asset-libraries/search-words.json: for words someone may search for ("fruit"),
 * the words of our asset names that mean that kind of thing ("apple", "banana", "cherry"...).
 * The library search uses it so a search finds related assets, not only exact name matches.
 * It comes from WordNet (Princeton University): each word in the offline library's names and tags
 * is linked to its synonyms and to the more general words above it ("apple" -> "edible fruit",
 * "fruit", "food"...).
 *
 * Run it on a PC after the offline library or the game-icons tags change:
 *   npm install --prefix <tools> wordnet-db@3.1.14
 *   node scripts/make-search-words.mjs --tools <tools> --library <offline-library folder>
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
if (!args.tools || !args.library) throw new Error('missing --tools or --library (see the comment at the top of this file)');
const dict = path.join(path.resolve(args.tools), 'node_modules', 'wordnet-db', 'dict');
const out = path.join(repo, 'patches', 'asset-libraries', 'search-words.json');

const SENSES = 2; // only the most common meanings of a word (fewer odd matches)
const DEPTH = 6; // how many levels of "more general" words
const MAX_MEMBERS = 600; // a word that covers more than this is too general to be useful

// Same split as the editor (pm-asset-sources.js): camelCase, separators and digits, lower case.
const tokens = s => s.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z]+/).filter(w => w.length > 2);

// ---- vocabulary: the words of the offline library's names and the game-icons tags --------------
const index = JSON.parse(fs.readFileSync(path.join(args.library, 'index.json'), 'utf8'));
const meta = JSON.parse(fs.readFileSync(path.join(repo, 'patches', 'asset-libraries', 'game-icons-meta.json'), 'utf8'));
const vocab = new Set();
for (const [, title] of index.packs) tokens(title).forEach(w => vocab.add(w));
for (const [, file] of index.kenney) tokens(file).forEach(w => vocab.add(w));
for (const [, name] of index.gameIcons.icons) tokens(name).forEach(w => vocab.add(w));
for (const tag of Object.keys(meta.tags)) tokens(tag).forEach(w => vocab.add(w));

// ---- WordNet nouns ------------------------------------------------------------------------------
const lemmas = new Map(); // word -> synset offsets, most common meaning first
for (const line of fs.readFileSync(path.join(dict, 'index.noun'), 'utf8').split('\n')) {
    if (!line || line.startsWith(' ')) continue;
    const p = line.trim().split(' ');
    const synsetCount = +p[2];
    const pointerCount = +p[3];
    lemmas.set(p[0], p.slice(4 + pointerCount + 2, 4 + pointerCount + 2 + synsetCount));
}
const synsets = new Map(); // offset -> {words, hypernyms}
for (const line of fs.readFileSync(path.join(dict, 'data.noun'), 'utf8').split('\n')) {
    if (!line || line.startsWith(' ')) continue;
    const p = line.split(' | ')[0].trim().split(' ');
    const wordCount = parseInt(p[3], 16);
    const words = [];
    for (let i = 0; i < wordCount; i++) words.push(p[4 + i * 2].toLowerCase().replace(/\(.*\)$/, ''));
    let at = 4 + wordCount * 2;
    const pointerCount = +p[at++];
    const hypernyms = [];
    for (let i = 0; i < pointerCount; i++, at += 4) {
        if (p[at] === '@' || p[at] === '@i') hypernyms.push(p[at + 1]);
    }
    synsets.set(p[0], { words, hypernyms });
}

const toLemma = w => [w, w.replace(/ies$/, 'y'), w.replace(/es$/, ''), w.replace(/s$/, '')].find(x => lemmas.has(x));

// ---- related words ------------------------------------------------------------------------------
const related = new Map(); // search word -> Set of vocabulary words
const add = (key, member) => {
    if (key.includes('_') || key === member || key.length < 3) return; // single words only
    if (!related.has(key)) related.set(key, new Set());
    related.get(key).add(member);
};
for (const word of vocab) {
    const lemma = toLemma(word);
    if (!lemma) continue;
    for (const offset of lemmas.get(lemma).slice(0, SENSES)) {
        const seen = new Set();
        const walk = (off, depth) => {
            if (seen.has(off) || depth > DEPTH) return;
            seen.add(off);
            const s = synsets.get(off);
            if (!s) return;
            for (const w of s.words) add(w, word);
            for (const h of s.hypernyms) walk(h, depth + 1);
        };
        walk(offset, 0);
    }
}

const words = Array.from(vocab).sort();
const position = new Map(words.map((w, i) => [w, i]));
const compact = {};
let dropped = 0;
for (const key of Array.from(related.keys()).sort()) {
    const members = related.get(key);
    if (members.size > MAX_MEMBERS) {
        dropped++;
        continue;
    }
    compact[key] = Array.from(members).map(w => position.get(w)).sort((a, b) => a - b);
}
const license = fs.readFileSync(path.join(dict, '..', 'LICENSE'), 'utf8').replace(/\s+\n/g, '\n').trim();
fs.writeFileSync(out, JSON.stringify({
    _about: 'Related words for the library search, made by scripts/make-search-words.mjs from WordNet 3.1 ' +
        '(Princeton University). related: search word -> indexes into words.',
    _license: license,
    words,
    related: compact
}) + '\n');
const sample = k => (compact[k] || []).map(i => words[i]).slice(0, 14).join(', ');
console.log(`${words.length} words, ${Object.keys(compact).length} search words (${dropped} too general dropped), ` +
    `${Math.round(fs.statSync(out).size / 1024)} KB`);
for (const k of ['fruit', 'weapon', 'animal', 'vehicle', 'food', 'tree', 'monster', 'tool', 'car', 'automobile']) {
    console.log(`  ${k}: ${sample(k)}`);
}

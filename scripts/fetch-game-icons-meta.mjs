/*
 * Saves the game-icons.net tags and author names (they are only on the website, not in the icon
 * files) to patches/asset-libraries/game-icons-meta.json, which the editor uses for the tag browser
 * and for credits. Run it once on a PC when the icons are updated:
 *   node scripts/fetch-game-icons-meta.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(repo, 'patches', 'asset-libraries', 'game-icons-meta.json');
const SITE = 'https://game-icons.net';
const wait = ms => new Promise(r => setTimeout(r, ms));
const get = async url => {
    const res = await fetch(url, { headers: { 'User-Agent': 'PenguinMod Desktop fork (tag list for its offline icon browser)' } });
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    return res.text();
};
const text = html => html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const squash = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// Authors: the table on the About page (name, number of icons, link)
const about = await get(`${SITE}/about.html`);
const authors = {};
for (const row of about.match(/<tr>[\s\S]*?<\/tr>/g) || []) {
    const cells = (row.match(/<td[^>]*>[\s\S]*?<\/td>/g) || []);
    if (cells.length < 2) continue;
    const name = text(cells[0]);
    const link = (cells[2] || '').match(/href="([^"]+)"/);
    if (name && /^\d+$/.test(text(cells[1]))) authors[name] = link ? link[1] : '';
}

// Tags: the tag list, then every tag page (all its icons are on one page)
const tagList = await get(`${SITE}/tags.html`);
const slugs = [...new Set([...tagList.matchAll(/href="\/tags\/([a-z0-9-]+)\.html"/g)].map(m => m[1]))].sort();
const tags = {};
for (const slug of slugs) {
    const page = await get(`${SITE}/tags/${slug}.html`);
    tags[slug] = [...new Set([...page.matchAll(/href="\/1x1\/([a-z0-9-]+\/[a-z0-9-]+)\.html"/g)].map(m => m[1]))].sort();
    process.stdout.write(`${slug}:${tags[slug].length} `);
    await wait(700);
}

// Folder name in the icon repository -> display name and link from the About page
const folderAuthors = {};
for (const [name, url] of Object.entries(authors)) {
    const inParens = name.match(/\(([^)]+)\)/);
    folderAuthors[squash(inParens ? inParens[1] : name)] = { name, url };
}
// Folders whose name doesn't match the About page (the badges page names no author)
if (authors.Lucas !== undefined) folderAuthors.lucasms = { name: 'Lucas', url: authors.Lucas };
folderAuthors.badges = { name: 'game-icons.net contributors', url: `${SITE}/badges.html` };

const meta = {
    _about: 'game-icons.net tags and author names, from the website (scripts/fetch-game-icons-meta.mjs). ' +
        'authors: squashed folder name -> display name and link. tags: tag -> "folder/icon" ids.',
    fetched: new Date().toISOString().slice(0, 10),
    authors: folderAuthors,
    tags
};
fs.writeFileSync(out, JSON.stringify(meta) + '\n');
const icons = new Set(Object.values(tags).flat());
console.log(`\n${Object.keys(folderAuthors).length} authors, ${slugs.length} tags, ${icons.size} tagged icons, ` +
    `${Math.round(fs.statSync(out).size / 1024)} KB`);

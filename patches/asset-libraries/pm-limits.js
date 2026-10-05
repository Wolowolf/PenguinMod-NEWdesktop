// PenguinMod Desktop (patch section 16): the request limits of the libraries that have one, and how
// much of them is left, for the counter in the library window.
//   Openverse: 100 searches a minute and 10,000 a day (20 and 200 until the email address is confirmed).
//   Pixabay: 100 searches a minute.
// Both sites say in every answer how much is left (the app lets the page read those headers, see
// app/electron-main.js); until then the app counts its own requests (kept in local storage).
// Europeana and Iconify have no fixed limit.

const STORE = 'pmdesktop:apiUsage';
const LIMITS = {
    openverse: [{per: 'minute', max: 100}, {per: 'day', max: 10000}],
    pixabay: [{per: 'minute', max: 100}]
};
const SPAN = {second: 1000, minute: 60000, hour: 3600000, day: 86400000};
const LABEL = {openverse: 'Openverse', pixabay: 'Pixabay'};

let usage = null;
const all = () => {
    if (!usage) {
        try {
            usage = JSON.parse(localStorage.getItem(STORE)) || {};
        } catch (e) {
            usage = {};
        }
    }
    return usage;
};
const entry = source => {
    const u = all();
    if (!u[source]) u[source] = {recent: [], minutes: {}, server: {}};
    return u[source];
};
const listeners = new Set();
const changed = () => {
    try {
        localStorage.setItem(STORE, JSON.stringify(usage));
    } catch (e) { /* only counted until the app closes */ }
    listeners.forEach(fn => fn());
};

// Calls `fn` whenever a counted request is made or answered; returns the function that stops it.
export const onUsage = fn => {
    listeners.add(fn);
    return () => listeners.delete(fn);
};

// Requests this app made in the last `span` milliseconds (exact for a minute, by minutes for a day).
const localCount = (e, span, now) => {
    if (span <= SPAN.minute) return e.recent.filter(t => t > now - span).length;
    const from = Math.floor((now - span) / SPAN.minute);
    let n = 0;
    for (const m of Object.keys(e.minutes)) if (Number(m) > from) n += e.minutes[m];
    return n;
};

// How much of each limit is left: [{per, max, left, wait (ms until one more is allowed, if none left),
// what ('searches' or 'previews')}]. Uses the site's own numbers when it sent them in that period.
export const limitStatus = source => {
    const e = entry(source);
    const now = Date.now();
    const out = [];
    const scopes = Object.values(e.server).filter(s => s.at > now - SPAN[s.per]);
    for (const limit of LIMITS[source] || []) {
        const span = SPAN[limit.per];
        const server = scopes.find(s => s.per === limit.per && !s.previews);
        let max = limit.max;
        let left;
        if (server) {
            max = server.max;
            // the site's count, minus what was asked since that answer
            left = server.left - e.recent.filter(t => t > server.at).length;
        } else {
            left = max - localCount(e, span, now);
        }
        left = Math.max(0, left);
        let wait = 0;
        if (!left) {
            const times = e.recent.filter(t => t > now - span).sort((a, b) => a - b);
            wait = server && server.reset ? server.at + server.reset - now : (times.length ? times[0] + span - now : span);
        }
        out.push({per: limit.per, max, left, wait: Math.max(1000, wait), what: 'searches'});
    }
    for (const s of scopes.filter(x => x.previews)) {
        out.push({per: s.per, max: s.max, left: Math.max(0, s.left), wait: 0, what: 'previews'});
    }
    return out;
};

const waitText = ms => (ms < 90000 ? `${Math.ceil(ms / 1000)} s` : ms < 5400000 ? `${Math.ceil(ms / 60000)} min` :
    `${Math.ceil(ms / 3600000)} h`);

// Throws (without asking the site) when a search limit is used up, saying when it can go on.
export const checkLimit = source => {
    const full = limitStatus(source).find(s => s.what === 'searches' && !s.left);
    if (full) {
        throw new Error(`${LABEL[source]}'s limit of ${full.max} searches a ${full.per} is used up. ` +
            `More in about ${waitText(full.wait)}.`);
    }
};

// A search request is about to be sent.
export const noteRequest = source => {
    const e = entry(source);
    const now = Date.now();
    e.recent = e.recent.filter(t => t > now - SPAN.minute).concat(now);
    const minute = Math.floor(now / SPAN.minute);
    e.minutes[minute] = (e.minutes[minute] || 0) + 1;
    for (const m of Object.keys(e.minutes)) if (Number(m) < minute - 1440) delete e.minutes[m];
    changed();
};

// An answer arrived: read the site's own numbers. Openverse: x-ratelimit-limit-<scope> ("100/min")
// and x-ratelimit-available-<scope>; Pixabay: x-ratelimit-limit / -remaining / -reset (60 s).
export const noteAnswer = (source, res) => {
    // an answer from Cloudflare's cache (Openverse) carries the numbers of whoever asked first
    if (/hit/i.test(res.headers.get('cf-cache-status') || '')) return;
    const e = entry(source);
    const now = Date.now();
    let found = false;
    res.headers.forEach((value, name) => {
        const m = /^x-ratelimit-limit-(.+)$/i.exec(name);
        if (!m) return;
        const scope = m[1].toLowerCase();
        const limit = /^(\d+)\/(\w+)$/.exec(value.trim());
        const left = Number(res.headers.get(`x-ratelimit-available-${scope}`));
        if (!limit || !Number.isFinite(left)) return;
        const per = {s: 'second', sec: 'second', min: 'minute', m: 'minute', hour: 'hour', h: 'hour', day: 'day', d: 'day'}[limit[2]];
        if (!per) return;
        e.server[scope] = {per, max: Number(limit[1]), left, at: now, previews: /thumbnail/.test(scope)};
        found = true;
    });
    const max = Number(res.headers.get('x-ratelimit-limit'));
    const left = Number(res.headers.get('x-ratelimit-remaining'));
    if (max && Number.isFinite(left) && res.headers.get('x-ratelimit-remaining') !== null) {
        const reset = Number(res.headers.get('x-ratelimit-reset'));
        e.server.window = {per: 'minute', max, left, at: now, reset: Number.isFinite(reset) ? reset * 1000 : 0};
        found = true;
    }
    if (found) changed();
};

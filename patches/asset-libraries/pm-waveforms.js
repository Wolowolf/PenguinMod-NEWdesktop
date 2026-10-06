// PenguinMod Desktop (patch section 16): the waveforms of the sound library's tiles.
// Drawn like Freesound's: one column per screen pixel from the lowest to the highest sample, coloured
// by how bright that moment sounds (its spectral centroid) on Freesound's palette, from blue (low) over
// green and yellow to red (high).
//   Kenney and short Openverse sounds: decoded by the browser; a background worker works out the
//     columns and paints the picture, so scrolling stays smooth. Only tiles that come into view are done.
//   Openverse sounds from Freesound: Freesound's own coloured waveform picture (no decoding at all).
//   Openverse songs (Jamendo, minutes long): too big to download for a preview. The shape is Openverse's
//     waveform (loudness), the colours come from 24 short samples spread over the song (~0.4 MB).
// Each tile shows its waveform as a picture (`item.waveImage`), kept for the rest of the session.
import {fetchFile, openverseFetch} from './pm-asset-sources.js';

const DECODE_MAX_SECONDS = 60; // longer Openverse sounds are not downloaded for their waveform
const OPENVERSE_WAVES_PER_MINUTE = 30; // waveform requests to Openverse (it has its own limits)
const SONG_SAMPLES = 24; // short pieces of a song that give its colours
const SAMPLE_BYTES = 16384; // about 1.4 s of Jamendo's 96 kbps MP3

// The two functions below also run inside the worker, made from their source text: they are
// self-contained and written in plain old JavaScript.

// Works out the columns of a waveform: for each one the lowest and highest sample and the colour
// (0-255) of its spectral centroid, as Freesound does: FFT of 2048 samples around the column's middle,
// Hann window, centroid between 100 Hz and 22,050 Hz on a log scale.
function analyseWave (channels, sampleRate, columns) {
    var n = channels[0].length;
    var mono = channels[0];
    var i;
    if (channels.length > 1) {
        for (i = 0; i < n; i++) mono[i] = (mono[i] + channels[1][i]) * 0.5;
    }
    var size = 2048;
    var half = size / 2;
    var win = new Float32Array(size);
    var rev = new Uint32Array(size);
    var cosT = new Float32Array(half);
    var sinT = new Float32Array(half);
    var bits = 0;
    while ((1 << bits) < size) bits++;
    for (i = 0; i < size; i++) {
        win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (size - 1));
        var x = i;
        var y = 0;
        for (var b = 0; b < bits; b++) {
            y = (y << 1) | (x & 1);
            x >>= 1;
        }
        rev[i] = y;
    }
    for (i = 0; i < half; i++) {
        cosT[i] = Math.cos(2 * Math.PI * i / size);
        sinT[i] = -Math.sin(2 * Math.PI * i / size);
    }
    var re = new Float32Array(size);
    var im = new Float32Array(size);
    var lowLog = Math.log(100) / Math.LN10;
    var highLog = Math.log(22050) / Math.LN10;
    var min = new Float32Array(columns);
    var max = new Float32Array(columns);
    var color = new Uint8Array(columns);
    for (var c = 0; c < columns; c++) {
        var start = Math.floor(c * n / columns);
        var end = Math.min(n, Math.max(start + 1, Math.floor((c + 1) * n / columns)));
        // one sample of overlap joins each column to the one before
        var lo = 1;
        var hi = -1;
        for (i = Math.max(0, start - 1); i < end; i++) {
            if (mono[i] < lo) lo = mono[i];
            if (mono[i] > hi) hi = mono[i];
        }
        if (hi < lo) lo = hi = 0;
        min[c] = lo;
        max[c] = hi;
        var from = Math.floor((start + end) / 2) - half;
        for (i = 0; i < size; i++) {
            var s = from + i;
            re[rev[i]] = s >= 0 && s < n ? mono[s] * win[i] : 0;
            im[rev[i]] = 0;
        }
        for (var len = 2; len <= size; len <<= 1) {
            var h = len >> 1;
            var step = size / len;
            for (var k = 0; k < size; k += len) {
                for (var m = 0; m < h; m++) {
                    var p = k + m;
                    var q = p + h;
                    var tw = m * step;
                    var tr = re[q] * cosT[tw] - im[q] * sinT[tw];
                    var ti = re[q] * sinT[tw] + im[q] * cosT[tw];
                    re[q] = re[p] - tr;
                    im[q] = im[p] - ti;
                    re[p] += tr;
                    im[p] += ti;
                }
            }
        }
        var energy = 0;
        var weighted = 0;
        for (i = 0; i <= half; i++) {
            var mag = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
            energy += mag;
            weighted += mag * i;
        }
        var centroid = 0;
        if (energy > 1e-9) {
            var hz = weighted / (energy * half) * sampleRate * 0.5;
            centroid = (Math.log(Math.min(22050, Math.max(100, hz))) / Math.LN10 - lowLog) / (highLog - lowLog);
        }
        color[c] = Math.floor(Math.max(0, Math.min(1, centroid)) * 255);
    }
    return {min: min, max: max, color: color};
}

// Paints a waveform into a canvas (a page canvas or a worker's OffscreenCanvas), on a see-through
// background: analysed columns on Freesound's palette, or Openverse's points (loudness, mirrored),
// coloured by `wave.colors` (colours sampled evenly over the song, blended in between) or else grey.
function paintWave (wave, canvas) {
    var palette = [[50, 0, 200], [0, 220, 80], [255, 224, 0], [255, 70, 0]];
    var colourOf = function (index) {
        var at = index / 255 * (palette.length - 1);
        var j = Math.min(palette.length - 2, Math.floor(at));
        var f = at - j;
        var rgb = [];
        for (var k = 0; k < 3; k++) rgb.push(Math.round(palette[j][k] * (1 - f) + palette[j + 1][k] * f));
        return 'rgb(' + rgb.join(',') + ')';
    };
    var ctx = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;
    var mid = h / 2;
    var amp = (h - 4) / 2;
    var x;
    var i;
    if (wave.points) {
        var n = wave.points.length;
        var cs = wave.colors;
        ctx.fillStyle = '#aab6c8';
        for (x = 0; x < w; x++) {
            if (cs && cs.length) {
                var pos = Math.max(0, Math.min(cs.length - 1, (x + 0.5) / w * cs.length - 0.5));
                var c0 = Math.floor(pos);
                var c1 = Math.min(cs.length - 1, c0 + 1);
                ctx.fillStyle = colourOf(cs[c0] + (cs[c1] - cs[c0]) * (pos - c0));
            }
            var a = Math.floor(x * n / w);
            var b = Math.max(a + 1, Math.floor((x + 1) * n / w));
            var p = 0;
            for (i = a; i < b && i < n; i++) {
                if (wave.points[i] > p) p = wave.points[i];
            }
            ctx.fillRect(x, mid - p * amp, 1, Math.max(1, 2 * p * amp));
        }
        return;
    }
    var cols = wave.min.length;
    for (x = 0; x < w; x++) {
        var c = Math.min(cols - 1, Math.floor(x * cols / w));
        ctx.fillStyle = colourOf(wave.color[c]);
        ctx.fillRect(x, mid - wave.max[c] * amp, 1, Math.max(1, (wave.max[c] - wave.min[c]) * amp));
    }
}

// also used by the sound editor's waveform (pm-sound-wave.jsx, patch section 20)
export {analyseWave, paintWave};

// ---- background worker ----------------------------------------------------------------------------

let worker = null;
let workerFailed = typeof OffscreenCanvas === 'undefined' || typeof Worker === 'undefined';
const jobs = new Map();
let jobId = 0;

const startWorker = () => {
    const source = `var analyseWave = ${analyseWave.toString()};\nvar paintWave = ${paintWave.toString()};\n` +
        'self.onmessage = function (e) {\n' +
        '    var d = e.data;\n' +
        '    var wave = d.points ? {points: d.points, colors: d.colors} : analyseWave(d.channels, d.sampleRate, d.width);\n' +
        '    var canvas = new OffscreenCanvas(d.width, d.height);\n' +
        '    paintWave(wave, canvas);\n' +
        '    canvas.convertToBlob({type: "image/png"}).then(function (blob) {\n' +
        '        self.postMessage({id: d.id, blob: blob});\n' +
        '    }, function (err) {\n' +
        '        self.postMessage({id: d.id, error: String(err)});\n' +
        '    });\n' +
        '};\n';
    const url = URL.createObjectURL(new Blob([source], {type: 'text/javascript'}));
    worker = new Worker(url);
    URL.revokeObjectURL(url);
    worker.onmessage = e => {
        const job = jobs.get(e.data.id);
        jobs.delete(e.data.id);
        if (!job) return;
        if (e.data.blob) job.resolve(e.data.blob);
        else job.reject(new Error(e.data.error || 'the waveform could not be drawn'));
    };
    worker.onerror = () => {
        for (const job of jobs.values()) job.reject(new Error('the waveform worker stopped'));
        jobs.clear();
        worker = null;
        workerFailed = true; // from now on on the page itself
    };
};

// The waveform picture (PNG) of decoded channels, or of Openverse's points: in the worker, or on the
// page when the worker can't run (slower, but it still works).
const picture = (data, transfer) => {
    if (!worker && !workerFailed) {
        try {
            startWorker();
        } catch (e) {
            workerFailed = true;
        }
    }
    if (worker) {
        return new Promise((resolve, reject) => {
            const id = ++jobId;
            jobs.set(id, {resolve, reject});
            worker.postMessage(Object.assign({id}, data), transfer);
        });
    }
    const wave = data.points ? {points: data.points, colors: data.colors} : analyseWave(data.channels, data.sampleRate, data.width);
    const canvas = document.createElement('canvas');
    canvas.width = data.width;
    canvas.height = data.height;
    paintWave(wave, canvas);
    return new Promise((resolve, reject) => canvas.toBlob(blob => (blob ? resolve(blob) :
        reject(new Error('the waveform could not be drawn'))), 'image/png'));
};

// ---- the three kinds of waveform ------------------------------------------------------------------

let decoder = null;
const decodeWave = async (item, width, height) => {
    const file = await fetchFile(item.url);
    if (!file) throw new Error('the sound could not be downloaded');
    if (!decoder) decoder = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 1, 44100);
    const audio = await decoder.decodeAudioData(file.data);
    const channels = [];
    for (let c = 0; c < Math.min(2, audio.numberOfChannels); c++) {
        const copy = new Float32Array(audio.length);
        audio.copyFromChannel(copy, c);
        channels.push(copy);
    }
    const blob = await picture({channels, sampleRate: audio.sampleRate, width, height}, channels.map(ch => ch.buffer));
    item.waveImage = URL.createObjectURL(blob);
    if (!item.duration) item.duration = audio.duration;
};

// Openverse's waveform of a song: its loudness at ~1,000 points between 0 and 1.
const openverseCalls = [];
const openverseSlot = async wanted => {
    for (;;) {
        const now = Date.now();
        while (openverseCalls.length && openverseCalls[0] < now - 60000) openverseCalls.shift();
        if (openverseCalls.length < OPENVERSE_WAVES_PER_MINUTE) {
            openverseCalls.push(now);
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, openverseCalls[0] + 60000 - now + 50));
        if (!wanted()) return false;
    }
};
// The colours of a long song without downloading it: SONG_SAMPLES short pieces spread over the file
// (through the app: Jamendo doesn't let pages read its files), each decoded on its own. A piece's
// colour is the spectral centroid of 8 moments in it, weighted by how loud they are. Pieces that can't
// be read take their neighbour's colour; null if none could.
const songColours = async item => {
    const fetchBytes = typeof window !== 'undefined' && window.PMDesktop && window.PMDesktop.fetchBytes;
    if (!fetchBytes) return null;
    // Jamendo's 96 kbps MP3 instead of the bigger one: more seconds in each piece
    const url = /^https:\/\/[\w-]+\.storage\.jamendo\.com\//.test(item.url) ?
        item.url.replace(/([?&]format=)mp32\b/, '$1mp31') : item.url;
    const head = await fetchBytes(url, 'bytes=0-0');
    const total = head && head.ok ? head.total : 0;
    if (!total || total < SAMPLE_BYTES * 4) return null;
    if (!decoder) decoder = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 1, 44100);
    const colours = new Array(SONG_SAMPLES).fill(-1);
    let next = 0;
    const reader = async () => {
        while (next < SONG_SAMPLES) {
            const i = next++;
            const from = Math.max(0, Math.floor(total * (i + 0.5) / SONG_SAMPLES - SAMPLE_BYTES / 2));
            try {
                const part = await fetchBytes(url, `bytes=${from}-${Math.min(total, from + SAMPLE_BYTES) - 1}`);
                if (!part || !part.ok) continue;
                const audio = await decoder.decodeAudioData(part.data);
                const channels = [];
                for (let c = 0; c < Math.min(2, audio.numberOfChannels); c++) channels.push(audio.getChannelData(c));
                const r = analyseWave(channels, audio.sampleRate, 8);
                let sum = 0;
                let weight = 0;
                for (let k = 0; k < 8; k++) {
                    const loud = r.max[k] - r.min[k];
                    sum += r.color[k] * loud;
                    weight += loud;
                }
                if (weight > 0.01) colours[i] = Math.round(sum / weight);
            } catch (e) { /* this piece could not be read (e.g. the file's tags): its neighbour's colour */ }
        }
    };
    await Promise.all([reader(), reader(), reader(), reader()]);
    if (colours.every(c => c < 0)) return null;
    for (let i = 0; i < SONG_SAMPLES; i++) {
        if (colours[i] >= 0) continue;
        let d = 1;
        while (colours[i - d] === undefined || colours[i - d] < 0) {
            if (colours[i + d] >= 0) break;
            d++;
        }
        colours[i] = colours[i - d] >= 0 ? colours[i - d] : colours[i + d];
    }
    return Uint8Array.from(colours);
};

const openverseWave = async (item, width, height, wanted) => {
    if (!await openverseSlot(wanted)) return;
    const [res, colors] = await Promise.all([openverseFetch(item.waveUrl), songColours(item).catch(() => null)]);
    if (!res.ok) throw new Error(`Openverse answered HTTP ${res.status}`);
    const points = Float32Array.from(((await res.json()).points || []).map(Number).filter(v => v >= 0));
    if (!points.length) throw new Error('Openverse sent no waveform');
    const data = {points, width, height};
    const transfer = [points.buffer];
    if (colors) {
        data.colors = colors;
        transfer.push(colors.buffer);
    }
    item.waveImage = URL.createObjectURL(await picture(data, transfer));
};

// True for an Openverse sound without a Freesound picture (or whose picture failed) that is too long
// to download for its waveform (songs): Openverse's waveform plus colours from short samples.
export const waveFromOpenverse = item => item.source === 'openverse' &&
    (!item.freesoundPicture || item.freesoundFailed) && item.duration > DECODE_MAX_SECONDS;

// The Freesound picture failed to load: the waveform is made another way instead.
export const dropWaveImage = item => {
    item.freesoundFailed = true;
    item.waveImage = null;
};

// ---- queue: a few at a time, only for tiles that are (still) in view ------------------------------

const queue = [];
let running = 0;
const runQueue = () => {
    while (running < 3 && queue.length) {
        const job = queue.shift();
        if (!job.wanted()) {
            job.finish();
            continue;
        }
        running++;
        job.work().catch(() => {
            job.item.waveFailed = true;
        })
            .then(() => {
                running--;
                job.finish();
                runQueue();
            });
    }
};

// Makes `item`'s waveform picture (`width` x `height` screen pixels) when it's the tile's turn and
// `wanted()` (the tile is still in view) is still true. Resolves with the item either way: show
// `item.waveImage` when it is set; `item.waveFailed` means there is none to be had.
export const requestWave = (item, width, height, wanted) => {
    if (item.waveImage || item.waveFailed) return Promise.resolve(item);
    if (item.waveJob) {
        item.waveJob.wanters.push(wanted);
        return item.waveJob.promise;
    }
    const job = {item, wanters: [wanted]};
    job.wanted = () => job.wanters.some(w => w());
    job.promise = new Promise(resolve => {
        job.finish = () => {
            item.waveJob = null;
            resolve(item);
        };
    });
    job.work = () => (waveFromOpenverse(item) ? openverseWave(item, width, height, job.wanted) :
        decodeWave(item, width, height));
    item.waveJob = job;
    queue.push(job);
    runQueue();
    return job.promise;
};

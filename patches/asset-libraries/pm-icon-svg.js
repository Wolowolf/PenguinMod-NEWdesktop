// PenguinMod Desktop (patch section 16): the drawing code of the icon studio (no React).
// Turns an icon (game-icons.net or Iconify) and the studio settings into one SVG, with the same
// sections as the Studio on game-icons.net: background (shape, colour or gradient, pattern, Kenney
// texture, frame), foreground (colour or gradient, flip, rotate, zoom, position, skew, clip, shadow,
// outline, "break apart" into parts), text, badge, size and presets.
// Everything is drawn on a 512 × 512 canvas and scaled to the chosen size.

export const CANVAS = 512;
const C = CANVAS / 2;
const NS = 'http://www.w3.org/2000/svg';
const r3 = n => Math.round(n * 1000) / 1000;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---- settings ----------------------------------------------------------------------------------

const paint = (color, extra) => Object.assign({type: 'plain', color, color2: '#ffffff', angle: 90, opacity: 100}, extra);
const effects = () => ({
    shadow: {enabled: false, color: '#000000', blur: 8, x: 0, y: 0, inset: false},
    stroke: {enabled: false, color: '#000000', width: 8}
});

export const defaultSettings = () => ({
    size: 128,
    background: {
        shape: 'square', paint: paint('#000000'),
        pattern: {type: 'none', color: '#ffffff', opacity: 30, scale: 32},
        texture: {key: '', scale: 128, opacity: 100},
        frame: {width: 0, color: '#ffffff'}
    },
    foreground: Object.assign({
        paint: paint('#ffffff'),
        flipX: false, flipY: false, rotate: 0, scale: 1, x: 0, y: 0, skewX: 0, skewY: 0, clip: false,
        broken: false, parts: []
    }, effects()),
    text: {content: '', font: 'Sans Serif', size: 96, color: '#ffffff', bold: true, x: 0, y: 160,
        outline: {enabled: true, color: '#000000', width: 6}},
    badge: {id: '', size: 160, x: 160, y: 160, bg: '#000000', fg: '#ffffff', label: ''}
});

export const resetSection = (settings, section) => {
    const fresh = defaultSettings();
    return Object.assign({}, settings, {[section]: fresh[section]});
};

const merge = (base, over) => {
    if (!over || typeof over !== 'object' || Array.isArray(over)) return over === undefined ? base : over;
    const out = Object.assign({}, base);
    for (const key of Object.keys(over)) out[key] = merge(base ? base[key] : undefined, over[key]);
    return out;
};

export const PRESETS = [
    {id: 'website', label: 'game-icons.net (white on black)', settings: {}},
    {id: 'transparent', label: 'Transparent, black', settings: {
        background: {shape: 'none'}, foreground: {paint: {color: '#000000'}}}},
    {id: 'sticker', label: 'Sticker (white with outline)', settings: {
        background: {shape: 'none'}, foreground: {paint: {color: '#ffffff'}, stroke: {enabled: true, color: '#000000', width: 12}}}},
    {id: 'fire', label: 'Fire', settings: {
        background: {shape: 'square', paint: {type: 'radial', color: '#5a1000', color2: '#1a0000'}},
        foreground: {paint: {type: 'linear', color: '#ffe000', color2: '#ff3000', angle: 90},
            shadow: {enabled: true, color: '#ff6a00', blur: 14, x: 0, y: 0}}}},
    {id: 'hacker', label: 'Hacker terminal', settings: {
        background: {shape: 'square', paint: {color: '#000000'}},
        foreground: {paint: {color: '#00ff41'}, shadow: {enabled: true, color: '#00ff41', blur: 6, x: 0, y: 0}}}},
    {id: 'ice', label: 'Ice', settings: {
        background: {shape: 'circle', paint: {type: 'radial', color: '#e6f8ff', color2: '#5aaee8'}},
        foreground: {paint: {type: 'linear', color: '#ffffff', color2: '#b9e6ff', angle: 90},
            stroke: {enabled: true, color: '#1d5f9e', width: 6}}}},
    {id: 'gold', label: 'Gold coin', settings: {
        background: {shape: 'circle', paint: {type: 'radial', color: '#ffe680', color2: '#c79100'},
            frame: {width: 22, color: '#8a6200'}},
        foreground: {paint: {color: '#6b4b00'}, scale: 0.75}}},
    {id: 'poison', label: 'Poison', settings: {
        background: {shape: 'hexagon', paint: {color: '#2b0040'}},
        foreground: {paint: {type: 'linear', color: '#d4ff4f', color2: '#2e9e00', angle: 90}, scale: 0.8,
            shadow: {enabled: true, color: '#9dff00', blur: 10, x: 0, y: 0}}}},
    {id: 'stone', label: 'Stone', settings: {
        background: {shape: 'octagon', paint: {type: 'linear', color: '#a3a3a3', color2: '#5c5c5c', angle: 90},
            frame: {width: 14, color: '#3a3a3a'}},
        foreground: {paint: {color: '#2b2b2b'}, scale: 0.8,
            shadow: {enabled: true, color: '#000000', blur: 4, x: 3, y: 3, inset: true}}}},
    {id: 'blueprint', label: 'Blueprint', settings: {
        background: {shape: 'square', paint: {color: '#0b3d91'}, pattern: {type: 'grid', color: '#ffffff', opacity: 25, scale: 32}},
        foreground: {paint: {color: '#ffffff'}, scale: 0.85}}}
];

export const applyPreset = (settings, presetId) => {
    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) return settings;
    const next = merge(defaultSettings(), preset.settings);
    next.size = settings.size;
    next.text = settings.text;
    next.badge = settings.badge;
    return next;
};

// ---- shapes ------------------------------------------------------------------------------------

const polygon = (points, rotate = -90, inner = 0) => {
    const total = inner ? points * 2 : points;
    const pts = [];
    for (let i = 0; i < total; i++) {
        const a = (rotate + (360 / total) * i) * Math.PI / 180;
        const r = inner && i % 2 ? C * inner : C;
        pts.push(`${r3(C + r * Math.cos(a))} ${r3(C + r * Math.sin(a))}`);
    }
    return `M${pts.join('L')}Z`;
};

export const SHAPES = {
    none: {label: 'None (transparent)', d: null},
    square: {label: 'Square', d: 'M0 0H512V512H0Z'},
    rounded: {label: 'Rounded square', d: 'M80 0H432A80 80 0 0 1 512 80V432A80 80 0 0 1 432 512H80A80 80 0 0 1 0 432V80A80 80 0 0 1 80 0Z'},
    circle: {label: 'Circle', d: 'M256 0A256 256 0 1 1 256 512A256 256 0 1 1 256 0Z'},
    triangle: {label: 'Triangle', d: 'M256 16L496 464H16Z'},
    diamond: {label: 'Diamond', d: polygon(4)},
    pentagon: {label: 'Pentagon', d: polygon(5)},
    hexagon: {label: 'Hexagon', d: polygon(6, 0)},
    octagon: {label: 'Octagon', d: polygon(8, -67.5)},
    star5: {label: 'Star (5 points)', d: polygon(5, -90, 0.48)},
    star6: {label: 'Star (6 points)', d: polygon(6, -90, 0.6)},
    star8: {label: 'Star (8 points)', d: polygon(8, -90, 0.7)},
    burst: {label: 'Burst (16 points)', d: polygon(16, -90, 0.82)},
    shield: {label: 'Shield', d: 'M256 0L480 64V240C480 368 384 464 256 512C128 464 32 368 32 240V64Z'},
    heart: {label: 'Heart', d: 'M256 480C160 400 16 304 16 168C16 88 80 32 152 32C200 32 236 60 256 96C276 60 312 32 360 32C432 32 496 88 496 168C496 304 352 400 256 480Z'}
};

export const PATTERNS = {
    none: 'None',
    lines: 'Lines',
    diagonal: 'Diagonal lines',
    grid: 'Grid',
    dots: 'Dots',
    checker: 'Checkerboard',
    waves: 'Waves',
    zigzag: 'Zigzag',
    bricks: 'Bricks'
};

const patternContent = (type, s, color) => {
    const st = `stroke="${color}" stroke-width="${r3(s / 8)}" fill="none"`;
    switch (type) {
    case 'lines': return `<path d="M0 ${s / 2}H${s}" ${st}/>`;
    case 'diagonal': return `<path d="M${-s / 2} ${s / 2}L${s / 2} ${-s / 2}M0 ${s}L${s} 0M${s / 2} ${s * 1.5}L${s * 1.5} ${s / 2}" ${st}/>`;
    case 'grid': return `<path d="M0 0H${s}M0 0V${s}" ${st}/>`;
    case 'dots': return `<circle cx="${s / 2}" cy="${s / 2}" r="${r3(s / 5)}" fill="${color}"/>`;
    case 'checker': return `<path d="M0 0H${s / 2}V${s / 2}H0ZM${s / 2} ${s / 2}H${s}V${s}H${s / 2}Z" fill="${color}"/>`;
    case 'waves': return `<path d="M0 ${s / 2}Q${s / 4} ${s / 4} ${s / 2} ${s / 2}T${s} ${s / 2}" ${st}/>`;
    case 'zigzag': return `<path d="M0 ${s * 0.7}L${s / 2} ${s * 0.3}L${s} ${s * 0.7}" ${st}/>`;
    case 'bricks': return `<path d="M0 0H${s}M0 ${s / 2}H${s}M${s / 2} 0V${s / 2}M0 ${s / 2}V${s}" ${st}/>`;
    default: return '';
    }
};

// ---- reading an icon ---------------------------------------------------------------------------

// Path data -> absolute commands, split at every "move to" (for Break apart).
const parsePath = d => {
    const cmds = [];
    let i = 0;
    let cmd = null;
    const ARGS = {m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0};
    const skip = () => {
        while (i < d.length && /[\s,]/.test(d[i])) i++;
    };
    const num = () => {
        skip();
        const m = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/.exec(d.slice(i, i + 40));
        if (!m) return null;
        i += m[0].length;
        return parseFloat(m[0]);
    };
    const flag = () => {
        skip();
        if (d[i] === '0' || d[i] === '1') return +d[i++];
        return null;
    };
    while (i < d.length) {
        skip();
        if (i >= d.length) break;
        if (/[MmLlHhVvCcSsQqTtAaZz]/.test(d[i])) cmd = d[i++];
        else if (!cmd) break;
        const lower = cmd.toLowerCase();
        if (lower === 'z') {
            cmds.push([cmd]);
            cmd = null;
            continue;
        }
        const args = [];
        for (let k = 0; k < ARGS[lower]; k++) {
            const v = lower === 'a' && (k === 3 || k === 4) ? flag() : num();
            if (v === null) return cmds;
            args.push(v);
        }
        cmds.push([cmd].concat(args));
        if (lower === 'm') cmd = cmd === 'm' ? 'l' : 'L';
    }
    return cmds;
};

export const splitPath = d => {
    const subpaths = [];
    let cur = null;
    let x = 0;
    let y = 0;
    let sx = 0;
    let sy = 0;
    for (const [c, ...a] of parsePath(d)) {
        const rel = c !== c.toUpperCase();
        const ax = v => (rel ? x + v : v);
        const ay = v => (rel ? y + v : v);
        const up = c.toUpperCase();
        if (up !== 'M' && !cur) {
            cur = [`M${r3(x)} ${r3(y)}`];
            subpaths.push(cur);
        }
        switch (up) {
        case 'M':
            x = sx = ax(a[0]);
            y = sy = ay(a[1]);
            cur = [`M${r3(x)} ${r3(y)}`];
            subpaths.push(cur);
            break;
        case 'L': case 'T':
            x = ax(a[0]);
            y = ay(a[1]);
            cur.push(`${up}${r3(x)} ${r3(y)}`);
            break;
        case 'H':
            x = ax(a[0]);
            cur.push(`H${r3(x)}`);
            break;
        case 'V':
            y = ay(a[0]);
            cur.push(`V${r3(y)}`);
            break;
        case 'C': {
            const p = [ax(a[0]), ay(a[1]), ax(a[2]), ay(a[3]), ax(a[4]), ay(a[5])];
            cur.push(`C${p.map(r3).join(' ')}`);
            x = p[4];
            y = p[5];
            break;
        }
        case 'S': case 'Q': {
            const p = [ax(a[0]), ay(a[1]), ax(a[2]), ay(a[3])];
            cur.push(`${up}${p.map(r3).join(' ')}`);
            x = p[2];
            y = p[3];
            break;
        }
        case 'A': {
            const nx = ax(a[5]);
            const ny = ay(a[6]);
            cur.push(`A${r3(a[0])} ${r3(a[1])} ${r3(a[2])} ${a[3]} ${a[4]} ${r3(nx)} ${r3(ny)}`);
            x = nx;
            y = ny;
            break;
        }
        case 'Z':
            cur.push('Z');
            x = sx;
            y = sy;
            break;
        }
    }
    return subpaths.map(p => p.join('')).filter(p => p.length > 12);
};

const DRAWABLE = /^(path|circle|ellipse|rect|polygon|polyline|line|g|use|text)$/;
const colorOf = (el, attr) => {
    const style = el.getAttribute('style') || '';
    const m = style.match(new RegExp(`(?:^|;)\\s*${attr}\\s*:\\s*([^;]+)`));
    return (m ? m[1] : el.getAttribute(attr) || '').trim();
};
const usedColors = (el, attr) => {
    const found = new Set();
    for (const node of [el, ...el.querySelectorAll('*')]) {
        const value = colorOf(node, attr);
        if (value && value !== 'none' && !value.startsWith('url(')) found.add(value.toLowerCase());
    }
    return Array.from(found);
};

// icon: {svg: text of the icon, ink: colour that "is" the icon (currentColor / #000), badge: true for
// game-icons badges}. Returns what compose() needs: viewBox, defs, elements, parts.
export const readIcon = ({svg, ink, badge}) => {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const root = doc.documentElement;
    const box = (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    const viewBox = box.length === 4 && box.every(Number.isFinite) ? box :
        [0, 0, parseFloat(root.getAttribute('width')) || CANVAS, parseFloat(root.getAttribute('height')) || CANVAS];
    let defs = '';
    const elements = [];
    for (const el of Array.from(root.children)) {
        const tag = el.tagName.toLowerCase();
        if (tag === 'defs' || tag === 'mask' || tag === 'clippath' || tag === 'lineargradient' ||
            tag === 'radialgradient' || tag === 'filter' || tag === 'style') {
            defs += new XMLSerializer().serializeToString(el);
            continue;
        }
        if (!DRAWABLE.test(tag)) continue;
        // inherited black becomes explicit, so it can be recoloured like any other colour
        if (!colorOf(el, 'fill') && tag !== 'g' && tag !== 'line' && tag !== 'polyline') el.setAttribute('fill', '#000');
        elements.push(el);
    }
    if (badge) {
        // game-icons badges: dark disc, white ring and white symbol (the offline library made the symbol black)
        for (const el of elements) if (el.tagName.toLowerCase() === 'path') el.setAttribute('fill', '#fff');
    }
    const inkColor = (badge ? '#fff' : ink).toLowerCase();
    const xml = elements.map(el => new XMLSerializer().serializeToString(el).replace(/ xmlns="[^"]*"/g, ''));
    const hasInk = xml.some(x => x.toLowerCase().includes(inkColor));
    // Parts for Break apart: the sub-paths of a single path, or each colour of each element
    let parts = [];
    if (elements.length === 1 && elements[0].tagName.toLowerCase() === 'path' && !colorOf(elements[0], 'stroke')) {
        const color = colorOf(elements[0], 'fill');
        parts = splitPath(elements[0].getAttribute('d') || '').map(d => ({el: 0, d, attr: 'fill', color}));
    } else {
        elements.forEach((el, i) => {
            for (const attr of ['fill', 'stroke']) {
                for (const color of usedColors(el, attr)) parts.push({el: i, attr, color});
            }
        });
    }
    return {viewBox, defs, xml, inkColor, hasInk, parts};
};

// ---- composing ---------------------------------------------------------------------------------

const paintDefs = (id, p) => {
    if (p.type === 'plain') return '';
    const stops = `<stop offset="0" stop-color="${p.color}"/><stop offset="1" stop-color="${p.color2}"/>`;
    if (p.type === 'radial') return `<radialGradient id="${id}" cx="0.5" cy="0.5" r="0.6">${stops}</radialGradient>`;
    const a = (p.angle || 0) * Math.PI / 180;
    const dx = Math.cos(a) / 2;
    const dy = Math.sin(a) / 2;
    return `<linearGradient id="${id}" x1="${r3(0.5 - dx)}" y1="${r3(0.5 - dy)}" x2="${r3(0.5 + dx)}" y2="${r3(0.5 + dy)}">${stops}</linearGradient>`;
};
const paintRef = (id, p) => (p.type === 'plain' ? p.color : `url(#${id})`);

// One filter for shadow and/or outline. `k` turns canvas pixels into the units where it is used.
const effectFilter = (id, fx, k) => {
    const sh = fx.shadow;
    const st = fx.stroke;
    if (!sh.enabled && !st.enabled) return '';
    let body = '';
    let top = 'SourceGraphic';
    if (st.enabled) {
        body += `<feMorphology in="SourceAlpha" operator="dilate" radius="${r3(st.width * k)}" result="dil"/>` +
            `<feFlood flood-color="${st.color}"/><feComposite in2="dil" operator="in" result="outline"/>` +
            '<feMerge result="stroked"><feMergeNode in="outline"/><feMergeNode in="SourceGraphic"/></feMerge>';
        top = 'stroked';
    }
    if (sh.enabled && sh.inset) {
        body += `<feComponentTransfer in="SourceAlpha" result="inv"><feFuncA type="table" tableValues="1 0"/></feComponentTransfer>` +
            `<feGaussianBlur in="inv" stdDeviation="${r3(sh.blur * k)}"/><feOffset dx="${r3(sh.x * k)}" dy="${r3(sh.y * k)}" result="ob"/>` +
            `<feFlood flood-color="${sh.color}"/><feComposite in2="ob" operator="in"/><feComposite in2="SourceAlpha" operator="in" result="inner"/>` +
            `<feMerge><feMergeNode in="${top}"/><feMergeNode in="inner"/></feMerge>`;
    } else if (sh.enabled) {
        body += `<feGaussianBlur in="${top === 'SourceGraphic' ? 'SourceAlpha' : top}" stdDeviation="${r3(sh.blur * k)}"/>` +
            `<feOffset dx="${r3(sh.x * k)}" dy="${r3(sh.y * k)}" result="ob"/><feFlood flood-color="${sh.color}"/>` +
            `<feComposite in2="ob" operator="in" result="shadow"/><feMerge><feMergeNode in="shadow"/><feMergeNode in="${top}"/></feMerge>`;
    }
    return `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">${body}</filter>`;
};

// Replaces `from` (a colour) with `to` in the fill or stroke of an element and its children.
const recolor = (xml, attr, from, to) => {
    const f = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return xml
        .replace(new RegExp(`(\\s${attr}=")${f}(")`, 'gi'), `$1${to}$2`)
        .replace(new RegExp(`(${attr}\\s*:\\s*)${f}`, 'gi'), `$1${to}`);
};
// Shows only one colour attribute of an element (the other one becomes "none").
const only = (xml, attr) => {
    const other = attr === 'fill' ? 'stroke' : 'fill';
    let out = xml.replace(new RegExp(`(\\s${other}=")[^"]*(")`, 'g'), '$1none$2')
        .replace(new RegExp(`(${other}\\s*:\\s*)[^;"]+`, 'g'), '$1none');
    if (!new RegExp(`^<\\w+[^>]*\\s${other}="`).test(out)) out = out.replace(/^<(\w+)/, `<$1 ${other}="none"`);
    return out;
};

const badgeMarkup = (badgeSvg, b) => {
    if (!badgeSvg) return '';
    const icon = readIcon({svg: badgeSvg, ink: '#fff', badge: true});
    const k = b.size / icon.viewBox[2];
    // disc and the inside of the ring: badge colour; ring line and symbol: symbol colour
    let inner = icon.xml.map(x => recolor(recolor(recolor(x, 'fill', '#000', b.bg), 'stroke', '#fff', b.fg), 'fill', '#fff', b.fg))
        .join('');
    if (b.label) {
        inner += `<text x="${icon.viewBox[2] / 2}" y="${icon.viewBox[3] / 2}" text-anchor="middle" dominant-baseline="central" ` +
            `font-family="Sans Serif" font-weight="bold" font-size="${icon.viewBox[2] * 0.45}" fill="${b.fg}">${esc(b.label)}</text>`;
    }
    return `<g data-drag="badge" transform="translate(${r3(C + b.x - b.size / 2)} ${r3(C + b.y - b.size / 2)}) scale(${r3(k)})">${inner}</g>`;
};

// icon: from readIcon. settings: from defaultSettings. extras: {textureUrl, badgeSvg, preview}.
// preview adds data-part attributes so the studio can tell which part was clicked.
export const compose = (icon, s, extras = {}) => {
    const bg = s.background;
    const fg = s.foreground;
    const defs = [icon.defs];
    const body = [];
    const shape = SHAPES[bg.shape] && SHAPES[bg.shape].d;
    const outline = shape || SHAPES.square.d;
    defs.push(`<clipPath id="pm-shape"><path d="${outline}"/></clipPath>`);

    // background
    if (shape) {
        defs.push(paintDefs('pm-bg', bg.paint));
        body.push(`<path d="${shape}" fill="${paintRef('pm-bg', bg.paint)}" fill-opacity="${bg.paint.opacity / 100}"/>`);
    }
    if (extras.textureUrl && bg.texture.key) {
        const t = bg.texture.scale;
        defs.push(`<pattern id="pm-texture" patternUnits="userSpaceOnUse" width="${t}" height="${t}">` +
            `<image href="${extras.textureUrl}" width="${t}" height="${t}" preserveAspectRatio="none"/></pattern>`);
        body.push(`<path d="${outline}" fill="url(#pm-texture)" fill-opacity="${bg.texture.opacity / 100}"/>`);
    }
    if (bg.pattern.type !== 'none') {
        const p = bg.pattern.scale;
        defs.push(`<pattern id="pm-pattern" patternUnits="userSpaceOnUse" width="${p}" height="${p}">` +
            `${patternContent(bg.pattern.type, p, bg.pattern.color)}</pattern>`);
        body.push(`<path d="${outline}" fill="url(#pm-pattern)" opacity="${bg.pattern.opacity / 100}" clip-path="url(#pm-shape)"/>`);
    }

    // foreground
    const [vx, vy, vw, vh] = icon.viewBox;
    const fit = CANVAS / Math.max(vw, vh);
    const fitTransform = `translate(${r3(C - (vw * fit) / 2)} ${r3(C - (vh * fit) / 2)}) scale(${r3(fit)}) translate(${-vx} ${-vy})`;
    const fgTransform = `translate(${r3(C + fg.x)} ${r3(C + fg.y)}) rotate(${fg.rotate}) skewX(${fg.skewX}) skewY(${fg.skewY}) ` +
        `scale(${r3(fg.scale * (fg.flipX ? -1 : 1))} ${r3(fg.scale * (fg.flipY ? -1 : 1))}) translate(${-C} ${-C})`;
    const toLocal = 1 / (fit * fg.scale); // canvas pixels -> icon units (for per-part effects)
    let inner;
    if (fg.broken && fg.parts.length) {
        inner = icon.parts.map((part, i) => {
            const ps = fg.parts[i] || fg;
            defs.push(paintDefs(`pm-part${i}`, ps.paint));
            const filter = effectFilter(`pm-pfx${i}`, ps, toLocal);
            if (filter) defs.push(filter);
            const color = paintRef(`pm-part${i}`, ps.paint);
            let xml;
            if (part.d) {
                xml = `<path d="${part.d}" fill="${color}"/>`;
            } else {
                xml = only(recolor(icon.xml[part.el], part.attr, part.color, color), part.attr);
            }
            const attrs = `${extras.preview ? ` data-part="${i}"` : ''}${filter ? ` filter="url(#pm-pfx${i})"` : ''}` +
                ` opacity="${ps.paint.opacity / 100}"`;
            return `<g${attrs}>${xml}</g>`;
        }).join('');
    } else {
        defs.push(paintDefs('pm-fg', fg.paint));
        const color = paintRef('pm-fg', fg.paint);
        inner = icon.xml.map(x => (icon.hasInk ? recolor(recolor(x, 'fill', icon.inkColor, color), 'stroke', icon.inkColor, color) : x)).join('');
        inner = `<g opacity="${fg.paint.opacity / 100}">${inner}</g>`;
    }
    const fgFilter = !fg.broken && effectFilter('pm-fgfx', fg, 1);
    if (fgFilter) defs.push(fgFilter);
    let fgGroup = `<g transform="${fgTransform}"><g transform="${fitTransform}">${inner}</g></g>`;
    if (fgFilter) fgGroup = `<g filter="url(#pm-fgfx)">${fgGroup}</g>`;
    if (fg.clip) fgGroup = `<g clip-path="url(#pm-shape)">${fgGroup}</g>`;
    body.push(fgGroup);

    // frame
    if (bg.frame.width > 0) {
        body.push(`<path d="${outline}" fill="none" stroke="${bg.frame.color}" stroke-width="${bg.frame.width * 2}" clip-path="url(#pm-shape)"/>`);
    }
    // badge and text
    if (s.badge.id) body.push(badgeMarkup(extras.badgeSvg, s.badge));
    const t = s.text;
    if (t.content) {
        const o = t.outline.enabled ? ` stroke="${t.outline.color}" stroke-width="${t.outline.width}" paint-order="stroke" stroke-linejoin="round"` : '';
        body.push(`<text data-drag="text" x="${r3(C + t.x)}" y="${r3(C + t.y)}" text-anchor="middle" dominant-baseline="central" ` +
            `font-family="${esc(t.font)}" font-size="${t.size}" font-weight="${t.bold ? 'bold' : 'normal'}" fill="${t.color}"${o}>${esc(t.content)}</text>`);
    }
    return `<svg xmlns="${NS}" xmlns:xlink="http://www.w3.org/1999/xlink" width="${s.size}" height="${s.size}" viewBox="0 0 ${CANVAS} ${CANVAS}">` +
        `<defs>${defs.join('')}</defs>${body.join('')}</svg>`;
};

// Any CSS colour -> #rrggbb (for the colour pickers).
let colorContext = null;
export const toHex = color => {
    if (!colorContext) colorContext = document.createElement('canvas').getContext('2d');
    colorContext.fillStyle = '#000000';
    colorContext.fillStyle = color === 'currentcolor' ? '#000000' : color;
    const value = colorContext.fillStyle;
    if (value.startsWith('#')) return value;
    const m = value.match(/\d+(\.\d+)?/g) || [0, 0, 0];
    return `#${m.slice(0, 3).map(n => Math.round(+n).toString(16).padStart(2, '0')).join('')}`;
};

// A fresh set of per-part settings (Break apart). Parts in the icon's main colour start with the
// foreground's colour; parts in other colours (badges, coloured icons) keep their own colour.
export const breakApart = (fg, icon) => Object.assign({}, fg, {
    broken: true,
    parts: icon.parts.map(part => ({
        paint: part.d || (icon.hasInk && part.color === icon.inkColor) ?
            Object.assign({}, fg.paint) :
            Object.assign({}, fg.paint, {type: 'plain', color: toHex(part.color), opacity: 100}),
        shadow: Object.assign({}, fg.shadow),
        stroke: Object.assign({}, fg.stroke)
    }))
});

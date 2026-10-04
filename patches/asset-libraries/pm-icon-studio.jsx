// PenguinMod Desktop (patch section 16): the icon studio, like the Studio on game-icons.net.
// Opens when a game-icons.net or Iconify icon is clicked in the sprite / costume library; the
// drawing itself is done by pm-icon-svg.js.
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import styles from './pm-icon-studio.css';
import {
    CANVAS, PATTERNS, PRESETS, SHAPES, applyPreset, breakApart, compose, defaultSettings, readIcon, resetSection
} from '../../lib/pm-icon-svg.js';
import {
    addStudioAsset, iconifyNeighbours, iconifyTagsFor, loadBadges, loadIconSvgs, loadStudioIcon,
    tagNeighbours, textureDataUrl, textureItems
} from '../../lib/pm-asset-sources.js';

const SECTIONS = [['background', 'background'], ['foreground', 'foreground'], ['text', 'text'], ['badge', 'badge'],
    ['size', 'size & preset']];
const FONTS = ['Sans Serif', 'Serif', 'Handwriting', 'Marker', 'Curly', 'Pixel'];
const SIZES = [16, 32, 64, 128, 256, 512];

const clone = o => JSON.parse(JSON.stringify(o));

// The last studio settings: kept while moving from icon to icon (like on the website) and between
// sessions, and used for the icon previews in the library and for the "+" button.
const STORE = 'pmdesktop:iconStudio';
let lastSettings = null;
let saveTimer = null;
export const getStudioSettings = () => {
    if (!lastSettings) {
        try {
            const stored = JSON.parse(localStorage.getItem(STORE));
            if (stored && stored.foreground && stored.background) lastSettings = Object.assign(defaultSettings(), stored);
        } catch (e) { /* no stored settings */ }
        if (!lastSettings) lastSettings = applyPreset(defaultSettings(), 'transparent');
    }
    const s = clone(lastSettings);
    s.foreground.broken = false; // parts belong to one icon only
    s.foreground.parts = [];
    return s;
};
const rememberSettings = settings => {
    lastSettings = settings;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        try {
            localStorage.setItem(STORE, JSON.stringify(settings));
        } catch (e) { /* not saved, still used for this session */ }
    }, 300);
};

// Textures and badges the settings use, loaded once.
const studioExtras = async settings => {
    const extras = {textureUrl: null, badgeSvg: null, badge: null};
    if (settings.background.texture.key) {
        const tex = (await textureItems()).find(t => t.key === settings.background.texture.key);
        if (tex) extras.textureUrl = await textureDataUrl(tex);
    }
    if (settings.badge.id) {
        extras.badge = (await loadBadges()).find(b => b.id === settings.badge.id) || null;
        extras.badgeSvg = extras.badge && extras.badge.svgText;
    }
    return extras;
};
const studioIcon = async item => {
    if (!item.studioIcon) item.studioIcon = readIcon(await loadStudioIcon(item));
    return item.studioIcon;
};

// Library previews in the current studio style (item.styledThumb).
export const studioThumbs = async items => {
    const settings = getStudioSettings();
    settings.size = 96;
    const key = JSON.stringify(settings);
    const todo = items.filter(item => item.studio && item.styledKey !== key);
    if (!todo.length) return false;
    const extras = await studioExtras(settings);
    await Promise.all(todo.map(async item => {
        try {
            const svg = compose(await studioIcon(item), settings, extras);
            item.styledThumb = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
            item.styledKey = key;
        } catch (e) { /* keeps the plain preview */ }
    }));
    return true;
};

// The "+" button: adds the icon exactly as its preview shows it.
export const quickAddStudio = async (vm, kind, item) => {
    const settings = getStudioSettings();
    const extras = await studioExtras(settings);
    const svg = compose(await studioIcon(item), settings, extras);
    return addStudioAsset(vm, kind, item, svg, {png: false, size: settings.size, badge: extras.badge});
};
const set = (obj, path, value) => {
    const out = clone(obj);
    let cur = out;
    for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
    cur[path[path.length - 1]] = value;
    return out;
};

const Field = ({label, children}) => (
    <label className={styles.field}><span className={styles.fieldLabel}>{label}</span>{children}</label>
);
Field.propTypes = {children: PropTypes.node, label: PropTypes.string};

const Num = ({value, min, max, step, onChange}) => (
    <input
        className={styles.number} type="number" value={value} min={min} max={max} step={step || 1}
        onChange={e => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
    />
);
Num.propTypes = {max: PropTypes.number, min: PropTypes.number, onChange: PropTypes.func, step: PropTypes.number, value: PropTypes.number};

const Range = ({value, min, max, step, onChange}) => (
    <input className={styles.range} type="range" value={value} min={min} max={max} step={step || 1}
        onChange={e => onChange(Number(e.target.value))} />
);
Range.propTypes = Num.propTypes;

const Color = ({value, onChange}) => (
    <input className={styles.color} type="color" value={value} onChange={e => onChange(e.target.value)} />
);
Color.propTypes = {onChange: PropTypes.func, value: PropTypes.string};

const Check = ({label, value, onChange}) => (
    <label className={styles.check}><input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} />{label}</label>
);
Check.propTypes = {label: PropTypes.string, onChange: PropTypes.func, value: PropTypes.bool};

class IconStudio extends React.Component {
    constructor (props) {
        super(props);
        const settings = getStudioSettings();
        this.state = {
            settings, section: 'foreground', icon: null, error: null, busy: false, part: 0,
            tags: [], textures: [], badges: [], textureUrl: null, badgeSvg: null
        };
        this.drag = null;
        this.previewRef = React.createRef();
        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);
    }
    componentDidMount () {
        this.loadIcon();
        this.loadExtras(this.state.settings);
        window.addEventListener('pointermove', this.handlePointerMove);
        window.addEventListener('pointerup', this.handlePointerUp);
    }
    componentDidUpdate (prevProps) {
        if (prevProps.item !== this.props.item) {
            this.setState(state => ({
                icon: null, part: 0, tags: [], error: null,
                settings: Object.assign({}, state.settings, {
                    foreground: Object.assign({}, state.settings.foreground, {broken: false, parts: []})
                })
            }), () => this.loadIcon());
        }
    }
    componentWillUnmount () {
        this.unmounted = true;
        window.removeEventListener('pointermove', this.handlePointerMove);
        window.removeEventListener('pointerup', this.handlePointerUp);
    }
    async loadIcon () {
        const item = this.props.item;
        try {
            const icon = readIcon(await loadStudioIcon(item));
            if (this.unmounted || item !== this.props.item) return;
            this.setState({icon});
        } catch (err) {
            if (!this.unmounted) this.setState({error: `Could not open this icon: ${err.message}`});
        }
        try {
            let tags;
            if (item.source === 'iconify') {
                const names = await iconifyTagsFor(item);
                tags = await Promise.all(names.map(async tag => Object.assign({tag}, await iconifyNeighbours(item, tag))));
            } else {
                tags = await Promise.all((item.tags || []).map(async tag => Object.assign({tag}, await tagNeighbours(item, tag))));
            }
            if (!this.unmounted && item === this.props.item) this.setState({tags});
        } catch (err) {
            // tags are a convenience; the studio works without them
        }
    }
    // Texture pictures and badge drawings (for the preview here) are only loaded when needed.
    async loadExtras (settings) {
        try {
            const tex = settings.background.texture.key;
            if (tex) {
                const textures = this.state.textures.length ? this.state.textures : await textureItems();
                const item = textures.find(t => t.key === tex);
                const textureUrl = item ? await textureDataUrl(item) : null;
                if (!this.unmounted) this.setState({textures, textureUrl});
            } else if (this.state.textureUrl) {
                this.setState({textureUrl: null});
            }
            const badgeId = settings.badge.id;
            if (badgeId) {
                const badges = this.state.badges.length ? this.state.badges : await loadBadges();
                const badge = badges.find(b => b.id === badgeId);
                if (!this.unmounted) this.setState({badges, badgeSvg: badge ? badge.svgText : null});
            }
        } catch (err) {
            if (!this.unmounted) this.setState({error: err.message});
        }
    }
    update (path, value) {
        this.setSettings(set(this.state.settings, path, value));
    }
    setSettings (settings) {
        const before = this.state.settings;
        rememberSettings(settings);
        this.setState({settings});
        if (before.background.texture.key !== settings.background.texture.key || before.badge.id !== settings.badge.id) {
            this.loadExtras(settings);
        }
    }
    // Foreground colour, shadow and outline go to the selected part once the icon is broken apart.
    fgPath (key) {
        const fg = this.state.settings.foreground;
        return fg.broken ? ['foreground', 'parts', this.state.part, key] : ['foreground', key];
    }
    fgValue (key) {
        const fg = this.state.settings.foreground;
        return fg.broken ? (fg.parts[this.state.part] || fg)[key] : fg[key];
    }
    handlePointerDown (e) {
        const {settings} = this.state;
        const partEl = e.target.closest && e.target.closest('[data-part]');
        if (partEl) {
            this.setState({part: Number(partEl.getAttribute('data-part')), section: 'foreground'});
            return;
        }
        const dragEl = e.target.closest && e.target.closest('[data-drag]');
        if (!dragEl) return;
        const what = dragEl.getAttribute('data-drag');
        const rect = this.previewRef.current.getBoundingClientRect();
        this.drag = {what, scale: CANVAS / rect.width, x: e.clientX, y: e.clientY,
            start: {x: settings[what].x, y: settings[what].y}};
        this.setState({section: what});
        e.preventDefault();
    }
    handlePointerMove (e) {
        if (!this.drag) return;
        const d = this.drag;
        const s = clone(this.state.settings);
        s[d.what].x = Math.round(d.start.x + (e.clientX - d.x) * d.scale);
        s[d.what].y = Math.round(d.start.y + (e.clientY - d.y) * d.scale);
        this.setSettings(s);
    }
    handlePointerUp () {
        this.drag = null;
    }
    async handleAdd (png) {
        const {settings, icon, badges} = this.state;
        if (!icon || this.state.busy) return;
        this.setState({busy: true, error: null});
        try {
            const svg = compose(icon, settings, {textureUrl: this.state.textureUrl, badgeSvg: this.state.badgeSvg});
            const badge = settings.badge.id ? badges.find(b => b.id === settings.badge.id) : null;
            await addStudioAsset(this.props.vm, this.props.kind, this.props.item, svg, {png, size: settings.size, badge});
            this.props.onAdded();
        } catch (err) {
            if (!this.unmounted) this.setState({busy: false, error: `Could not add the icon: ${err.message}`});
        }
    }
    navigate (step) {
        const {list, item} = this.props;
        const i = list.indexOf(item);
        if (i === -1 || list.length < 2) return;
        const next = list[(i + step + list.length) % list.length];
        if (next.source === 'iconify' && !next.iconSvg) loadIconSvgs([next]).then(() => this.props.onOpen(next), () => this.props.onOpen(next));
        else this.props.onOpen(next);
    }
    renderPaint (path, value, disabled) {
        return (
            <div className={classNames(styles.group, disabled && styles.disabled)}>
                <Field label="Fill">
                    <select className={styles.select} value={value.type} disabled={disabled}
                        onChange={e => this.update(path.concat('type'), e.target.value)}>
                        <option value="plain">plain</option>
                        <option value="linear">linear gradient</option>
                        <option value="radial">radial gradient</option>
                    </select>
                </Field>
                <Field label="color"><Color value={value.color} onChange={v => this.update(path.concat('color'), v)} /></Field>
                {value.type !== 'plain' && (
                    <Field label="to"><Color value={value.color2} onChange={v => this.update(path.concat('color2'), v)} /></Field>
                )}
                {value.type === 'linear' && (
                    <Field label="angle"><Num value={value.angle} min={0} max={360} step={15}
                        onChange={v => this.update(path.concat('angle'), v)} /></Field>
                )}
                <Field label="opacity"><Range value={value.opacity} min={0} max={100}
                    onChange={v => this.update(path.concat('opacity'), v)} /></Field>
            </div>
        );
    }
    renderEffects () {
        const shadow = this.fgValue('shadow');
        const stroke = this.fgValue('stroke');
        const sp = this.fgPath('shadow');
        const tp = this.fgPath('stroke');
        return (
            <React.Fragment>
                <h3 className={styles.heading}>{'Shadow'}</h3>
                <div className={styles.group}>
                    <Check label="enabled" value={shadow.enabled} onChange={v => this.update(sp.concat('enabled'), v)} />
                    {shadow.enabled && (
                        <React.Fragment>
                            <Field label="color"><Color value={shadow.color} onChange={v => this.update(sp.concat('color'), v)} /></Field>
                            <Field label="blur"><Range value={shadow.blur} min={0} max={40} onChange={v => this.update(sp.concat('blur'), v)} /></Field>
                            <Field label="x"><Num value={shadow.x} min={-60} max={60} onChange={v => this.update(sp.concat('x'), v)} /></Field>
                            <Field label="y"><Num value={shadow.y} min={-60} max={60} onChange={v => this.update(sp.concat('y'), v)} /></Field>
                            <Check label="inset" value={shadow.inset} onChange={v => this.update(sp.concat('inset'), v)} />
                        </React.Fragment>
                    )}
                </div>
                <h3 className={styles.heading}>{'Stroke'}</h3>
                <div className={styles.group}>
                    <Check label="enabled" value={stroke.enabled} onChange={v => this.update(tp.concat('enabled'), v)} />
                    {stroke.enabled && (
                        <React.Fragment>
                            <Field label="color"><Color value={stroke.color} onChange={v => this.update(tp.concat('color'), v)} /></Field>
                            <Field label="width"><Range value={stroke.width} min={1} max={40} onChange={v => this.update(tp.concat('width'), v)} /></Field>
                        </React.Fragment>
                    )}
                </div>
            </React.Fragment>
        );
    }
    renderForeground () {
        const {settings, icon, part} = this.state;
        const fg = settings.foreground;
        const tool = (label, title, onClick) => (
            <button className={styles.tool} title={title} onClick={onClick}>{label}</button>
        );
        const paintDisabled = !fg.broken && icon && !icon.hasInk;
        return (
            <React.Fragment>
                <h3 className={styles.heading}>{'Transformations'}</h3>
                <div className={styles.tools}>
                    {tool('⇆', 'Flip horizontally', () => this.update(['foreground', 'flipX'], !fg.flipX))}
                    {tool('⇅', 'Flip vertically', () => this.update(['foreground', 'flipY'], !fg.flipY))}
                    {tool('↻', 'Rotate 45° clockwise', () => this.update(['foreground', 'rotate'], (fg.rotate + 45) % 360))}
                    {tool('↺', 'Rotate 45° counter-clockwise', () => this.update(['foreground', 'rotate'], (fg.rotate + 315) % 360))}
                    {tool('－', 'Shrink', () => this.update(['foreground', 'scale'], Math.max(0.1, Math.round(fg.scale / 1.1 * 100) / 100)))}
                    {tool('＋', 'Grow', () => this.update(['foreground', 'scale'], Math.min(4, Math.round(fg.scale * 1.1 * 100) / 100)))}
                </div>
                <h3 className={styles.heading}>{'Position'}</h3>
                <div className={styles.row}>
                    <Field label="x"><Num value={fg.x} min={-512} max={512} onChange={v => this.update(['foreground', 'x'], v)} /></Field>
                    <Field label="y"><Num value={fg.y} min={-512} max={512} onChange={v => this.update(['foreground', 'y'], v)} /></Field>
                </div>
                <h3 className={styles.heading}>{'Skew'}</h3>
                <div className={styles.row}>
                    <Field label="x"><Num value={fg.skewX} min={-60} max={60} onChange={v => this.update(['foreground', 'skewX'], v)} /></Field>
                    <Field label="y"><Num value={fg.skewY} min={-60} max={60} onChange={v => this.update(['foreground', 'skewY'], v)} /></Field>
                </div>
                <div className={styles.row}>
                    <Field label="zoom"><Num value={fg.scale} min={0.1} max={4} step={0.05} onChange={v => this.update(['foreground', 'scale'], v)} /></Field>
                    <Field label="rotate"><Num value={fg.rotate} min={-360} max={360} step={15} onChange={v => this.update(['foreground', 'rotate'], v)} /></Field>
                </div>
                <h3 className={styles.heading}>{'Paths'}</h3>
                {fg.broken ? (
                    <div className={styles.group}>
                        <div className={styles.partNav}>
                            <button className={styles.arrow} onClick={() => this.setState({part: (part + fg.parts.length - 1) % fg.parts.length})}>{'‹'}</button>
                            <span>{`part ${part + 1} of ${fg.parts.length}`}</span>
                            <button className={styles.arrow} onClick={() => this.setState({part: (part + 1) % fg.parts.length})}>{'›'}</button>
                        </div>
                        <p className={styles.hint}>{'Click a part in the preview to select it. Colour, shadow and stroke below apply to the selected part.'}</p>
                        <button className={styles.button} onClick={() => this.setSettings(set(this.state.settings, ['foreground'],
                            Object.assign({}, fg, {broken: false, parts: []})))}>{'Join again'}</button>
                    </div>
                ) : (
                    <button
                        className={styles.button} disabled={!icon || icon.parts.length < 2}
                        title={icon && icon.parts.length < 2 ? 'This icon has only one part' : ''}
                        onClick={() => {
                            this.setState({part: 0});
                            this.setSettings(set(settings, ['foreground'], breakApart(fg, icon)));
                        }}
                    >{'Break apart'}</button>
                )}
                <h3 className={styles.heading}>{fg.broken ? `Gradient (part ${part + 1})` : 'Gradient'}</h3>
                {paintDisabled && <p className={styles.hint}>{'This icon has its own colours. Break it apart to change them.'}</p>}
                {this.renderPaint(this.fgPath('paint'), this.fgValue('paint'), paintDisabled)}
                {this.renderEffects()}
                <Check label="keep inside the background shape (clip)" value={fg.clip} onChange={v => this.update(['foreground', 'clip'], v)} />
                <h3 className={styles.heading}>{'Back to zero'}</h3>
                <button className={styles.button} onClick={() => {
                    this.setState({part: 0});
                    this.setSettings(resetSection(settings, 'foreground'));
                }}>{'Reset foreground'}</button>
            </React.Fragment>
        );
    }
    renderBackground () {
        const {settings, textures} = this.state;
        const bg = settings.background;
        const packs = [];
        for (const t of textures) {
            if (!packs.length || packs[packs.length - 1].title !== t.subtitle) packs.push({title: t.subtitle, items: []});
            packs[packs.length - 1].items.push(t);
        }
        return (
            <React.Fragment>
                <h3 className={styles.heading}>{'Shape'}</h3>
                <select className={styles.select} value={bg.shape} onChange={e => this.update(['background', 'shape'], e.target.value)}>
                    {Object.keys(SHAPES).map(k => <option key={k} value={k}>{SHAPES[k].label}</option>)}
                </select>
                <h3 className={styles.heading}>{'Gradient'}</h3>
                {this.renderPaint(['background', 'paint'], bg.paint, bg.shape === 'none')}
                <h3 className={styles.heading}>{'Pattern'}</h3>
                <div className={styles.group}>
                    <select className={styles.select} value={bg.pattern.type} onChange={e => this.update(['background', 'pattern', 'type'], e.target.value)}>
                        {Object.keys(PATTERNS).map(k => <option key={k} value={k}>{PATTERNS[k]}</option>)}
                    </select>
                    {bg.pattern.type !== 'none' && (
                        <React.Fragment>
                            <Field label="color"><Color value={bg.pattern.color} onChange={v => this.update(['background', 'pattern', 'color'], v)} /></Field>
                            <Field label="size"><Range value={bg.pattern.scale} min={8} max={128} onChange={v => this.update(['background', 'pattern', 'scale'], v)} /></Field>
                            <Field label="opacity"><Range value={bg.pattern.opacity} min={0} max={100} onChange={v => this.update(['background', 'pattern', 'opacity'], v)} /></Field>
                        </React.Fragment>
                    )}
                </div>
                <h3 className={styles.heading}>{'Texture (Kenney, offline)'}</h3>
                <div className={styles.group}>
                    <select
                        className={styles.select} value={bg.texture.key}
                        onFocus={() => {
                            if (!textures.length) textureItems().then(t => this.setState({textures: t}), () => {});
                        }}
                        onChange={e => this.update(['background', 'texture', 'key'], e.target.value)}
                    >
                        <option value="">{'none'}</option>
                        {packs.map(p => (
                            <optgroup key={p.title} label={p.title}>
                                {p.items.map(t => <option key={t.key} value={t.key}>{t.name}</option>)}
                            </optgroup>
                        ))}
                        {!textures.length && bg.texture.key && <option value={bg.texture.key}>{'(loading…)'}</option>}
                    </select>
                    {bg.texture.key && (
                        <React.Fragment>
                            <Field label="tile size"><Range value={bg.texture.scale} min={16} max={512} step={8} onChange={v => this.update(['background', 'texture', 'scale'], v)} /></Field>
                            <Field label="opacity"><Range value={bg.texture.opacity} min={0} max={100} onChange={v => this.update(['background', 'texture', 'opacity'], v)} /></Field>
                        </React.Fragment>
                    )}
                </div>
                <h3 className={styles.heading}>{'Frame'}</h3>
                <div className={styles.group}>
                    <Field label="width"><Range value={bg.frame.width} min={0} max={60} onChange={v => this.update(['background', 'frame', 'width'], v)} /></Field>
                    <Field label="color"><Color value={bg.frame.color} onChange={v => this.update(['background', 'frame', 'color'], v)} /></Field>
                </div>
                <h3 className={styles.heading}>{'Back to zero'}</h3>
                <button className={styles.button} onClick={() => this.setSettings(resetSection(settings, 'background'))}>{'Reset background'}</button>
            </React.Fragment>
        );
    }
    renderText () {
        const t = this.state.settings.text;
        return (
            <React.Fragment>
                <h3 className={styles.heading}>{'Content'}</h3>
                <input className={styles.text} value={t.content} placeholder="Type a label"
                    onChange={e => this.update(['text', 'content'], e.target.value)} />
                <p className={styles.hint}>{'Drag the text in the preview to move it.'}</p>
                <h3 className={styles.heading}>{'Font'}</h3>
                <div className={styles.group}>
                    <select className={styles.select} value={t.font} onChange={e => this.update(['text', 'font'], e.target.value)}>
                        {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <Field label="size"><Range value={t.size} min={8} max={300} onChange={v => this.update(['text', 'size'], v)} /></Field>
                    <Field label="color"><Color value={t.color} onChange={v => this.update(['text', 'color'], v)} /></Field>
                    <Check label="bold" value={t.bold} onChange={v => this.update(['text', 'bold'], v)} />
                </div>
                <h3 className={styles.heading}>{'Outline'}</h3>
                <div className={styles.group}>
                    <Check label="enabled" value={t.outline.enabled} onChange={v => this.update(['text', 'outline', 'enabled'], v)} />
                    {t.outline.enabled && (
                        <React.Fragment>
                            <Field label="color"><Color value={t.outline.color} onChange={v => this.update(['text', 'outline', 'color'], v)} /></Field>
                            <Field label="width"><Range value={t.outline.width} min={1} max={30} onChange={v => this.update(['text', 'outline', 'width'], v)} /></Field>
                        </React.Fragment>
                    )}
                </div>
                <h3 className={styles.heading}>{'Position'}</h3>
                <div className={styles.row}>
                    <Field label="x"><Num value={t.x} min={-512} max={512} onChange={v => this.update(['text', 'x'], v)} /></Field>
                    <Field label="y"><Num value={t.y} min={-512} max={512} onChange={v => this.update(['text', 'y'], v)} /></Field>
                </div>
                <h3 className={styles.heading}>{'Back to zero'}</h3>
                <button className={styles.button} onClick={() => this.setSettings(resetSection(this.state.settings, 'text'))}>{'Reset text'}</button>
            </React.Fragment>
        );
    }
    renderBadge () {
        const {settings, badges} = this.state;
        const b = settings.badge;
        if (!badges.length) loadBadges().then(list => !this.unmounted && this.setState({badges: list}), () => {});
        return (
            <React.Fragment>
                <h3 className={styles.heading}>{'Badge'}</h3>
                <div className={styles.badges}>
                    <button className={classNames(styles.badgeChoice, !b.id && styles.active)} onClick={() => this.update(['badge', 'id'], '')}>{'none'}</button>
                    {badges.map(item => (
                        <button key={item.id} title={item.name}
                            className={classNames(styles.badgeChoice, b.id === item.id && styles.active)}
                            onClick={() => this.update(['badge', 'id'], item.id)}>
                            <img src={item.thumb} alt={item.name} draggable={false} />
                        </button>
                    ))}
                </div>
                {b.id && (
                    <React.Fragment>
                        <p className={styles.hint}>{'Drag the badge in the preview to move it. Its author is credited too.'}</p>
                        <div className={styles.group}>
                            <Field label="size"><Range value={b.size} min={32} max={320} onChange={v => this.update(['badge', 'size'], v)} /></Field>
                            <Field label="disc"><Color value={b.bg} onChange={v => this.update(['badge', 'bg'], v)} /></Field>
                            <Field label="symbol"><Color value={b.fg} onChange={v => this.update(['badge', 'fg'], v)} /></Field>
                            <Field label="label"><input className={styles.text} value={b.label} placeholder="e.g. 3 (blank badge)"
                                maxLength={4} onChange={e => this.update(['badge', 'label'], e.target.value)} /></Field>
                        </div>
                        <div className={styles.row}>
                            <Field label="x"><Num value={b.x} min={-512} max={512} onChange={v => this.update(['badge', 'x'], v)} /></Field>
                            <Field label="y"><Num value={b.y} min={-512} max={512} onChange={v => this.update(['badge', 'y'], v)} /></Field>
                        </div>
                    </React.Fragment>
                )}
                <h3 className={styles.heading}>{'Back to zero'}</h3>
                <button className={styles.button} onClick={() => this.setSettings(resetSection(settings, 'badge'))}>{'Reset badge'}</button>
            </React.Fragment>
        );
    }
    renderSize () {
        const {settings} = this.state;
        return (
            <React.Fragment>
                <h3 className={styles.heading}>{'Size'}</h3>
                <select className={styles.select} value={settings.size} onChange={e => this.update(['size'], Number(e.target.value))}>
                    {SIZES.map(n => <option key={n} value={n}>{`${n} × ${n} px`}</option>)}
                </select>
                <h3 className={styles.heading}>{'Preset'}</h3>
                <select className={styles.select} value="" onChange={e => {
                    this.setState({part: 0});
                    this.setSettings(applyPreset(settings, e.target.value));
                }}>
                    <option value="">{'Choose a preset…'}</option>
                    {PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
                <h3 className={styles.heading}>{'Back to zero'}</h3>
                <button className={styles.button} onClick={() => {
                    this.setState({part: 0});
                    this.setSettings(defaultSettings());
                }}>{'Reset everything'}</button>
            </React.Fragment>
        );
    }
    render () {
        const {item, list, onBack, onTag} = this.props;
        const {settings, section, icon, error, busy, tags, textureUrl, badgeSvg} = this.state;
        const preview = icon ? compose(icon, settings, {textureUrl, badgeSvg, preview: true}) : '';
        const fx = settings.foreground;
        const usesFilters = fx.shadow.enabled || fx.stroke.enabled ||
            (fx.broken && fx.parts.some(p => p.shadow.enabled || p.stroke.enabled));
        const canStep = list.length > 1 && list.indexOf(item) !== -1;
        return (
            <div className={styles.studio}>
                <div className={styles.controls}>
                    <div className={styles.studioHeader}>
                        <span className={styles.studioTitle}>{'Studio'}</span>
                        <select className={styles.select} value={section} onChange={e => this.setState({section: e.target.value})}>
                            {SECTIONS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                        </select>
                    </div>
                    {section === 'foreground' && this.renderForeground()}
                    {section === 'background' && this.renderBackground()}
                    {section === 'text' && this.renderText()}
                    {section === 'badge' && this.renderBadge()}
                    {section === 'size' && this.renderSize()}
                </div>
                <div className={styles.stage}>
                    <div className={styles.topBar}>
                        <button className={styles.button} onClick={onBack}>{'‹ Back to results'}</button>
                        <button className={styles.arrow} disabled={!canStep} title="Previous icon" onClick={() => this.navigate(-1)}>{'‹'}</button>
                        <div className={styles.iconName}>
                            <strong>{item.name}</strong>
                            <span>{`${item.subtitle} · ${item.credit.license}${item.credit.needsCredit ? ' · credited automatically' : ''}`}</span>
                        </div>
                        <button className={styles.arrow} disabled={!canStep} title="Next icon" onClick={() => this.navigate(1)}>{'›'}</button>
                    </div>
                    {error && <div className={styles.error}>{error}</div>}
                    <div className={styles.previewBox}>
                        <div
                            className={styles.preview}
                            ref={this.previewRef}
                            onPointerDown={this.handlePointerDown}
                            // eslint-disable-next-line react/no-danger
                            dangerouslySetInnerHTML={{__html: preview}}
                        />
                    </div>
                    <div className={styles.actions}>
                        <button className={styles.add} disabled={!icon || busy} onClick={() => this.handleAdd(false)}>
                            {busy ? 'Adding…' : `Add to project (vector, ${settings.size} px)`}
                        </button>
                        <button className={styles.addAlt} disabled={!icon || busy} onClick={() => this.handleAdd(true)}>
                            {'Add as picture (PNG)'}
                        </button>
                    </div>
                    <p className={styles.hint}>
                        {usesFilters ?
                            'Shadow and stroke show on the stage, but the paint editor removes them if you edit the costume. "Add as picture" keeps them for good.' :
                            'The vector version stays sharp at any size and can be edited in the paint editor.'}
                    </p>
                    {tags.length > 0 && (
                        <div className={styles.tags}>
                            <h3 className={styles.heading}>{item.source === 'iconify' ? `Categories of ${item.subtitle}` : 'Tags'}</h3>
                            {tags.map(t => (
                                <div className={styles.tagRow} key={t.tag}>
                                    <button className={styles.arrow} disabled={!t.prev} onClick={() => t.prev && this.props.onOpen(t.prev)}>{'‹'}</button>
                                    {t.prev ? <img className={styles.tagThumb} src={t.prev.thumb} alt="" title={t.prev.name}
                                        onClick={() => this.props.onOpen(t.prev)} /> : <span className={styles.tagThumb} />}
                                    <button className={styles.tag} title={`Show all ${t.count} icons`} onClick={() => onTag(t.tag)}>{t.tag}</button>
                                    {t.next ? <img className={styles.tagThumb} src={t.next.thumb} alt="" title={t.next.name}
                                        onClick={() => this.props.onOpen(t.next)} /> : <span className={styles.tagThumb} />}
                                    <button className={styles.arrow} disabled={!t.next} onClick={() => t.next && this.props.onOpen(t.next)}>{'›'}</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }
}

IconStudio.propTypes = {
    item: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    kind: PropTypes.string.isRequired,
    list: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
    onAdded: PropTypes.func.isRequired,
    onBack: PropTypes.func.isRequired,
    onOpen: PropTypes.func.isRequired,
    onTag: PropTypes.func.isRequired,
    vm: PropTypes.object.isRequired // eslint-disable-line react/forbid-prop-types
};

export default IconStudio;

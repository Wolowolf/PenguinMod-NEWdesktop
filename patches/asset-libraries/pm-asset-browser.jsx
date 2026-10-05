// PenguinMod Desktop (patch section 16): the sprite, costume, backdrop and sound libraries.
// Replaces the original libraries. Sources: Kenney and game-icons.net (offline), the jsfxr / ZzFX /
// Bfxr sound generators (offline), Iconify and Openverse (online). See pm-asset-sources.js.
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import VM from 'scratch-vm';

import Modal from '../../containers/modal.jsx';
import libraryStyles from '../library/library.css';
import styles from './pm-asset-browser.css';
import IconStudio, {quickAddStudio, studioThumbs} from './pm-icon-studio.jsx';
import ApiKeyPanel from './pm-api-key-panel.jsx';
import {hasKey} from '../../lib/pm-api-keys.js';
import {
    LIBRARY_URL, addAsset, addGeneratedSound, gameIconTags, iconifyCategory, loadIconSvgs, mixedSearch,
    newRandomMix, offlinePacks, searchEuropeana, searchIconify, searchOffline, searchOpenverse, searchPixabay
} from '../../lib/pm-asset-sources.js';
import {limitStatus, onUsage} from '../../lib/pm-limits.js';
import {dropWaveImage, requestWave, waveFromOpenverse} from '../../lib/pm-waveforms.js';

// Libraries that need the user's own (free) API key: locked until one is entered.
const KEY_SOURCES = ['pixabay', 'europeana', 'openverse'];
const locked = source => KEY_SOURCES.includes(source) && !hasKey(source);
// Libraries whose results come page by page from the internet.
const SERVER_PAGED = ['openverse', 'pixabay', 'europeana'];

const formatDuration = d => (d < 1 ? `${d.toFixed(2)} s` : d < 10 ? `${d.toFixed(1)} s` :
    `${Math.floor(d / 60)}:${String(Math.round(d % 60)).padStart(2, '0')}`);

const TITLES = {
    sprite: 'Choose a Sprite', costume: 'Choose a Costume', backdrop: 'Choose a Backdrop', sound: 'Choose a Sound'
};
const SOURCES = {
    sprite: ['all', 'kenney', 'gameIcons', 'iconify', 'pixabay', 'europeana', 'openverse'],
    costume: ['all', 'kenney', 'gameIcons', 'iconify', 'pixabay', 'europeana', 'openverse'],
    backdrop: ['all', 'kenney', 'pixabay', 'europeana', 'openverse'],
    sound: ['all', 'kenney', 'generators', 'openverse']
};
const SOURCE_INFO = {
    all: {label: 'All', where: ''}, // its "where" and note depend on which libraries are unlocked
    kenney: {label: 'Kenney', where: 'Offline', note: 'Kenney game assets. CC0: free for any use, no credit needed.'},
    gameIcons: {
        label: 'Game Icons', where: 'Offline',
        note: 'game-icons.net, CC BY 3.0: the author is credited automatically in the "credit" sprite.'
    },
    iconify: {
        label: 'Iconify', where: 'Online',
        note: 'Icon sets whose licence allows commercial use (no NC, ND, SA, GPL or brand logos). ' +
            'When a set asks for credit, it is added to the "credit" sprite.'
    },
    pixabay: {
        label: 'Pixabay', where: 'Online',
        note: 'Images from Pixabay (pixabay.com). Pixabay Content License: free for commercial use, no credit needed.'
    },
    europeana: {
        label: 'Europeana', where: 'Online',
        note: 'Images from European museums and archives via Europeana. Only public domain, CC0 and CC BY; ' +
            'CC BY items are credited automatically in the "credit" sprite.'
    },
    openverse: {
        label: 'Openverse', where: 'Online',
        note: 'Only CC0, public domain and CC BY. CC BY items are credited automatically in the "credit" sprite. ' +
            'Search results come from Openverse, which does not endorse this app.'
    },
    generators: {
        label: 'Generators', where: 'Offline',
        note: 'Make your own sound effects. Sounds you make are yours: no credit needed.'
    }
};
const GENERATORS = [
    {id: 'jsfxr', label: 'jsfxr', folder: 'jsfxr'},
    {id: 'zzfx', label: 'ZzFX', folder: 'zzfx'},
    {id: 'bfxr', label: 'Bfxr', folder: 'bfxr'}
];
const OPENVERSE_TYPES = {
    sprite: [['illustration', 'Illustrations & clip art'], ['all', 'All images']],
    costume: [['illustration', 'Illustrations & clip art'], ['all', 'All images']],
    sound: [['sfx', 'Sound effects (Freesound)'], ['music', 'Music (Jamendo)'], ['all', 'Both']]
};
const PIXABAY_TYPES = [['vector', 'Vector graphics'], ['illustration', 'Illustrations'], ['photo', 'Photos'], ['all', 'All images']];
const PAGE = 120; // items shown at once; scrolling to the end shows this many more
const ICON_PAGE = 60; // Iconify: fewer, its public API limits how much one app may ask for

const isOnline = source => source === 'iconify' || SERVER_PAGED.includes(source);
const pageSize = source => (source === 'iconify' ? ICON_PAGE : PAGE);

// Tells each sound tile when it comes into view (or close to it): one IntersectionObserver per grid.
const watchers = new WeakMap();
const watchVisible = (el, callback) => {
    const root = el.closest(`.${styles.grid}`);
    if (!root || typeof IntersectionObserver === 'undefined') {
        callback(true);
        return () => {};
    }
    let watch = watchers.get(root);
    if (!watch) {
        const callbacks = new Map();
        const observer = new IntersectionObserver(entries => {
            for (const e of entries) {
                const cb = callbacks.get(e.target);
                if (cb) cb(e.isIntersecting, e.boundingClientRect);
            }
        }, {root, rootMargin: '150px 0px'});
        watch = {callbacks, observer};
        watchers.set(root, watch);
    }
    watch.callbacks.set(el, callback);
    watch.observer.observe(el);
    return () => {
        watch.callbacks.delete(el);
        watch.observer.unobserve(el);
    };
};

// Libraries with a request limit (pm-limits.js) and how much of it is left, updated as requests go out.
const LIMITED = ['openverse', 'pixabay'];
const PER = {second: 'this second', minute: 'this minute', hour: 'this hour', day: 'in 24 h'};
class LimitCounter extends React.Component {
    componentDidMount () {
        this.stop = onUsage(() => this.forceUpdate());
        this.timer = setInterval(() => this.forceUpdate(), 5000); // a minute's count goes down again
    }
    componentWillUnmount () {
        this.stop();
        clearInterval(this.timer);
    }
    render () {
        const rows = this.props.sources.map(source => ({source, status: limitStatus(source)}))
            .filter(row => row.status.length);
        if (!rows.length) return null;
        return (
            <div
                className={styles.limits}
                title={'The sites\' own numbers when they send them, otherwise this app\'s count.\n' +
                    'Openverse allows 20 searches a minute and 200 a day until your email address is confirmed.'}
            >
                {'Limits: '}
                {rows.map(({source, status}, i) => (
                    <span key={source}>
                        {i ? ' · ' : ''}
                        <strong>{SOURCE_INFO[source].label}</strong>
                        {status.map((s, j) => (
                            <span
                                key={j}
                                className={classNames(!s.left ? styles.limitOut : (s.left < s.max * 0.2 && styles.limitLow))}
                            >
                                {`${j ? ',' : ''} ${s.left.toLocaleString()} of ${s.max.toLocaleString()}` +
                                    `${j && status[j - 1].what === s.what ? '' : ` ${s.what} left`} ${PER[s.per]}`}
                            </span>
                        ))}
                    </span>
                ))}
            </div>
        );
    }
}
LimitCounter.propTypes = {
    sources: PropTypes.arrayOf(PropTypes.string).isRequired
};

// A sound tile's waveform picture (pm-waveforms.js) and length. The picture is made when the tile
// comes into view and only this tile is updated (the grid is not re-rendered for it).
class SoundWave extends React.PureComponent {
    constructor (props) {
        super(props);
        this.state = {duration: props.item.duration || 0, image: props.item.waveImage || null};
        this.box = null;
        this.setBox = el => {
            this.box = el;
        };
        this.handleImageError = () => {
            dropWaveImage(this.props.item);
            this.setState({image: null}, () => this.watch());
        };
    }
    componentDidMount () {
        if (!this.state.image) this.watch();
    }
    componentWillUnmount () {
        this.gone = true;
        if (this.unwatch) this.unwatch();
    }
    watch () {
        const item = this.props.item;
        if (!this.box || this.gone || item.waveFailed) return;
        // the size comes from the observer: measuring every tile would make the page lay itself out again
        this.unwatch = watchVisible(this.box, (visible, rect) => {
            this.visible = visible;
            if (!visible || this.asked) return;
            this.asked = true;
            const ratio = window.devicePixelRatio || 1;
            const width = Math.max(16, Math.round(rect.width * ratio));
            const height = Math.max(8, Math.round(rect.height * ratio));
            requestWave(item, width, height, () => this.visible && !this.gone).then(() => {
                this.asked = false;
                if (this.gone || (!item.waveImage && !item.waveFailed)) return; // scrolled away first: later
                if (this.unwatch) this.unwatch();
                this.unwatch = null;
                this.setState({image: item.waveImage || null, duration: item.duration || 0});
            });
        });
    }
    render () {
        const {duration, image} = this.state;
        return (
            <React.Fragment>
                {this.props.playing && duration ? (
                    <div className={styles.playhead} style={{animationDuration: `${duration}s`}} />
                ) : null}
                {image ? (
                    <img
                        className={styles.wave}
                        src={image}
                        alt=""
                        draggable={false}
                        loading="lazy"
                        onError={this.handleImageError}
                    />
                ) : <div className={styles.wave} ref={this.setBox} />}
                {duration ? <span className={styles.duration}>{formatDuration(duration)}</span> : null}
            </React.Fragment>
        );
    }
}
SoundWave.propTypes = {
    item: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    playing: PropTypes.bool // shows a line moving over the waveform
};

// "All": every library of this kind that is unlocked (not the sound generators), searched at once.
const allSources = kind => SOURCES[kind].filter(s => s !== 'all' && s !== 'generators' && !locked(s));
const searchesOnline = (source, kind) => (source === 'all' ? allSources(kind).some(isOnline) : isOnline(source));
const listWords = words => (words.length < 2 ? words.join('') :
    `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`);
const allWhere = kind => {
    const n = allSources(kind).length;
    return `${n} ${n === 1 ? 'library' : 'libraries'}`;
};
const allNote = kind => {
    const labels = list => list.map(x => SOURCE_INFO[x].label);
    const lockedOnes = SOURCES[kind].filter(locked);
    const open = allSources(kind);
    return `Searches ${listWords(labels(open))}${open.length > 1 ? ' at once, mixed so each one shows up' : ''}. ` +
        'Point at an item to see where it comes from and its licence.' +
        (lockedOnes.length ? ` ${listWords(labels(lockedOnes))} can join too: open ${lockedOnes.length > 1 ? 'them' : 'it'} ` +
            'on the left and unlock with your own free key.' : '');
};

class AssetBrowser extends React.Component {
    constructor (props) {
        super(props);
        const source = SOURCES[props.kind][0];
        this.state = {
            source, query: '', pack: -1, packs: [], type: (OPENVERSE_TYPES[props.kind] || [[null]])[0][0],
            items: [], shown: PAGE, page: 1, done: true, loading: false, error: null,
            busy: null, status: null, playing: null, generator: null,
            tag: '', tags: [], category: null, studioItem: null, redraw: 0, keyPanel: false, failed: [], counts: []
        };
        this.mixed = null; // the running "All" search
        this.mix = newRandomMix(); // what the online libraries show when they open with an empty search
        this.searchTimer = null;
        this.redrawTimer = null;
        this.searchId = 0;
        this.audio = null;
        this.frame = null;
        this.observer = null;
        // Endless scrolling: a marker after the last tile loads more when it comes into view.
        this.setSentinel = el => {
            if (this.observer) this.observer.disconnect();
            this.sentinel = el;
            if (el && typeof IntersectionObserver !== 'undefined') {
                this.observer = new IntersectionObserver(entries => {
                    if (entries.some(e => e.isIntersecting)) this.handleMore();
                }, {root: el.parentElement, rootMargin: '400px'});
                this.observer.observe(el);
            }
        };
        this.handleClose = this.handleClose.bind(this);
        this.handleQueryChange = this.handleQueryChange.bind(this);
        this.handleQueryKey = this.handleQueryKey.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
        this.handleMore = this.handleMore.bind(this);
        this.handleFrameLoad = this.handleFrameLoad.bind(this);
        this.setFrame = el => {
            this.frame = el;
        };
    }
    componentDidMount () {
        this.selectSource(this.state.source);
    }
    componentWillUnmount () {
        this.unmounted = true;
        clearTimeout(this.searchTimer);
        clearTimeout(this.redrawTimer);
        if (this.observer) this.observer.disconnect();
        this.stopSound();
    }
    // The page is not full yet (marker still in view after loading): load more.
    fillPage () {
        setTimeout(() => {
            if (this.unmounted || !this.sentinel || this.state.loading) return;
            const box = this.sentinel.parentElement.getBoundingClientRect();
            if (this.sentinel.getBoundingClientRect().top < box.bottom + 400) this.handleMore();
        }, 50);
    }
    scheduleRedraw () {
        if (!this.redrawTimer) {
            this.redrawTimer = setTimeout(() => {
                this.redrawTimer = null;
                if (!this.unmounted) this.setState(s => ({redraw: s.redraw + 1}));
            }, 150);
        }
    }
    // Icon previews in the current studio style (sound waveforms draw themselves: SoundWave).
    async decorate (items) {
        try {
            if (await studioThumbs(items)) this.scheduleRedraw();
        } catch (e) { /* plain previews */ }
    }
    selectSource (source, extra) {
        this.stopSound();
        this.setState(Object.assign({
            source, items: [], shown: PAGE, error: null, status: null, generator: null, pack: -1,
            tag: '', category: null, studioItem: null, keyPanel: false, failed: [], counts: [],
            type: source === 'pixabay' ? PIXABAY_TYPES[0][0] : (OPENVERSE_TYPES[this.props.kind] || [[null]])[0][0]
        }, extra), () => {
            if (source === 'kenney') {
                offlinePacks(this.props.kind).then(packs => this.setState({packs}), () => {});
            }
            if (source === 'gameIcons' && !this.state.tags.length) {
                gameIconTags().then(tags => this.setState({tags}), () => {});
            }
            if (!locked(source)) this.runSearch(1);
        });
    }
    handleQueryChange (e) {
        this.setState({query: e.target.value});
        if (!searchesOnline(this.state.source, this.props.kind)) {
            clearTimeout(this.searchTimer);
            this.searchTimer = setTimeout(() => this.runSearch(1), 200);
        }
    }
    handleQueryKey (e) {
        if (e.key === 'Enter') this.handleSearch();
    }
    handleSearch () {
        this.setState({category: null}, () => this.runSearch(1));
    }
    // A tag (game-icons) or a set category (Iconify) clicked in the studio: show all its icons
    // (in the icon's own library when the studio was opened from "All").
    showTag (tag) {
        const item = this.state.studioItem;
        const filter = item && item.source === 'iconify' ?
            {category: {prefix: item.prefix, name: tag, set: item.subtitle}} : {tag};
        if (item && item.source !== this.state.source) {
            this.selectSource(item.source, Object.assign({query: ''}, filter));
        } else {
            this.setState(Object.assign({studioItem: null, query: ''}, filter), () => this.runSearch(1));
        }
    }
    afterAdd () {
        if (this.props.kind === 'sound' && this.props.onNewSound) this.props.onNewSound();
        if (this.props.kind === 'sprite' && this.props.onActivateBlocksTab) this.props.onActivateBlocksTab();
        this.props.onRequestClose();
    }
    async handleMore () {
        const {source, shown, items, done, page, loading} = this.state;
        if (loading || this.state.studioItem) return;
        if (source === 'all') {
            if (!done) this.runAll(false);
        } else if (shown < items.length) {
            const next = shown + pageSize(source);
            this.setState({loading: true});
            if (source === 'iconify') {
                try {
                    await loadIconSvgs(items.slice(shown, next));
                } catch (err) {
                    if (!this.unmounted) this.setState({error: err.message});
                }
            }
            if (this.unmounted) return;
            this.setState({shown: next, loading: false}, () => this.fillPage());
            this.decorate(items.slice(shown, next));
        } else if (SERVER_PAGED.includes(source) && !done) {
            this.runSearch(page + 1);
        }
    }
    async runSearch (page) {
        const {source, query, pack, type, tag, category} = this.state;
        const {kind} = this.props;
        if (source === 'generators') return;
        if (source === 'all') {
            this.runAll(true);
            return;
        }
        const id = ++this.searchId;
        if (locked(source)) {
            this.setState({items: [], loading: false, error: null, done: true});
            return;
        }
        this.setState({loading: true, error: null});
        try {
            let items;
            let done = true;
            if (source === 'openverse') {
                const result = await searchOpenverse(kind, query, page, type, this.mix);
                items = page > 1 ? this.state.items.concat(result.items) : result.items;
                done = result.done;
            } else if (source === 'pixabay' || source === 'europeana') {
                const result = source === 'pixabay' ?
                    await searchPixabay(kind, query, page, type, this.mix) :
                    await searchEuropeana(kind, query, page, this.mix);
                const seen = new Set(page > 1 ? this.state.items.map(item => item.key) : []);
                items = (page > 1 ? this.state.items : []).concat(result.items.filter(item => !seen.has(item.key)));
                done = result.done || (page > 1 && items.length === this.state.items.length);
            } else if (source === 'iconify') {
                items = category && !query.trim() ? await iconifyCategory(category.prefix, category.name) :
                    await searchIconify(query.trim());
                await loadIconSvgs(items.slice(0, ICON_PAGE));
            } else {
                items = await searchOffline(source, kind, query, source === 'gameIcons' ? tag : pack);
            }
            if (id !== this.searchId || this.unmounted) return;
            const shown = page > 1 ? items.length : pageSize(source);
            this.setState({items, done, page, loading: false, shown}, () => this.fillPage());
            this.decorate(page > 1 ? items.slice(this.state.shown) : items.slice(0, shown));
        } catch (err) {
            if (id !== this.searchId || this.unmounted) return;
            const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
            this.setState({
                loading: false, items: page > 1 ? this.state.items : [],
                error: offline && isOnline(source) ? `${SOURCE_INFO[source].label} needs an internet connection.` : err.message
            });
        }
    }
    // "All": one loader per unlocked library, each with its library's first choices (all packs and
    // tags, Openverse illustrations or sound effects, Pixabay vector graphics).
    allLoaders () {
        const {kind} = this.props;
        const {query} = this.state;
        const whole = promise => promise.then(items => ({items, done: true}));
        const loaders = {
            kenney: () => whole(searchOffline('kenney', kind, query, -1)),
            gameIcons: () => whole(searchOffline('gameIcons', kind, query, '')),
            iconify: () => whole(searchIconify(query.trim())),
            pixabay: page => searchPixabay(kind, query, page, PIXABAY_TYPES[0][0], this.mix),
            europeana: page => searchEuropeana(kind, query, page, this.mix),
            openverse: page => searchOpenverse(kind, query, page, (OPENVERSE_TYPES[kind] || [[null]])[0][0], this.mix)
        };
        const out = {};
        for (const s of allSources(kind)) out[s] = loaders[s];
        return out;
    }
    // "All": a new search (fresh), or the next mixed batch when scrolling to the end.
    async runAll (fresh) {
        if (!fresh && this.mixedLoading) return; // that batch is still on its way
        const id = fresh ? ++this.searchId : this.searchId;
        if (fresh) this.mixed = mixedSearch(this.allLoaders());
        const mixed = this.mixed;
        this.mixedLoading = mixed;
        this.setState({loading: true, error: null});
        let batch = await mixed.next(PAGE);
        // Iconify drawings: one request per icon set, for this batch only
        const icons = batch.filter(item => item.source === 'iconify');
        if (icons.length) {
            try {
                await loadIconSvgs(icons);
            } catch (err) {
                mixed.fail('iconify', err.message);
            }
            batch = batch.filter(item => item.source !== 'iconify' || item.thumb);
        }
        if (this.mixedLoading === mixed) this.mixedLoading = null;
        if (id !== this.searchId || this.unmounted) return;
        const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
        const failed = mixed.failed().map(f => {
            const label = SOURCE_INFO[f.source].label;
            if (offline && isOnline(f.source)) return `${label} needs an internet connection.`;
            return f.message.includes(label) ? f.message : `${label}: ${f.message}`;
        });
        this.setState(s => {
            const items = fresh ? batch : s.items.concat(batch);
            return {items, shown: items.length, done: mixed.done(), loading: false, page: 1,
                failed: Array.from(new Set(failed)), counts: mixed.counts()};
        }, () => this.fillPage());
        this.decorate(batch);
    }
    async handleQuickAdd (item) {
        if (this.state.busy) return;
        this.setState({busy: item.name, error: null});
        try {
            await quickAddStudio(this.props.vm, this.props.kind, item);
            this.afterAdd();
        } catch (err) {
            if (!this.unmounted) this.setState({busy: null, error: `Could not add "${item.name}": ${err.message}`});
        }
    }
    async handleSelect (item) {
        if (this.state.busy) return;
        this.stopSound();
        this.setState({busy: item.name, error: null});
        try {
            await addAsset(this.props.vm, this.props.kind, item);
            this.afterAdd();
        } catch (err) {
            if (!this.unmounted) this.setState({busy: null, error: `Could not add "${item.name}": ${err.message}`});
        }
    }
    togglePlay (item) {
        const wasPlaying = this.state.playing === item.key;
        this.stopSound();
        if (wasPlaying) return;
        this.audio = new Audio(item.url);
        this.audio.onended = () => this.setState({playing: null});
        this.audio.onerror = () => this.setState({playing: null, error: `Could not play "${item.name}".`});
        this.audio.play().catch(() => {});
        this.setState({playing: item.key});
    }
    stopSound () {
        if (this.audio) {
            this.audio.pause();
            this.audio = null;
        }
        if (this.state && this.state.playing) this.setState({playing: null});
    }
    // The generators want to download a .wav: catch it and add the sound to the sprite instead.
    handleFrameLoad () {
        const generator = this.state.generator;
        let win;
        try {
            win = this.frame.contentWindow;
            void win.document; // throws if the page can't be reached
        } catch (err) {
            this.setState({error: 'The sound generator could not be connected to the editor.'});
            return;
        }
        const grab = anchor => {
            const fileName = anchor.getAttribute('download') || '';
            if (!/\.wav$/i.test(fileName) || !anchor.href) return false;
            const name = fileName.replace(/\.wav$/i, '');
            addGeneratedSound(this.props.vm, generator, anchor.href, name).then(() => {
                if (this.props.onNewSound) this.props.onNewSound();
                if (!this.unmounted) this.setState({status: `Added "${name}" to ${this.props.vm.editingTarget.getName()}.`, error: null});
            }, err => {
                if (!this.unmounted) this.setState({error: `Could not add the sound: ${err.message}`});
            });
            return true;
        };
        const originalClick = win.HTMLAnchorElement.prototype.click;
        win.HTMLAnchorElement.prototype.click = function () {
            if (grab(this)) return;
            return originalClick.call(this);
        };
        win.document.addEventListener('click', e => {
            const anchor = e.target && e.target.closest && e.target.closest('a[download]');
            if (anchor && grab(anchor)) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);
    }
    handleClose () {
        this.stopSound();
        this.props.onRequestClose();
    }
    renderTile (item) {
        const {kind} = this.props;
        const needsCredit = item.credit && item.credit.needsCredit;
        // icons open the studio; their "+" button adds them as their preview shows them
        const studio = item.studio && (kind === 'sprite' || kind === 'costume');
        // sounds play (or stop) when clicked; their "+" button adds them
        const sound = !!item.sound;
        const open = () => (sound ? this.togglePlay(item) :
            studio ? this.setState({studioItem: item, error: null}) : this.handleSelect(item));
        const thumb = (studio && item.styledThumb) || item.thumb;
        const playing = this.state.playing === item.key;
        return (
            <div
                className={classNames(styles.tile, playing && styles.playingTile)}
                key={item.key}
                role="button"
                tabIndex={0}
                title={[item.name, this.state.source === 'all' && `From ${SOURCE_INFO[item.source].label}`,
                    item.subtitle, item.credit && item.credit.license,
                    needsCredit ? 'Needs credit: added to the "credit" sprite automatically' : '',
                    studio ? 'Click to edit in the studio, + to add it as shown' : '',
                    sound ? 'Click to play or stop, + to add it' : '',
                    item.sound && waveFromOpenverse(item) ? 'Song: waveform shape from Openverse, colours from short samples (the whole song is not downloaded)' : '']
                    .filter(Boolean).join('\n')}
                onClick={open}
                onKeyDown={e => e.key === 'Enter' && open()}
            >
                {(studio || sound) && (
                    <button
                        className={styles.quickAdd}
                        title={sound ? 'Add this sound' : 'Add it as shown'}
                        onClick={e => {
                            e.stopPropagation();
                            if (sound) this.handleSelect(item);
                            else this.handleQuickAdd(item);
                        }}
                    >{'+'}</button>
                )}
                <div className={classNames(styles.thumb, item.sound && styles.soundThumb)}>
                    {sound ? <SoundWave item={item} playing={playing} /> : (thumb ? (
                        <img
                            className={classNames(styles.image, kind === 'backdrop' && styles.cover)}
                            src={thumb}
                            onError={e => {
                                if (item.url && e.target.src !== item.url) e.target.src = item.url;
                            }}
                            loading="lazy"
                            draggable={false}
                            alt=""
                        />
                    ) : null)}
                    {needsCredit && <span className={styles.creditMark}>{'C'}</span>}
                </div>
                <div className={styles.name}>{item.name}</div>
            </div>
        );
    }
    renderGenerators () {
        const {generator} = this.state;
        const current = GENERATORS.find(g => g.id === generator);
        return (
            <div className={styles.generators}>
                <div className={styles.generatorBar}>
                    {GENERATORS.map(g => (
                        <button
                            key={g.id}
                            className={classNames(styles.generatorButton, generator === g.id && styles.active)}
                            onClick={() => this.setState({generator: g.id, status: null, error: null})}
                        >{g.label}</button>
                    ))}
                    <span className={styles.generatorHint}>
                        {current ?
                            'Make a sound, then use the generator\'s own export / save .wav button: ' +
                            'the sound is added to the current sprite instead of being downloaded.' :
                            'Pick a generator.'}
                    </span>
                </div>
                {current && (
                    <iframe
                        key={current.id}
                        className={styles.generatorFrame}
                        ref={this.setFrame}
                        src={`${LIBRARY_URL}generators/${current.folder}/index.html`}
                        title={current.label}
                        onLoad={this.handleFrameLoad}
                    />
                )}
            </div>
        );
    }
    render () {
        const {kind} = this.props;
        const {source, query, items, shown, loading, error, busy, status, packs, pack, type, done,
            tag, tags, category, studioItem, failed, counts} = this.state;
        const info = source === 'all' ? {label: 'everything', note: allNote(kind)} : SOURCE_INFO[source];
        const online = searchesOnline(source, kind);
        if (studioItem) {
            return (
                <Modal fullScreen contentLabel={TITLES[kind]} id="pmAssetBrowser" onRequestClose={this.handleClose}>
                    <div className={styles.browser}>
                        <IconStudio
                            vm={this.props.vm}
                            kind={kind}
                            item={studioItem}
                            list={items.filter(i => i.studio)}
                            onAdded={() => this.afterAdd()}
                            onBack={() => {
                                this.setState({studioItem: null});
                                this.decorate(this.state.items.slice(0, this.state.shown)); // the studio style may have changed
                            }}
                            onOpen={next => this.setState({studioItem: next})}
                            onTag={t => this.showTag(t)}
                        />
                    </div>
                </Modal>
            );
        }
        const types = (source === 'openverse' && OPENVERSE_TYPES[kind]) ||
            (source === 'pixabay' && kind !== 'backdrop' && PIXABAY_TYPES);
        const showKeyPanel = locked(source) || this.state.keyPanel;
        const visible = items.slice(0, shown);
        const canShowMore = shown < items.length ||
            ((SERVER_PAGED.includes(source) || source === 'all') && !done && items.length > 0);
        const allCount = counts.reduce((sum, c) => sum + c.count, 0);
        const countText = source === 'all' ?
            (allCount ? `${allCount}${counts.some(c => c.more) ? '+' : ''} found` : '') :
            (items.length ? `${items.length}${done ? '' : '+'} found` : '');
        return (
            <Modal
                fullScreen
                contentLabel={TITLES[kind]}
                id="pmAssetBrowser"
                onRequestClose={this.handleClose}
            >
                <div className={styles.browser}>
                    <div className={classNames(libraryStyles.libraryFilterBar, styles.sidebar)}>
                        {SOURCES[kind].map(s => (
                            <button
                                key={s}
                                className={classNames(styles.sourceButton, s === source && styles.active)}
                                onClick={() => this.selectSource(s)}
                            >
                                <span className={styles.sourceLabel}>{SOURCE_INFO[s].label}</span>
                                <span className={styles.sourceWhere}>
                                    {locked(s) ? '🔒 Key' : (s === 'all' ? allWhere(kind) : SOURCE_INFO[s].where)}
                                </span>
                            </button>
                        ))}
                        <p className={styles.sidebarNote}>
                            {'Items with an orange C need credit: it is added to the "credit" sprite automatically.'}
                        </p>
                    </div>
                    <div className={styles.main}>
                        {source !== 'generators' && !showKeyPanel && (
                            <div className={styles.toolbar}>
                                <input
                                    className={styles.search}
                                    type="search"
                                    autoFocus
                                    placeholder={online ? `Search ${info.label} and press Enter` : `Search ${info.label}`}
                                    value={query}
                                    onChange={this.handleQueryChange}
                                    onKeyDown={this.handleQueryKey}
                                />
                                {online && (
                                    <button className={styles.searchButton} onClick={this.handleSearch}>{'Search'}</button>
                                )}
                                {source === 'kenney' && packs.length > 0 && (
                                    <select
                                        className={styles.select}
                                        value={pack}
                                        onChange={e => this.setState({pack: Number(e.target.value)}, () => this.runSearch(1))}
                                    >
                                        <option value={-1}>{'All packs'}</option>
                                        {packs.map(p => <option key={p.i} value={p.i}>{p.title}</option>)}
                                    </select>
                                )}
                                {source === 'gameIcons' && tags.length > 0 && (
                                    <select
                                        className={styles.select}
                                        value={tag}
                                        onChange={e => this.setState({tag: e.target.value}, () => this.runSearch(1))}
                                    >
                                        <option value="">{'All tags'}</option>
                                        {tags.map(t => <option key={t.tag} value={t.tag}>{`${t.tag} (${t.count})`}</option>)}
                                    </select>
                                )}
                                {types && (
                                    <select
                                        className={styles.select}
                                        value={type}
                                        onChange={e => this.setState({type: e.target.value}, () => this.runSearch(1))}
                                    >
                                        {types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                    </select>
                                )}
                                <span
                                    className={styles.count}
                                    title={source === 'all' ? counts.map(c => `${SOURCE_INFO[c.source].label}: ${c.count}${c.more ? '+' : ''}`)
                                        .join('\n') : null}
                                >
                                    {loading ? 'Searching…' : countText}
                                </span>
                            </div>
                        )}
                        {!showKeyPanel && (
                            <div className={styles.notice}>
                                {info.note}
                                {KEY_SOURCES.includes(source) && (
                                    <React.Fragment>
                                        {' '}
                                        <button className={styles.linkButton} onClick={() => this.setState({keyPanel: true})}>
                                            {'Change key'}
                                        </button>
                                    </React.Fragment>
                                )}
                            </div>
                        )}
                        {!showKeyPanel && (
                            <LimitCounter
                                sources={(source === 'all' ? allSources(kind) : [source]).filter(s => LIMITED.includes(s))}
                            />
                        )}
                        {source === 'iconify' && category && !query.trim() && (
                            <div className={styles.status}>
                                {`Category "${category.name}" of ${category.set}. `}
                                <button className={styles.linkButton} onClick={() => this.setState({category: null, items: []})}>
                                    {'clear'}
                                </button>
                            </div>
                        )}
                        {error && <div className={styles.error}>{error}</div>}
                        {source === 'all' && failed.length > 0 && (
                            <div className={styles.error}>{`Left out for now: ${failed.join(' ')}`}</div>
                        )}
                        {status && <div className={styles.status}>{status}</div>}
                        {showKeyPanel ? (
                            <ApiKeyPanel
                                key={source}
                                source={source}
                                editing={!locked(source)}
                                onUnlocked={() => this.selectSource(source)}
                                onCancel={() => this.setState({keyPanel: false})}
                                onRemoved={() => this.selectSource(source)}
                            />
                        ) : source === 'generators' ? this.renderGenerators() : (
                            <div className={styles.grid}>
                                {visible.map(item => this.renderTile(item))}
                                {!loading && !items.length && !error && (
                                    <div className={styles.empty}>
                                        {'Nothing found.'}
                                    </div>
                                )}
                                {canShowMore && (
                                    <div className={styles.more} ref={this.setSentinel}>{loading ? 'Loading…' : ''}</div>
                                )}
                            </div>
                        )}
                    </div>
                    {busy && <div className={styles.busy}>{`Adding "${busy}"…`}</div>}
                </div>
            </Modal>
        );
    }
}

AssetBrowser.propTypes = {
    kind: PropTypes.oneOf(['sprite', 'costume', 'backdrop', 'sound']).isRequired,
    onActivateBlocksTab: PropTypes.func,
    onNewSound: PropTypes.func,
    onRequestClose: PropTypes.func.isRequired,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default AssetBrowser;

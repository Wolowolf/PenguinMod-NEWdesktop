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
import {
    LIBRARY_URL, addAsset, addGeneratedSound, gameIconTags, iconifyCategory, loadIconSvgs, loadWaveform, offlinePacks,
    searchIconify, searchOffline, searchOpenverse
} from '../../lib/pm-asset-sources.js';

const formatDuration = d => (d < 1 ? `${d.toFixed(2)} s` : d < 10 ? `${d.toFixed(1)} s` :
    `${Math.floor(d / 60)}:${String(Math.round(d % 60)).padStart(2, '0')}`);

const TITLES = {
    sprite: 'Choose a Sprite', costume: 'Choose a Costume', backdrop: 'Choose a Backdrop', sound: 'Choose a Sound'
};
const SOURCES = {
    sprite: ['kenney', 'gameIcons', 'iconify', 'openverse'],
    costume: ['kenney', 'gameIcons', 'iconify', 'openverse'],
    backdrop: ['kenney', 'openverse'],
    sound: ['kenney', 'generators', 'openverse']
};
const SOURCE_INFO = {
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
const PAGE = 120; // items shown at once; scrolling to the end shows this many more
const ICON_PAGE = 60; // Iconify: fewer, its public API limits how much one app may ask for

const isOnline = source => source === 'iconify' || source === 'openverse';
const pageSize = source => (source === 'iconify' ? ICON_PAGE : PAGE);

class AssetBrowser extends React.Component {
    constructor (props) {
        super(props);
        const source = SOURCES[props.kind][0];
        this.state = {
            source, query: '', pack: -1, packs: [], type: (OPENVERSE_TYPES[props.kind] || [[null]])[0][0],
            items: [], shown: PAGE, page: 1, done: true, loading: false, error: null,
            busy: null, status: null, playing: null, generator: null,
            tag: '', tags: [], category: null, studioItem: null, redraw: 0
        };
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
    // Icon previews in the current studio style, and the waveform and length of sounds.
    async decorate (items) {
        try {
            if (await studioThumbs(items)) this.scheduleRedraw();
        } catch (e) { /* plain previews */ }
        const sounds = items.filter(item => item.sound && item.source === 'kenney' && !item.peaks);
        let next = 0;
        const worker = async () => {
            while (next < sounds.length && !this.unmounted) {
                const item = sounds[next++];
                try {
                    await loadWaveform(item);
                } catch (e) {
                    item.peaks = [];
                }
                this.scheduleRedraw();
            }
        };
        await Promise.all([worker(), worker(), worker(), worker()]);
    }
    selectSource (source) {
        this.stopSound();
        this.setState({
            source, items: [], shown: PAGE, error: null, status: null, generator: null, pack: -1,
            tag: '', category: null, studioItem: null
        }, () => {
            if (source === 'kenney') {
                offlinePacks(this.props.kind).then(packs => this.setState({packs}), () => {});
            }
            if (source === 'gameIcons' && !this.state.tags.length) {
                gameIconTags().then(tags => this.setState({tags}), () => {});
            }
            if (source !== 'openverse' || this.state.query.trim()) this.runSearch(1);
        });
    }
    handleQueryChange (e) {
        this.setState({query: e.target.value});
        if (!isOnline(this.state.source)) {
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
    // A tag (game-icons) or a set category (Iconify) clicked in the studio: show all its icons.
    showTag (tag) {
        const item = this.state.studioItem;
        if (item && item.source === 'iconify') {
            this.setState({studioItem: null, query: '', category: {prefix: item.prefix, name: tag, set: item.subtitle}},
                () => this.runSearch(1));
        } else {
            this.setState({studioItem: null, query: '', tag}, () => this.runSearch(1));
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
        if (shown < items.length) {
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
        } else if (source === 'openverse' && !done) {
            this.runSearch(page + 1);
        }
    }
    async runSearch (page) {
        const {source, query, pack, type, tag, category} = this.state;
        const {kind} = this.props;
        if (source === 'generators') return;
        const id = ++this.searchId;
        if (source === 'openverse' && !query.trim()) {
            this.setState({items: [], loading: false, error: null, done: true});
            return;
        }
        this.setState({loading: true, error: null});
        try {
            let items;
            let done = true;
            if (source === 'openverse') {
                const result = await searchOpenverse(kind, query.trim(), page, type);
                items = page > 1 ? this.state.items.concat(result.items) : result.items;
                done = result.done;
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
    togglePlay (item, e) {
        e.stopPropagation();
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
        const open = () => (studio ? this.setState({studioItem: item, error: null}) : this.handleSelect(item));
        const thumb = (studio && item.styledThumb) || item.thumb;
        const playing = this.state.playing === item.key;
        return (
            <div
                className={styles.tile}
                key={item.key}
                role="button"
                tabIndex={0}
                title={[item.name, item.subtitle, item.credit && item.credit.license,
                    needsCredit ? 'Needs credit: added to the "credit" sprite automatically' : '',
                    studio ? 'Click to edit in the studio, + to add it as shown' : ''].filter(Boolean).join('\n')}
                onClick={open}
                onKeyDown={e => e.key === 'Enter' && open()}
            >
                {studio && (
                    <button
                        className={styles.quickAdd}
                        title="Add it as shown"
                        onClick={e => {
                            e.stopPropagation();
                            this.handleQuickAdd(item);
                        }}
                    >{'+'}</button>
                )}
                <div className={classNames(styles.thumb, item.sound && styles.soundThumb)}>
                    {item.sound ? (
                        <React.Fragment>
                            {item.peaks && item.peaks.length > 0 && (
                                <svg className={styles.wave} viewBox={`0 0 ${item.peaks.length} 32`} preserveAspectRatio="none">
                                    {item.peaks.map((p, i) => (
                                        <rect key={i} x={i + 0.15} width={0.7} y={16 - Math.max(0.5, p * 15)} height={Math.max(1, p * 30)} />
                                    ))}
                                </svg>
                            )}
                            <button
                                className={classNames(styles.play, playing && styles.playing)}
                                title={playing ? 'Stop' : 'Play'}
                                onClick={e => this.togglePlay(item, e)}
                            >{playing ? '■' : '▶'}</button>
                        </React.Fragment>
                    ) : (thumb ? (
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
                    {item.duration ? <span className={styles.duration}>{formatDuration(item.duration)}</span> : null}
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
            tag, tags, category, studioItem} = this.state;
        const info = SOURCE_INFO[source];
        if (studioItem) {
            return (
                <Modal fullScreen contentLabel={TITLES[kind]} id="pmAssetBrowser" onRequestClose={this.handleClose}>
                    <div className={styles.browser}>
                        <IconStudio
                            vm={this.props.vm}
                            kind={kind}
                            item={studioItem}
                            list={items}
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
        const types = source === 'openverse' && OPENVERSE_TYPES[kind];
        const visible = items.slice(0, shown);
        const canShowMore = shown < items.length || (source === 'openverse' && !done && items.length > 0);
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
                                <span className={styles.sourceWhere}>{SOURCE_INFO[s].where}</span>
                            </button>
                        ))}
                        <p className={styles.sidebarNote}>
                            {'Items with an orange C need credit: it is added to the "credit" sprite automatically.'}
                        </p>
                    </div>
                    <div className={styles.main}>
                        {source !== 'generators' && (
                            <div className={styles.toolbar}>
                                <input
                                    className={styles.search}
                                    type="search"
                                    autoFocus
                                    placeholder={isOnline(source) ? `Search ${info.label} and press Enter` : `Search ${info.label}`}
                                    value={query}
                                    onChange={this.handleQueryChange}
                                    onKeyDown={this.handleQueryKey}
                                />
                                {isOnline(source) && (
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
                                <span className={styles.count}>
                                    {loading ? 'Searching…' : (items.length ? `${items.length}${done ? '' : '+'} found` : '')}
                                </span>
                            </div>
                        )}
                        <div className={styles.notice}>{info.note}</div>
                        {source === 'iconify' && category && !query.trim() && (
                            <div className={styles.status}>
                                {`Category "${category.name}" of ${category.set}. `}
                                <button className={styles.linkButton} onClick={() => this.setState({category: null, items: []})}>
                                    {'clear'}
                                </button>
                            </div>
                        )}
                        {error && <div className={styles.error}>{error}</div>}
                        {status && <div className={styles.status}>{status}</div>}
                        {source === 'generators' ? this.renderGenerators() : (
                            <div className={styles.grid}>
                                {visible.map(item => this.renderTile(item))}
                                {!loading && !items.length && !error && (
                                    <div className={styles.empty}>
                                        {source === 'openverse' && !query.trim() ? 'Type something to search.' : 'Nothing found.'}
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

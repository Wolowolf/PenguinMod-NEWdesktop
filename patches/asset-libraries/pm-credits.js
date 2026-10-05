// PenguinMod Desktop (patch section 16): the "credit" sprite.
// As soon as the project uses an asset whose licence asks for credit (see pm-asset-sources.js),
// a hidden sprite named "credit" appears (a warning sign). Its local variable "credit" holds every
// credit the game must show and is rewritten whenever such an asset is added, removed or edited.
// The sprite comes with a credits screen script (also put in the backpack) and a note explaining
// both. While credits are needed the sprite can't be deleted or renamed. When none are needed any
// more, the note says so and the sprite can be deleted. Before the packager opens, a warning
// appears if nothing in the sprite shows it (confirmPackaging, used by section 16 f).
import localBackpack from './tw-local-backpack-api';

const SPRITE_NAME = 'credit';
const VAR_NAME = 'credit';
const VAR_ID = 'pmDesktopCreditVariable';
const NOTE_ID = 'pmDesktopCreditsNote';
const SIGNATURE = 'this note updates itself'; // old credit notes and the "no credit needed" note
const NOTE_MARK = 'the local variable "credit" holds'; // the note (comment ids change when a project is saved)
const NOTE_TEXT = [
    'The local variable "credit" holds the mandatory credits for all the licensed work in this project: you must show them somewhere in your game.',
    '',
    '(their authors cannot claim your game, and you can use everything, even commercially)',
    '',
    'You can use the script provided here (also stored in your backpack) or make your own kind of credit screen, as long as it complies with the licenses involved.'
].join('\n');
const NO_CREDIT_TEXT = 'No asset in this project needs credit right now, so you can delete this sprite. (This note updates itself.)';
// as wide as the line in parentheses (measured in the editor's comment font)
const NOTE = {x: 40, y: 40, width: 650, height: 210};
const BACKPACK_NAME = 'credits screen';
const END_MESSAGE = 'credits end';
const WARNING_TEXT = '⚠ ATTENTION! We detected that the mandatory credits stored in the "credit" sprite are never shown. ' +
    'We could be wrong, but if so, by continuing without proper attribution you accept the LEGAL RISK and responsibility. ⚠';

// Costumes: the button players click, the black screen, and an empty one that marks the text clone.
const BUTTON = 'warning';
const SCREEN = 'credits screen';
const TEXT = 'credits text';
const WARNING_SVG = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="49.55819" height="49.55819" ' +
    'viewBox="0,0,49.55819,49.55819"><g transform="translate(-215.2209,-155.2209)"><g stroke="none" stroke-miterlimit="10">' +
    '<path d="M215.22091,155.2209h49.55819v49.55819h-49.55819z" fill="#000000"/><path d="M217.2858,198.58365l22.71382,' +
    '-39.23296l22.71382,39.23296zM241.47188,191.79635c0.39508,-0.39646 0.59262,-0.88721 0.59262,-1.47227c0,-0.58506 ' +
    '-0.19823,-1.07512 -0.59469,-1.4702c-0.39646,-0.39508 -0.88653,-0.59331 -1.4702,-0.59468c-0.58367,-0.00137 -1.07375,' +
    '0.19685 -1.4702,0.59468c-0.39646,0.39783 -0.59469,0.8879 -0.59469,1.4702c0,0.5823 0.19823,1.07306 0.59469,1.47227c0.39646,' +
    '0.39921 0.88653,0.59676 1.4702,0.59262c0.58367,-0.00413 1.07443,-0.20236 1.47226,-0.59469M237.93472,186.19429h4.12978v' +
    '-10.32446h-4.12978z" fill="#ffa200"/></g></g></svg>';
const SCREEN_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">' +
    '<rect width="480" height="360" fill="#000000"/></svg>';
const TEXT_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">' +
    '<rect width="100" height="100" fill="none"/></svg>';

const freeComments = target => Object.keys(target.comments || {})
    .map(id => target.comments[id]).filter(c => c && !c.blockId);
const isNote = c => typeof c.text === 'string' &&
    (c.text.toLowerCase().includes(SIGNATURE) || c.text.toLowerCase().includes(NOTE_MARK));

// The credit sprite: the one holding the note, or else the sprite named "credit".
const findCreditSprite = runtime => {
    const sprites = runtime.targets.filter(t => t.isOriginal && !t.isStage);
    return sprites.find(t => freeComments(t).some(isNote)) || sprites.find(t => t.getName() === SPRITE_NAME) || null;
};
const findNote = target => freeComments(target).find(isNote) || freeComments(target)[0] || null;

// Credit lines are as short as the licences allow: title, author (Iconify: the copyright holder,
// which MIT / Apache / BSD require), licence name, "modified" when changed, and the source link.
// The licence link is listed once at the bottom ("in any reasonable manner", CC BY 4.0 3(a)(2);
// CC BY 3.0 only asks for it with the copy), unless one licence name has several links.
const shortUrl = url => String(url || '').replace(/^https?:\/\//i, '');
const sameUrl = url => shortUrl(url).replace(/\/+$/, '').toLowerCase();

const changesText = c => {
    if (c.src === 'game-icons') return c.modified || c.changes === 'modified' ? 'modified' : (c.changes || 'recoloured');
    return c.modified ? 'modified' : '';
};

const creditLines = (c, licenceListed) => {
    const title = c.src === 'iconify' ? `"${c.title}" (${c.set})` : `"${c.title || 'Untitled'}"`;
    const by = c.src === 'iconify' ? `© ${c.by}` : [c.by, c.src === 'europeana' && c.institution].filter(Boolean).join(', ');
    const source = c.src === 'iconify' ? c.byUrl : c.url;
    return [
        [title, by, c.license || 'see source', changesText(c)].filter(Boolean).join(' - '),
        source && `(${shortUrl(source)})`,
        !licenceListed && c.licenseUrl && `(${shortUrl(c.licenseUrl)})`
    ].filter(Boolean).join('\n');
};

// Every credit record the project needs, as [{...record, modified}]
const collectCredits = runtime => {
    const credits = [];
    for (const target of runtime.targets) {
        if (!target.isOriginal) continue;
        const assets = target.getCostumes().concat(target.getSounds ? target.getSounds() : []);
        for (const asset of assets) {
            if (!asset || !asset.pmCredit) continue;
            // an icon made in the studio can also carry the credit of the badge on it (`extra`)
            for (const c of [asset.pmCredit].concat(asset.pmCredit.extra || [])) {
                if (c && c.needsCredit) credits.push(Object.assign({}, c, c === asset.pmCredit ? {} : {modified: asset.pmCredit.modified}));
            }
        }
    }
    return credits;
};

// The value of the "credit" variable: one paragraph per asset, then the licence links.
const creditText = credits => {
    if (!credits.length) return '';
    // licence name -> its links (a name with one link goes into the list at the bottom)
    const links = new Map();
    for (const c of credits) {
        if (!c.license || !c.licenseUrl) continue;
        if (!links.has(c.license)) links.set(c.license, new Map());
        links.get(c.license).set(sameUrl(c.licenseUrl), shortUrl(c.licenseUrl));
    }
    const listed = new Map(Array.from(links).filter(([, urls]) => urls.size === 1)
        .map(([name, urls]) => [name, Array.from(urls.values())[0]]));
    const sorted = list => Array.from(new Set(list)).sort((a, b) => a.localeCompare(b));
    return [
        ...sorted(credits.map(c => creditLines(c, listed.has(c.license)))).join('\n\n').split('\n'),
        ...(listed.size ? ['', 'Licences:', ...sorted(Array.from(listed).map(([name, url]) => `${name}: ${url}`))] : [])
    ].join('\n');
};

/* The credits screen script (sb3 blocks). Clicking the sprite makes a clone that fades in to black
   ("credits screen" costume). It makes a second clone ("credits text" costume) that shows the
   variable with the Animated Text extension and glides it from below the stage to above it, then
   broadcasts "credits end" so the black clone fades out. Two blank lines above and below the text
   keep the strip that fencing leaves on the stage empty (up to 28 units: fencing measures the text
   before it is first drawn). */
const NUMBER_INPUTS = /^(NUM\d|X|Y|SECS|SIZE|VALUE|CHANGE|WIDTH|DURATION)$/;
const BOOLEAN_OPS = /^operator_(not|and|or|equals|lt|gt)$/;
const buildBlocks = (scripts, prefix) => {
    const blocks = {};
    const comments = {};
    let count = 0;
    const block = (spec, parent, shadow) => {
        const id = `${prefix}${++count}`;
        const b = blocks[id] = {opcode: spec.op, next: null, parent, inputs: {}, fields: {}, shadow: !!shadow, topLevel: !parent};
        for (const [name, value] of Object.entries(spec.f || {})) b.fields[name] = Array.isArray(value) ? value : [value, null];
        for (const [name, value] of Object.entries(spec.i || {})) b.inputs[name] = input(name, value, id);
        if (spec.comment) {
            const commentId = `${id}c`;
            comments[commentId] = Object.assign({blockId: id, minimized: false}, spec.comment);
            b.comment = commentId;
        }
        return id;
    };
    const stack = (list, parent) => {
        let first = null;
        let previous = null;
        for (const spec of list) {
            const id = block(spec, previous || parent);
            if (previous) blocks[previous].next = id;
            else first = id;
            previous = id;
        }
        return first;
    };
    const input = (name, value, parent) => {
        if (typeof value === 'number') return [1, [{TIMES: 6, DURATION: 5, DIRECTION: 8}[name] || 4, String(value)]];
        if (typeof value === 'string') return [1, [10, value]];
        if (Array.isArray(value)) return [2, stack(value, parent)];
        if (value.literal) return [1, value.literal];
        if (value.menu) return [1, block(value, parent, true)];
        if (BOOLEAN_OPS.test(value.op)) return [2, block(value, parent)];
        return [3, block(value, parent), NUMBER_INPUTS.test(name) ? [4, ''] : [10, '']];
    };
    for (const {x, y, script} of scripts) {
        const top = blocks[stack(script, null)];
        top.x = x;
        top.y = y;
    }
    return {blocks, comments};
};

const creditScripts = (messageId, prefix) => {
    const costumeName = {op: 'looks_costumenumbername', f: {NUMBER_NAME: 'name'}};
    const costumeIs = name => ({op: 'operator_equals', i: {OPERAND1: costumeName, OPERAND2: name}});
    const math = op => (a, b) => ({op: `operator_${op}`, i: {NUM1: a, NUM2: b}});
    const [plus, times, divide] = ['add', 'multiply', 'divide'].map(math);
    const height = {op: 'text_getHeight'};
    const wearCostume = name => ({op: 'looks_switchcostumeto', i: {COSTUME: {menu: true, op: 'looks_costume', f: {COSTUME: name}}}});
    const cloneMyself = {op: 'control_create_clone_of', i: {CLONE_OPTION: {menu: true, op: 'control_create_clone_of_menu', f: {CLONE_OPTION: '_myself_'}}}};
    const ghost = (op, value) => ({op, i: {[op === 'looks_seteffectto' ? 'VALUE' : 'CHANGE']: value}, f: {EFFECT: 'GHOST'}});
    const repeat = (times, body) => ({op: 'control_repeat', i: {TIMES: times, SUBSTACK: body}});
    const goTo = (x, y, comment) => ({op: 'motion_gotoxy', i: {X: x, Y: y}, comment});
    const front = {op: 'looks_gotofrontback', f: {FRONT_BACK: 'front'}};
    const note = (x, y, width, height, text) => ({x, y, width, height, text});
    return buildBlocks([{x: 40, y: 290, script: [
        {op: 'event_whenthisspriteclicked'},
        // the clones are clickable too: only the button starts the credits
        {op: 'control_if', i: {
            CONDITION: {op: 'operator_not', i: {OPERAND: {op: 'operator_or', i: {OPERAND1: costumeIs(SCREEN), OPERAND2: costumeIs(TEXT)}}}},
            SUBSTACK: [cloneMyself]
        }}
    ]}, {x: 40, y: 540, script: [
        {op: 'control_start_as_clone'},
        {op: 'control_if_else', i: {
            CONDITION: costumeIs(TEXT),
            SUBSTACK: [ // the scrolling text (made by the black screen below, already sized)
                front,
                {op: 'text_setFont', i: {FONT: {menu: true, op: 'text_menu_FONT', f: {FONT: 'Sans Serif'}}}},
                {op: 'text_setColor', i: {COLOR: {literal: [9, '#ffffff']}}},
                {op: 'text_setWidth', i: {WIDTH: 760}, f: {ALIGN: 'center'}},
                {op: 'text_setText', i: {TEXT: ''}},
                {op: 'text_addLine', i: {TEXT: ''}, comment: note(1150, 970, 300, 100,
                    'Two blank lines above and below the credits keep them off the stage at the start and the end.')},
                {op: 'text_addLine', i: {TEXT: {literal: [12, VAR_NAME, VAR_ID]}}},
                {op: 'text_addLine', i: {TEXT: ''}},
                // a no-break space: empty lines at the very end of a text are dropped
                {op: 'text_addLine', i: {TEXT: ' '}},
                goTo(0, -180, note(1150, 1140, 300, 60, 'Starts just below the stage.')),
                {op: 'control_wait', i: {DURATION: 0}, comment: note(1150, 1210, 300, 80, 'One frame, so the editor draws the text and knows its height.')},
                {op: 'motion_glidesecstoxy', i: {SECS: divide(plus(times(height, 0.6), 360), 40), X: 0, Y: plus(180, times(height, 0.6))},
                    comment: note(1150, 1300, 300, 130, 'Scroll speed: change the 40 (pixels per second, bigger = faster). 360 = stage height, 0.6 = text size.')},
                {op: 'event_broadcast', i: {BROADCAST_INPUT: {literal: [11, END_MESSAGE, messageId]}}},
                {op: 'control_delete_this_clone'}
            ],
            SUBSTACK2: [ // the black screen: fades in, then makes the text clone
                wearCostume(SCREEN),
                {op: 'looks_cleargraphiceffects'},
                ghost('looks_seteffectto', 100),
                {op: 'motion_pointindirection', i: {DIRECTION: 90}},
                {op: 'looks_setsizeto', i: {SIZE: 1000}},
                goTo(0, 0),
                front,
                repeat(10, [ghost('looks_changeeffectby', -10)]),
                wearCostume(TEXT),
                {op: 'looks_setsizeto', i: {SIZE: 60}, comment: note(1150, 2004, 300, 60, 'Text size (the clone keeps it).')},
                cloneMyself,
                wearCostume(SCREEN),
                {op: 'looks_setsizeto', i: {SIZE: 1000}}
            ]
        }}
    ]}, {x: 1000, y: 40, script: [
        {op: 'event_whenbroadcastreceived', f: {BROADCAST_OPTION: [END_MESSAGE, messageId]}},
        {op: 'control_if', i: {
            CONDITION: costumeIs(SCREEN),
            SUBSTACK: [repeat(10, [ghost('looks_changeeffectby', 10)]), {op: 'control_delete_this_clone'}]
        }}
    ]}], prefix);
};

const svgCostume = (storage, name, svg, centerX, centerY) => {
    const asset = storage.createAsset(storage.AssetType.ImageVector, storage.DataFormat.SVG,
        new TextEncoder().encode(svg), null, true);
    storage.builtinHelper._store(storage.AssetType.ImageVector, storage.DataFormat.SVG, asset.data, asset.assetId);
    return {name, bitmapResolution: 1, dataFormat: 'svg', assetId: asset.assetId, md5ext: `${asset.assetId}.svg`,
        rotationCenterX: centerX, rotationCenterY: centerY};
};

// The script also goes into the backpack (once), with the warning sign as its picture.
const backpackThumbnail = () => new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 96;
        canvas.getContext('2d').drawImage(image, 0, 0, 96, 96);
        resolve(canvas.toDataURL('image/png').replace('data:image/png;base64,', ''));
    };
    image.onerror = () => resolve('');
    image.src = `data:image/svg+xml;base64,${btoa(WARNING_SVG)}`;
});
const addToBackpack = async sprite => {
    try {
        const items = await localBackpack.getBackpackContents({limit: 1000, offset: 0});
        if (items.some(item => item.type === 'script' && item.name === BACKPACK_NAME)) return;
        const blockObjects = Object.values(sprite.blocks._blocks).map(b => {
            const copy = JSON.parse(JSON.stringify(b));
            delete copy.comment;
            return copy;
        });
        const json = JSON.stringify(blockObjects);
        await localBackpack.saveBackpackObject({
            type: 'script', mime: 'application/json', name: BACKPACK_NAME,
            body: btoa(unescape(encodeURIComponent(json))), thumbnail: await backpackThumbnail()
        });
    } catch (e) {
        console.warn('Could not put the credits screen script in the backpack', e);
    }
};

// A sprite made by an older version: blank costume, no scripts (it gets replaced by a new one)
const isOldSprite = sprite => sprite.getCostumes().length === 1 && sprite.getCostumes()[0].name === 'blank' &&
    Object.keys(sprite.blocks._blocks).length === 0;

/* Packager check: is the credit sprite shown by a script (a "show" block under a hat block)? */
const SHOW_OPCODES = ['looks_show', 'looks_changeVisibilityOfSprite', 'looks_changeVisibilityOfSpriteShow'];
const inputValue = (blocks, block, name) => {
    if (block.fields[name]) return block.fields[name].value;
    const input = block.inputs[name];
    const shadow = input && blocks.getBlock(input.block);
    if (!shadow || !shadow.shadow) return null; // a reporter: can't know
    const field = Object.values(shadow.fields)[0];
    return field ? field.value : null;
};
const showsCredits = (runtime, sprite) => {
    const blocks = sprite.blocks;
    return Object.keys(blocks._blocks).some(id => {
        const block = blocks.getBlock(id);
        if (!SHOW_OPCODES.includes(block.opcode)) return false;
        if (block.opcode !== 'looks_show') {
            const option = inputValue(blocks, block, 'VISIBLE_OPTION');
            if (option !== null && option !== '_myself_' && option !== sprite.getName()) return false;
            const type = block.opcode === 'looks_changeVisibilityOfSprite' ? inputValue(blocks, block, 'VISIBLE_TYPE') : 'show';
            if (type !== null && String(type).toLowerCase() !== 'show') return false;
        }
        let top = block;
        while (top.parent) top = blocks.getBlock(top.parent);
        return runtime.getIsHat(top.opcode); // not orphaned
    });
};
const askToContinue = () => new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.6);' +
        'display:flex;align-items:center;justify-content:center;';
    const box = document.createElement('div');
    box.setAttribute('role', 'alertdialog');
    box.style.cssText = 'max-width:480px;margin:16px;padding:20px;background:#ffffff;color:#222222;' +
        'border:3px solid #ffa200;font:15px/1.5 Helvetica, Arial, sans-serif;';
    const text = document.createElement('p');
    text.textContent = WARNING_TEXT;
    text.style.cssText = 'margin:0 0 16px;white-space:pre-wrap;';
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';
    const button = (label, primary, ok) => {
        const b = document.createElement('button');
        b.textContent = label;
        b.style.cssText = `padding:6px 14px;font:inherit;cursor:pointer;border:1px solid #888888;` +
            (primary ? 'background:#ffa200;color:#000000;font-weight:bold;' : 'background:#eeeeee;color:#222222;');
        b.onclick = () => close(ok);
        row.appendChild(b);
        return b;
    };
    const onKey = e => {
        if (e.key === 'Escape') close(false);
    };
    const close = ok => {
        overlay.remove();
        document.removeEventListener('keydown', onKey, true);
        resolve(ok);
    };
    const back = button('Go back', true, false);
    button('Continue anyway', false, true);
    box.append(text, row);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    document.addEventListener('keydown', onKey, true);
    back.focus();
});
export const confirmPackaging = vm => {
    const runtime = vm && vm.runtime;
    const sprite = runtime && findCreditSprite(runtime);
    if (!sprite || !collectCredits(runtime).length || showsCredits(runtime, sprite)) return Promise.resolve(true);
    return askToContinue();
};

export default function installCredits (vm) {
    if (vm.pmCreditsInstalled) return;
    vm.pmCreditsInstalled = true;
    const runtime = vm.runtime;
    let timer = null;
    let creating = false;
    const originalDelete = vm.deleteSprite;

    const creditsNeeded = () => collectCredits(runtime).length > 0;

    const createSprite = async credits => {
        const previous = vm.editingTarget && vm.editingTarget.id;
        const stage = runtime.getTargetForStage();
        const existing = stage.lookupBroadcastByInputValue(END_MESSAGE);
        const messageId = existing ? existing.id : `pmDesktopCreditsEnd${Date.now().toString(36)}`;
        if (!existing) stage.createVariable(messageId, END_MESSAGE, 'broadcast_msg');
        const {blocks, comments} = creditScripts(messageId, `pmcr${Date.now().toString(36)}_`);
        comments[NOTE_ID] = Object.assign({blockId: null, minimized: false, text: NOTE_TEXT}, NOTE);
        const storage = runtime.storage;
        await vm.addSprite(JSON.stringify({
            isStage: false, name: SPRITE_NAME,
            variables: {[VAR_ID]: [VAR_NAME, creditText(credits)]}, lists: {}, broadcasts: {},
            blocks, comments, currentCostume: 0, extensions: ['text'], // Animated Text
            costumes: [
                svgCostume(storage, BUTTON, WARNING_SVG, 24.779095, 24.779095),
                svgCostume(storage, SCREEN, SCREEN_SVG, 240, 180),
                svgCostume(storage, TEXT, TEXT_SVG, 50, 50)
            ],
            sounds: [], volume: 100, visible: false, x: 0, y: 0, size: 100, direction: 90,
            draggable: false, rotationStyle: 'all around'
        }));
        const sprite = vm.editingTarget;
        if (previous && runtime.getTargetById(previous)) vm.setEditingTarget(previous);
        else vm.emitWorkspaceUpdate();
        addToBackpack(sprite);
    };

    const sync = async () => {
        timer = null;
        if (creating) return;
        const credits = collectCredits(runtime);
        let sprite = findCreditSprite(runtime);
        if (credits.length && (!sprite || isOldSprite(sprite))) {
            creating = true;
            try {
                if (sprite) originalDelete.call(vm, sprite.id);
                await createSprite(credits);
            } finally {
                creating = false;
            }
            return;
        }
        if (!sprite) return;
        let changed = false;
        const text = credits.length ? NOTE_TEXT : NO_CREDIT_TEXT;
        const note = findNote(sprite);
        if (!note) {
            sprite.createComment(NOTE_ID, null, text, NOTE.x, NOTE.y, NOTE.width, NOTE.height, false);
            changed = true;
        } else if (note.text !== text) {
            note.text = text;
            note.width = NOTE.width;
            note.height = NOTE.height;
            changed = true;
        }
        const value = creditText(credits);
        let variable = sprite.lookupVariableByNameAndType(VAR_NAME, '', true);
        if (!variable && credits.length) {
            sprite.createVariable(sprite.variables[VAR_ID] ? `${VAR_ID}${Date.now()}` : VAR_ID, VAR_NAME, '');
            variable = sprite.lookupVariableByNameAndType(VAR_NAME, '', true);
        }
        if (variable && variable.value !== value) {
            variable.value = value;
            changed = true;
        }
        if (!changed) return;
        runtime.emitProjectChanged();
        if (vm.editingTarget === sprite) vm.emitWorkspaceUpdate();
    };
    const schedule = () => {
        if (!timer) timer = setTimeout(sync, 250);
    };

    vm.on('targetsUpdate', schedule); // sprites, costumes or sounds were added, removed or loaded

    // Editing a credited asset marks it as modified (licences like CC BY ask you to say so).
    const markModified = list => index => {
        const asset = list()[index];
        if (asset && asset.pmCredit && !asset.pmCredit.modified) {
            asset.pmCredit = Object.assign({}, asset.pmCredit, {modified: true}); // copies share the record
            schedule();
        }
    };
    const costumes = () => (vm.editingTarget ? vm.editingTarget.getCostumes() : []);
    const sounds = () => (vm.editingTarget && vm.editingTarget.sprite ? vm.editingTarget.sprite.sounds : []);
    for (const [method, list] of [['updateSvg', costumes], ['updateBitmap', costumes], ['updateSoundBuffer', sounds]]) {
        const original = vm[method];
        const mark = markModified(list);
        vm[method] = function (index, ...rest) {
            mark(index);
            return original.call(this, index, ...rest);
        };
    }

    // The credit sprite can't be deleted or renamed while credits are needed.
    vm.deleteSprite = function (targetId) {
        const target = runtime.getTargetById(targetId);
        if (target && target === findCreditSprite(runtime) && creditsNeeded()) {
            // eslint-disable-next-line no-alert
            alert('The "credit" sprite lists the credits your game needs, so it can\'t be deleted ' +
                'while the project uses assets that need credit.');
            return () => Promise.resolve();
        }
        return originalDelete.call(this, targetId);
    };
    const originalRename = vm.renameSprite;
    vm.renameSprite = function (targetId, newName) {
        const target = runtime.getTargetById(targetId);
        if (target && target === findCreditSprite(runtime) && newName !== SPRITE_NAME && creditsNeeded()) {
            // eslint-disable-next-line no-alert
            alert('The "credit" sprite keeps its name while the project uses assets that need credit.');
            vm.emitTargetsUpdate();
            return;
        }
        return originalRename.call(this, targetId, newName);
    };
}

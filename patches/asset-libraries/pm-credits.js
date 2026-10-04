// PenguinMod Desktop (patch section 16): the "credit" sprite.
// As soon as the project uses an asset whose licence asks for credit (see pm-asset-sources.js),
// a blank sprite named "credit" appears. Its note lists every credit the game must show; the note
// is rewritten whenever such an asset is added, removed or edited. While credits are needed the
// sprite can't be deleted or renamed. When none are needed any more, the note says so and the
// sprite can be deleted.

const SPRITE_NAME = 'credit';
const NOTE_ID = 'pmDesktopCreditsNote';
const SIGNATURE = 'this note updates itself'; // in every note text (comment ids change when a project is saved)
const BLANK_COSTUME_MD5 = 'cd21514d0531fdffb22204e0ec5ed84a.svg'; // Scratch's empty costume
const NOTE = {x: 40, y: 40, width: 560, height: 420};

const freeComments = target => Object.keys(target.comments || {})
    .map(id => target.comments[id]).filter(c => c && !c.blockId);
const isNote = c => typeof c.text === 'string' && c.text.toLowerCase().includes(SIGNATURE);

// The credit sprite: the one holding the note, or else the sprite named "credit".
const findCreditSprite = runtime => {
    const sprites = runtime.targets.filter(t => t.isOriginal && !t.isStage);
    return sprites.find(t => freeComments(t).some(isNote)) || sprites.find(t => t.getName() === SPRITE_NAME) || null;
};
const findNote = target => freeComments(target).find(isNote) || freeComments(target)[0] || null;

const modifiedText = c => (c.modified ? ' Modified from the original.' : '');

const creditLine = c => {
    const link = url => (url ? ` (${url})` : '');
    if (c.src === 'openverse') {
        return `"${c.title || 'Untitled'}" by ${c.by || 'an unknown author'}${link(c.url)}, licensed under ` +
            `${c.license}${link(c.licenseUrl)}.${modifiedText(c)}`;
    }
    if (c.src === 'europeana') {
        return `"${c.title || 'Untitled'}"${c.by ? ` by ${c.by}` : ''}${c.institution ? `, ${c.institution}` : ''}` +
            `${link(c.url)} via Europeana, licensed under ${c.license}${link(c.licenseUrl)}.${modifiedText(c)}`;
    }
    if (c.src === 'iconify') {
        return `Icon "${c.title}" from ${c.set}, copyright ${c.by}${link(c.byUrl)}, licensed under ` +
            `${c.license}${link(c.licenseUrl)}.${modifiedText(c)}`;
    }
    if (c.src === 'game-icons') {
        return `Icon "${c.title}" by ${c.by} from game-icons.net${link(c.url)}, ${c.changes || 'recoloured'}, licensed under ` +
            `${c.license}${link(c.licenseUrl)}.${modifiedText(c)}`;
    }
    return `"${c.title}" by ${c.by || 'unknown'}${link(c.url)}, ${c.license || 'see source'}${link(c.licenseUrl)}.${modifiedText(c)}`;
};

const collectCredits = runtime => {
    const lines = new Set();
    for (const target of runtime.targets) {
        if (!target.isOriginal) continue;
        const assets = target.getCostumes().concat(target.getSounds ? target.getSounds() : []);
        for (const asset of assets) {
            if (!asset || !asset.pmCredit) continue;
            // an icon made in the studio can also carry the credit of the badge on it (`extra`)
            for (const c of [asset.pmCredit].concat(asset.pmCredit.extra || [])) {
                if (c && c.needsCredit) lines.add(creditLine(Object.assign({}, c, c === asset.pmCredit ? {} : {modified: asset.pmCredit.modified})));
            }
        }
    }
    return Array.from(lines).sort((a, b) => a.localeCompare(b));
};

const noteText = lines => (lines.length ? [
    'CREDITS',
    "Show these lines in your game's credits (for example on a credits screen).",
    'This note updates itself when you add, edit or remove assets that need credit; text you type here is replaced.',
    '',
    ...lines.map(line => `• ${line}`)
].join('\n') : 'No asset in this project needs credit right now, so you can delete this sprite. (This note updates itself.)');

export default function installCredits (vm) {
    if (vm.pmCreditsInstalled) return;
    vm.pmCreditsInstalled = true;
    const runtime = vm.runtime;
    let timer = null;
    let creating = false;

    const creditsNeeded = () => collectCredits(runtime).length > 0;

    const sync = async () => {
        timer = null;
        const lines = collectCredits(runtime);
        let sprite = findCreditSprite(runtime);
        if (!sprite && lines.length && !creating) {
            creating = true;
            const previous = vm.editingTarget && vm.editingTarget.id;
            try {
                await vm.addSprite(JSON.stringify({
                    objName: SPRITE_NAME, sounds: [], costumes: [{
                        costumeName: 'blank', baseLayerID: -1, baseLayerMD5: BLANK_COSTUME_MD5,
                        bitmapResolution: 1, rotationCenterX: 0, rotationCenterY: 0
                    }],
                    currentCostumeIndex: 0, scratchX: 0, scratchY: 0, scale: 1, direction: 90,
                    rotationStyle: 'normal', isDraggable: false, visible: true, spriteInfo: {}
                }));
                sprite = vm.editingTarget;
                sprite.createComment(NOTE_ID, null, noteText(lines), NOTE.x, NOTE.y, NOTE.width, NOTE.height, false);
                if (previous && runtime.getTargetById(previous)) vm.setEditingTarget(previous);
                else vm.emitWorkspaceUpdate();
            } finally {
                creating = false;
            }
            return;
        }
        if (!sprite) return;
        const text = noteText(lines);
        const note = findNote(sprite);
        if (note && note.text === text) return;
        if (note) note.text = text;
        else sprite.createComment(NOTE_ID, null, text, NOTE.x, NOTE.y, NOTE.width, NOTE.height, false);
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
    const originalDelete = vm.deleteSprite;
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

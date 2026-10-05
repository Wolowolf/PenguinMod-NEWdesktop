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
        source && `  (${shortUrl(source)})`,
        !licenceListed && c.licenseUrl && `  (${shortUrl(c.licenseUrl)})`
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

const noteText = credits => {
    if (!credits.length) return 'No asset in this project needs credit right now, so you can delete this sprite. (This note updates itself.)';
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
        'CREDITS',
        "Show all of this in your game's credits (for example on a credits screen), including the licence links.",
        'This note updates itself when you add, edit or remove assets that need credit; text you type here is replaced.',
        '',
        ...sorted(credits.map(c => creditLines(c, listed.has(c.license)))).map(line => `• ${line}`),
        ...(listed.size ? ['', 'Licences:', ...sorted(Array.from(listed).map(([name, url]) => `${name}: ${url}`))] : [])
    ].join('\n');
};

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

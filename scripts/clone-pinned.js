/*
 * Downloads one upstream project at the exact commit listed in upstream.json.
 * Used by the CI workflow and by the local test, so both build the same code.
 *
 *   node scripts/clone-pinned.js <name> [folder]
 *
 * <name> is a key of upstream.json; [folder] defaults to <name> (relative to the current folder).
 * Like `git clone --depth=1`, but for one fixed commit instead of whatever is newest.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const pins = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'upstream.json'), 'utf8'));
const name = process.argv[2];
const folder = process.argv[3] || name;
const pin = pins[name];

function fail(message) {
    console.error(`clone-pinned: ${message}`);
    process.exit(1);
}

if (!pin || !/^[0-9a-f]{40}$/.test(pin.commit || '')) fail(`no 40-character commit for "${name}" in upstream.json`);
if (fs.existsSync(folder)) fail(`${folder} already exists`);

const git = (...args) => execFileSync('git', ['-C', folder, ...args], { stdio: 'inherit' });
try {
    fs.mkdirSync(folder, { recursive: true });
    git('-c', 'init.defaultBranch=main', 'init', '-q');
    git('config', 'core.longpaths', 'true'); // Windows: the GUI has paths longer than 260 characters
    git('fetch', '-q', '--depth=1', pin.repo, pin.commit);
    git('checkout', '-q', 'FETCH_HEAD');
} catch (err) {
    fail(`downloading ${name} at ${pin.commit} failed (${err.message.split('\n')[0]})`);
}
console.log(`${name}: ${pin.commit.slice(0, 7)} from ${pin.repo}`);

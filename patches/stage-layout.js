/*
 * Patch for the PenguinMod GUI (run by CI right after the GUI is cloned).
 *
 * What it does:
 *   1. The stage in the editor is ALWAYS the same size, no matter what custom
 *      stage resolution the project uses. The stage is scaled to fit a fixed box
 *      (default 480 wide, 4:3).
 *   2. The "small stage" / "large stage" buttons are removed.
 *   3. A drag handle is added on the left edge of the stage column. Drag it left
 *      to make the stage bigger, right to make it smaller. Double-click resets.
 *      The size is remembered between launches.
 *   4. The stage column hugs the stage (no empty space beside tall or small stages).
 *   5. The sprite info panel (name, x, y, show, size, direction) is compact: square
 *      boxes with little padding, no arrow icons next to x / y, and its rows wrap so
 *      the panel can get as narrow as the stage.
 *   6. Automatic restore points are OFF by default (they can be turned on again in
 *      the Restore Points window). See section 9 for why.
 *   7. The sprite panel is ONE wrapping row: [eye toggle] [name] x y [size symbol]
 *      [direction symbol], boxes sized to their content, no rounded corners.
 *   8. No rounded corners anywhere in the editor (section 10).
 *   9. The block category menu (Motion, Looks... extensions, Pinned) is a column of
 *      equal-sized colour boxes with just the name, no icons (section 11).
 *  10. The "Back to Home" button in the editor's top bar is removed (section 12).
 *  11. Re-ordering the category boxes by dragging: the box itself slides up and down
 *      between the others (no faded box, floating copy or blank gap) (section 13).
 *
 * Usage:  node patches/stage-layout.js <path-to-GUI-folder>
 *
 * If upstream changes one of the lines this script looks for, it stops with a
 * clear error instead of silently producing a broken build.
 */

const fs = require('fs');
const path = require('path');

const root = process.argv[2];
if (!root || !fs.existsSync(root)) {
    console.error('Usage: node patches/stage-layout.js <path-to-GUI-folder>');
    process.exit(1);
}

const MARKER = 'PMDESKTOP_STAGE_PATCH';

const file = rel => path.join(root, rel);
const read = rel => fs.readFileSync(file(rel), 'utf8');
const write = (rel, text) => {
    fs.mkdirSync(path.dirname(file(rel)), {recursive: true});
    fs.writeFileSync(file(rel), text);
};

const fail = msg => {
    console.error('\nPATCH FAILED: ' + msg);
    console.error('The upstream GUI code probably changed. The patch in patches/stage-layout.js needs updating.');
    process.exit(1);
};

// Replace `find` with `replacement` in a file. `find` must appear exactly once.
const replaceOnce = (rel, find, replacement) => {
    const text = read(rel);
    const first = text.indexOf(find);
    if (first === -1) fail(rel + ': could not find:\n' + find);
    if (text.indexOf(find, first + 1) !== -1) fail(rel + ': found more than once:\n' + find);
    write(rel, text.slice(0, first) + replacement + text.slice(first + find.length));
};

if (read('src/lib/screen-utils.js').includes(MARKER)) {
    console.log('Stage layout patch already applied, nothing to do.');
    process.exit(0);
}

/* ------------------------------------------------------------------ */
/* 1. src/lib/screen-utils.js: fixed-size box math                     */
/* ------------------------------------------------------------------ */
const SU = 'src/lib/screen-utils.js';

replaceOnce(SU,
    "const maxScaleParam = typeof URLSearchParams !== 'undefined' && new URLSearchParams(location.search).get('scale');\n",
    "const maxScaleParam = typeof URLSearchParams !== 'undefined' && new URLSearchParams(location.search).get('scale');\n" +
`
// ${MARKER}
// The editor stage is scaled to fit inside a box of this width (height = width * 3/4).
const DEFAULT_STAGE_BOX_WIDTH = 480;
const MIN_STAGE_BOX_WIDTH = 240;
// Narrowest the stage column may get (the sprite panel can wrap down to this).
const MIN_STAGE_COLUMN_WIDTH = 242;
const MAX_STAGE_BOX_WIDTH = 1200;
const STAGE_BOX_RATIO = 3 / 4;
// Space that must always be left for the block palette + workspace.
const MIN_EDITOR_WIDTH = 560;

/**
 * Limit a wanted stage box width to what fits in the current window.
 * @param {number} preferred - the width the user asked for
 * @return {number} a usable width
 */
const getEffectiveStageBoxWidth = preferred => {
    let width = Number(preferred);
    if (!isFinite(width) || width <= 0) width = DEFAULT_STAGE_BOX_WIDTH;
    const available = typeof window === 'undefined' ? MAX_STAGE_BOX_WIDTH : window.innerWidth - MIN_EDITOR_WIDTH;
    const max = Math.max(MIN_STAGE_BOX_WIDTH, Math.min(MAX_STAGE_BOX_WIDTH, available));
    return Math.round(Math.max(MIN_STAGE_BOX_WIDTH, Math.min(max, width)));
};
`);

replaceOnce(SU,
    'const getStageDimensions = (stageSize, customStageSize, isFullScreen) => {',
    'const getStageDimensions = (stageSize, customStageSize, isFullScreen, boxWidth) => {');

replaceOnce(SU,
    '    } else {\n        stageDimensions.scale = STAGE_DISPLAY_SCALES[stageSize];',
    '    } else if (boxWidth) {\n' +
    '        // Fixed-size editor stage: scale the stage to fit the box, keeping its aspect ratio\n' +
    '        const boxHeight = boxWidth * STAGE_BOX_RATIO;\n' +
    '        stageDimensions.scale = Math.min(\n' +
    '            boxWidth / stageDimensions.widthDefault,\n' +
    '            boxHeight / stageDimensions.heightDefault\n' +
    '        );\n' +
    '        stageDimensions.height = stageDimensions.scale * stageDimensions.heightDefault;\n' +
    '        stageDimensions.width = stageDimensions.scale * stageDimensions.widthDefault;\n' +
    '    } else {\n        stageDimensions.scale = STAGE_DISPLAY_SCALES[stageSize];');

replaceOnce(SU,
    'const getMinWidth = stageSize => STAGE_DISPLAY_SCALES[stageSize] * 480;',
    'const getMinWidth = (stageSize, boxWidth) => boxWidth || STAGE_DISPLAY_SCALES[stageSize] * 480;');

// The editor never switches to "small" or "constrained" any more.
replaceOnce(SU,
    'const resolveStageSize = (stageSizeMode, isFullSize) => {\n' +
    '    if (stageSizeMode === STAGE_SIZE_MODES.small) {\n' +
    '        return STAGE_DISPLAY_SIZES.small;\n' +
    '    }\n' +
    '    if (isFullSize) {\n' +
    '        return STAGE_DISPLAY_SIZES.large;\n' +
    '    }\n' +
    '    return STAGE_DISPLAY_SIZES.largeConstrained;\n' +
    '};',
    'const resolveStageSize = () => STAGE_DISPLAY_SIZES.large;');

replaceOnce(SU,
    'export {\n    getStageDimensions,',
    'export {\n' +
    '    DEFAULT_STAGE_BOX_WIDTH,\n' +
    '    MIN_STAGE_BOX_WIDTH,\n' +
    '    MIN_STAGE_COLUMN_WIDTH,\n' +
    '    MAX_STAGE_BOX_WIDTH,\n' +
    '    getEffectiveStageBoxWidth,\n' +
    '    getStageDimensions,');

/* ------------------------------------------------------------------ */
/* 2. src/reducers/stage-size.js: remember the box width               */
/* ------------------------------------------------------------------ */
const RS = 'src/reducers/stage-size.js';
if (!read(RS).includes('SET_STAGE_SIZE')) fail(RS + ': unexpected contents');
write(RS, `import {STAGE_DISPLAY_SIZES} from '../lib/layout-constants.js';
import {DEFAULT_STAGE_BOX_WIDTH} from '../lib/screen-utils.js';

const SET_STAGE_SIZE = 'scratch-gui/StageSize/SET_STAGE_SIZE';
const SET_STAGE_BOX_WIDTH = 'scratch-gui/StageSize/SET_STAGE_BOX_WIDTH';
const STORAGE_KEY = 'pmdesktop:stageBoxWidth';

const loadBoxWidth = function () {
    try {
        const saved = Number(localStorage.getItem(STORAGE_KEY));
        if (isFinite(saved) && saved > 0) return saved;
    } catch (e) {
        // storage not available, use the default
    }
    return DEFAULT_STAGE_BOX_WIDTH;
};

const saveStageBoxWidth = function (width) {
    try {
        localStorage.setItem(STORAGE_KEY, String(width));
    } catch (e) {
        // storage not available, the size just won't be remembered
    }
};

const initialState = {
    stageSize: STAGE_DISPLAY_SIZES.large,
    boxWidth: loadBoxWidth()
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case SET_STAGE_SIZE:
        return Object.assign({}, state, {
            stageSize: action.stageSize
        });
    case SET_STAGE_BOX_WIDTH:
        return Object.assign({}, state, {
            boxWidth: action.boxWidth
        });
    default:
        return state;
    }
};

const setStageSize = function (stageSize) {
    return {
        type: SET_STAGE_SIZE,
        stageSize: stageSize
    };
};

const setStageBoxWidth = function (boxWidth) {
    return {
        type: SET_STAGE_BOX_WIDTH,
        boxWidth: boxWidth
    };
};

export {
    reducer as default,
    initialState as stageSizeInitialState,
    setStageSize,
    setStageBoxWidth,
    saveStageBoxWidth
};
`);

/* ------------------------------------------------------------------ */
/* 3. src/containers/stage.jsx: pass the box width to the stage        */
/* ------------------------------------------------------------------ */
const CS = 'src/containers/stage.jsx';

replaceOnce(CS,
    "import {STAGE_DISPLAY_SIZES} from '../lib/layout-constants';\n",
    "import {STAGE_DISPLAY_SIZES} from '../lib/layout-constants';\n" +
    "import {getEffectiveStageBoxWidth} from '../lib/screen-utils';\n");

replaceOnce(CS,
    'return this.props.stageSize !== nextProps.stageSize ||\n',
    'return this.props.stageSize !== nextProps.stageSize ||\n' +
    '            this.props.stageBoxWidth !== nextProps.stageBoxWidth ||\n');

replaceOnce(CS,
    '    stageSize: PropTypes.oneOf(Object.keys(STAGE_DISPLAY_SIZES)).isRequired,\n',
    '    stageBoxWidth: PropTypes.number,\n' +
    '    stageSize: PropTypes.oneOf(Object.keys(STAGE_DISPLAY_SIZES)).isRequired,\n');

replaceOnce(CS,
    '    customStageSize: state.scratchGui.customStageSize,\n    disableEditingTargetChange: (',
    '    customStageSize: state.scratchGui.customStageSize,\n' +
    '    stageBoxWidth: getEffectiveStageBoxWidth(state.scratchGui.stageSize.boxWidth),\n' +
    '    disableEditingTargetChange: (');

/* ------------------------------------------------------------------ */
/* 4. src/components/stage/stage.jsx: use the box width                */
/* ------------------------------------------------------------------ */
const CSC = 'src/components/stage/stage.jsx';

replaceOnce(CSC,
    '        question,\n        stageSize,\n        useEditorDragStyle,\n',
    '        question,\n        stageBoxWidth,\n        stageSize,\n        useEditorDragStyle,\n');

replaceOnce(CSC,
    "import {getStageDimensions, getMinWidth} from '../../lib/screen-utils.js';\n",
    "import {getStageDimensions, getMinWidth, MIN_STAGE_COLUMN_WIDTH} from '../../lib/screen-utils.js';\n");

replaceOnce(CSC,
    '    const stageDimensions = getStageDimensions(stageSize, customStageSize, isFullScreen);\n' +
    '    const minWidth = getMinWidth(stageSize);\n',
    '    // Player-only mode keeps its normal size; the editor uses the fixed-size box\n' +
    '    const boxWidth = isPlayerOnly ? null : stageBoxWidth;\n' +
    '    const stageDimensions = getStageDimensions(stageSize, customStageSize, isFullScreen, boxWidth);\n' +
    '    // In the editor the column hugs the stage, but never gets narrower than the sprite panel can shrink\n' +
    '    const minWidth = boxWidth ?\n' +
    '        Math.max(Math.ceil(stageDimensions.width), MIN_STAGE_COLUMN_WIDTH) :\n' +
    '        getMinWidth(stageSize, boxWidth);\n');

replaceOnce(CSC,
    '    stageSize: PropTypes.oneOf(Object.keys(STAGE_DISPLAY_SIZES)).isRequired,\n',
    '    stageBoxWidth: PropTypes.number,\n' +
    '    stageSize: PropTypes.oneOf(Object.keys(STAGE_DISPLAY_SIZES)).isRequired,\n');

/* ------------------------------------------------------------------ */
/* 5. Stage header: remove the small / large stage buttons             */
/* ------------------------------------------------------------------ */
const SH = 'src/components/stage-header/stage-header.jsx';
{
    const text = read(SH);
    const startMarker = '        const stageControls =\n';
    const endMarker = '        header = (\n            <Box className={styles.stageHeaderWrapper}>';
    const start = text.indexOf(startMarker);
    const end = text.indexOf(endMarker);
    if (start === -1 || end === -1 || end < start) fail(SH + ': could not find the stage size buttons block');
    if (text.indexOf(startMarker, start + 1) !== -1) fail(SH + ': stage size buttons block found twice');
    write(SH, text.slice(0, start) +
        '        // The small/large stage buttons were removed (the stage has one fixed size; drag its edge instead)\n' +
        '        const stageControls = null;\n' +
        text.slice(end));
}

/* ------------------------------------------------------------------ */
/* 6. New drag handle component                                        */
/* ------------------------------------------------------------------ */
write('src/components/stage-resize-handle/stage-resize-handle.jsx', `import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';

import {DEFAULT_STAGE_BOX_WIDTH, getEffectiveStageBoxWidth, getStageDimensions} from '../../lib/screen-utils';
import {setStageBoxWidth, saveStageBoxWidth} from '../../reducers/stage-size';

import styles from './stage-resize-handle.css';

class StageResizeHandle extends React.Component {
    constructor (props) {
        super(props);
        this.state = {active: false};
        this.dragging = false;
        this.startX = 0;
        this.startWidth = DEFAULT_STAGE_BOX_WIDTH;
        this.slope = 1;
        this.currentWidth = getEffectiveStageBoxWidth(props.boxWidth);
        this.nudgePending = false;
        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);
        this.handleDoubleClick = this.handleDoubleClick.bind(this);
        this.handleWindowResize = this.handleWindowResize.bind(this);
    }
    componentDidMount () {
        window.addEventListener('resize', this.handleWindowResize);
    }
    componentWillUnmount () {
        window.removeEventListener('resize', this.handleWindowResize);
    }
    // Tell the block workspace that the space available to it changed.
    nudgeLayout () {
        if (this.nudgePending) return;
        this.nudgePending = true;
        requestAnimationFrame(() => {
            this.nudgePending = false;
            window.dispatchEvent(new Event('resize'));
        });
    }
    applyWidth (width) {
        this.currentWidth = getEffectiveStageBoxWidth(width);
        this.props.onChange(this.currentWidth);
        this.nudgeLayout();
    }
    handleWindowResize () {
        // A smaller window may force a smaller stage (and a bigger one gives it back).
        const effective = getEffectiveStageBoxWidth(this.props.boxWidth);
        if (effective !== this.currentWidth) {
            this.currentWidth = effective;
            this.props.onChange(this.props.boxWidth);
            this.nudgeLayout();
        }
    }
    handlePointerDown (e) {
        if (e.button !== undefined && e.button !== 0) return;
        e.preventDefault();
        this.dragging = true;
        this.startX = e.clientX;
        this.startWidth = getEffectiveStageBoxWidth(this.props.boxWidth);
        // Tall stages are narrower than the box, so the column grows slower than the box does.
        // Compensate so the handle keeps following the mouse.
        const dims = getStageDimensions('large', this.props.customStageSize, false, this.startWidth);
        this.slope = Math.max(0.3, Math.min(1, dims.width / this.startWidth)) || 1;
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch (err) {
            // not fatal, dragging still works while the pointer stays over the handle
        }
        this.setState({active: true});
    }
    handlePointerMove (e) {
        if (!this.dragging) return;
        const dx = e.clientX - this.startX;
        // The stage column is on the right, so dragging left makes the stage bigger.
        // (In right-to-left languages the column is on the left, so it is reversed.)
        const delta = this.props.isRtl ? dx : -dx;
        this.applyWidth(this.startWidth + (delta / this.slope));
    }
    handlePointerUp (e) {
        if (!this.dragging) return;
        this.dragging = false;
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch (err) {
            // ignore
        }
        saveStageBoxWidth(this.currentWidth);
        this.setState({active: false});
    }
    handleDoubleClick () {
        this.applyWidth(DEFAULT_STAGE_BOX_WIDTH);
        saveStageBoxWidth(this.currentWidth);
    }
    render () {
        return (
            <div
                aria-orientation="vertical"
                className={classNames(styles.handle, {[styles.active]: this.state.active})}
                role="separator"
                title="Drag to resize the stage (double-click to reset)"
                onDoubleClick={this.handleDoubleClick}
                onPointerCancel={this.handlePointerUp}
                onPointerDown={this.handlePointerDown}
                onPointerMove={this.handlePointerMove}
                onPointerUp={this.handlePointerUp}
            >
                <div className={styles.grip} />
            </div>
        );
    }
}

StageResizeHandle.propTypes = {
    boxWidth: PropTypes.number,
    customStageSize: PropTypes.shape({
        width: PropTypes.number,
        height: PropTypes.number
    }),
    isRtl: PropTypes.bool,
    onChange: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
    boxWidth: state.scratchGui.stageSize.boxWidth,
    customStageSize: state.scratchGui.customStageSize
});

const mapDispatchToProps = dispatch => ({
    onChange: width => dispatch(setStageBoxWidth(width))
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(StageResizeHandle);
`);

write('src/components/stage-resize-handle/stage-resize-handle.css', `@import "../../css/units.css";
@import "../../css/colors.css";

/* Sits in the gutter on the left edge of the stage column, full height. */
.handle {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: $space;
    z-index: 10;
    cursor: ew-resize;
    touch-action: none;
    user-select: none;

    /* the grip sits at the bottom-left corner */
    display: flex;
    align-items: flex-end;
    justify-content: center;
}

[dir="rtl"] .handle {
    left: auto;
    right: 0;
}

.handle:hover,
.handle.active {
    background: $ui-black-transparent;
}

.grip {
    width: 4px;
    height: 36px;
    margin-bottom: 12px;
    border-radius: 2px;
    background: rgba(128, 128, 128, 0.6);
}

.handle:hover .grip,
.handle.active .grip {
    background: rgba(128, 128, 128, 0.95);
}
`);

/* ------------------------------------------------------------------ */
/* 7. src/components/gui/gui.jsx + gui.css: place the handle           */
/* ------------------------------------------------------------------ */
const GJ = 'src/components/gui/gui.jsx';

replaceOnce(GJ,
    "import {resolveStageSize} from '../../lib/screen-utils';\n",
    "import {resolveStageSize} from '../../lib/screen-utils';\n" +
    "import StageResizeHandle from '../stage-resize-handle/stage-resize-handle.jsx';\n");

replaceOnce(GJ,
    '<Box className={classNames(styles.stageAndTargetWrapper, styles[stageSize])}>\n',
    '<Box className={classNames(styles.stageAndTargetWrapper, styles[stageSize])}>\n' +
    '                            <StageResizeHandle isRtl={isRtl} />\n');

{
    const css = read('src/components/gui/gui.css');
    write('src/components/gui/gui.css', css.replace(/\s*$/, '\n') +
        '\n/* desktop patch: lets the stage resize handle be positioned against the stage column */\n' +
        '.stage-and-target-wrapper {\n    position: relative;\n}\n');
}

/* ------------------------------------------------------------------ */
/* 8. Sprite info panel: ONE compact row, boxes sized to their content, */
/*    no rounded corners, single eye toggle, symbols instead of words    */
/* ------------------------------------------------------------------ */
const SI = 'src/components/sprite-info/sprite-info.jsx';

// 8a. remove the arrow icons next to x / y
for (const axis of ['x', 'y']) {
    const re = new RegExp(
        '\\n[ \\t]*\\{\\n' +
        '[ \\t]*\\(stageSize === STAGE_DISPLAY_SIZES\\.large\\) \\?\\n' +
        '[ \\t]*<div className=\\{styles\\.iconWrapper\\}>\\n' +
        '[ \\t]*<img\\n' +
        '[ \\t]*aria-hidden="true"\\n' +
        '[ \\t]*className=\\{classNames\\(styles\\.' + axis + 'Icon, styles\\.icon\\)\\}\\n' +
        '[ \\t]*src=\\{' + axis + 'Icon\\}\\n' +
        '[ \\t]*/>\\n' +
        '[ \\t]*</div> :\\n' +
        '[ \\t]*null\\n' +
        '[ \\t]*\\}', 'g');
    const text = read(SI);
    const found = text.match(re);
    if (!found || found.length !== 1) fail(SI + ': could not find the ' + axis + ' arrow icon block exactly once');
    write(SI, text.replace(re, ''));
}

// 8b. replace the two-row layout with one wrapping row:
//     [eye toggle] [name] x y [size symbol] [direction symbol]
{
    const text = read(SI);
    const startMarker =
        '        return (\n' +
        '            <Box className={styles.spriteInfo}>\n' +
        '                <div className={classNames(styles.row, styles.rowPrimary)}>\n' +
        '                    <div className={styles.group}>\n' +
        '                        <Label\n';
    const endMarker = '            </Box>\n        );\n';
    const a = text.indexOf(startMarker);
    if (a === -1) fail(SI + ': could not find the sprite info layout block');
    if (text.indexOf(startMarker, a + 1) !== -1) fail(SI + ': sprite info layout block found twice');
    const b = text.indexOf(endMarker, a);
    if (b === -1) fail(SI + ': could not find the end of the sprite info layout block');
    const layout = `        return (
            <Box className={styles.spriteInfo}>
                <div className={styles.row}>
                    <div
                        className={classNames(
                            styles.radio,
                            styles.eyeToggle,
                            {
                                [styles.isActive]: this.props.visible && !this.props.disabled,
                                [styles.isDisabled]: this.props.disabled
                            }
                        )}
                        tabIndex="0"
                        onClick={this.props.disabled ? null : (
                            this.props.visible ? this.props.onClickNotVisible : this.props.onClickVisible
                        )}
                        onKeyPress={this.props.disabled ? null : (
                            this.props.visible ? this.props.onPressNotVisible : this.props.onPressVisible
                        )}
                    >
                        <img
                            className={styles.icon}
                            src={this.props.visible ? showIcon : hideIcon}
                        />
                    </div>
                    <div className={styles.group}>
                        {spriteNameInput}
                    </div>
                    {xPosition}
                    {yPosition}
                    <div className={classNames(styles.group, styles.largerInput)}>
                        <Label
                            secondary
                            above={labelAbove}
                            text="\u21EA"
                        >
                            <BufferedInput
                                small
                                disabled={this.props.disabled}
                                label={sizeLabel}
                                tabIndex="0"
                                type="text"
                                value={this.props.disabled ? '' : Math.round(this.props.size)}
                                onSubmit={this.props.onChangeSize}
                            />
                        </Label>
                    </div>
                    <div className={classNames(styles.group, styles.largerInput)}>
                        <DirectionPicker
                            direction={Math.round(this.props.direction)}
                            disabled={this.props.disabled}
                            labelAbove={labelAbove}
                            rotationStyle={this.props.rotationStyle}
                            onChangeDirection={this.props.onChangeDirection}
                            onChangeRotationStyle={this.props.onChangeRotationStyle}
                        />
                    </div>
                </div>
            </Box>
        );
`;
    write(SI, text.slice(0, a) + layout + text.slice(b + endMarker.length));
}

// 8c. the direction label becomes a symbol too
replaceOnce('src/components/direction-picker/direction-picker.jsx',
    '        above={props.labelAbove}\n        text={directionLabel}\n',
    '        above={props.labelAbove}\n        text="\u27F3"\n');

// 8d. styles
const SIC = 'src/components/sprite-info/sprite-info.css';
write(SIC, read(SIC).replace(/\s*$/, '\n') + `
/* ${MARKER}: one wrapping row, boxes sized to their content, no rounded corners */
.sprite-info {
    padding: 0.25rem 0.4rem;
    min-width: 0;
}

.row {
    flex-wrap: wrap;
    justify-content: flex-start;
    align-items: center;
    gap: 0.25rem 0.5rem;
}

.group {
    flex: 0 0 auto;
    max-width: 100%;
}

/* every box is only as wide as what is inside it */
.sprite-info input {
    field-sizing: content;
    box-sizing: border-box;
    width: auto;
    min-width: 1.5rem;
    height: 1.5rem;
    padding: 0 0.3rem;
    border-radius: 0;
    text-align: center;
    text-overflow: clip;
}

.larger-input input {
    width: auto;
}

.sprite-info input.sprite-input {
    min-width: 3rem;
    max-width: 9rem;
    text-align: left;
    text-overflow: ellipsis;
}

/* one button that toggles between shown (eye) and hidden (crossed-out eye) */
.eye-toggle {
    flex: 0 0 auto;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0.2rem;
    box-sizing: border-box;
    border: 1px solid $ui-black-transparent;
    border-radius: 0;
}

.eye-toggle:focus {
    border-color: $motion-primary;
}

/* the size / direction symbols a bit bigger so they are readable */
.sprite-info [class*="label_input-label-secondary"] {
    font-size: 0.875rem;
    line-height: 1;
}

[dir="ltr"] .sprite-info [class*="label_input-label"] {
    margin-right: 0.25rem;
}

[dir="rtl"] .sprite-info [class*="label_input-label"] {
    margin-left: 0.25rem;
}
`);

/* ------------------------------------------------------------------ */
/* 9. Automatic restore points: off by default                         */
/* ------------------------------------------------------------------ */
// Why: once a project has been changed, the editor re-creates a restore point
// every 5 minutes for as long as it stays open (each one shows a "Creating
// restore point..." message). Restore points can be turned back on in
// File -> Restore points -> "Restore points are created ...".
// To undo this section, delete it from this script (or ask Claude to reverse it).
replaceOnce('src/lib/tw-restore-point-api.js',
    'const DEFAULT_INTERVAL = 1000 * 60 * 5;',
    '// ' + MARKER + ': automatic restore points are off unless the user turns them on\n' +
    'const DEFAULT_INTERVAL = -1;');

/* ------------------------------------------------------------------ */
/* 10. No rounded corners anywhere in the editor                       */
/* ------------------------------------------------------------------ */
// Block shapes are drawn as SVG by the blocks library, so they are not affected by this.
// To undo this section, delete it from this script (or ask Claude to reverse it).
const GC = 'src/components/gui/gui.css';
write(GC, read(GC).replace(/\s*$/, '\n') + `
/* ${MARKER}: no rounded corners anywhere in the editor */
:global(*),
:global(*::before),
:global(*::after) {
    border-radius: 0 !important;
}

:global(*::-webkit-scrollbar),
:global(*::-webkit-scrollbar-thumb),
:global(*::-webkit-scrollbar-track) {
    border-radius: 0 !important;
}
`);

/* ------------------------------------------------------------------ */
/* 11. Block category menu: equal-sized colour boxes, name only         */
/* ------------------------------------------------------------------ */
// Each entry in the palette's category menu (Pinned, Motion, Looks, ... and every
// extension) becomes a box in the colour of that category's blocks, showing only
// its name. All boxes are as wide as "Pointerlock". A box is one line tall; longer
// names are cut with a dot. The selected box grows to two lines and shows more of the
// name (up to two lines). Text: white with a thin black outline, top left, small padding.
// To undo this section, delete it from this script (or ask Claude to reverse it).

// 11a. Expose each category's colour to CSS. The menu only stores the colour
//      inline for entries without an icon, so we copy it onto every entry as CSS
//      variables when the blocks library creates the entry.
replaceOnce('src/lib/blocks.js',
    '    const ScratchBlocks = LazyScratchBlocks.get();\n',
    '    const ScratchBlocks = LazyScratchBlocks.get();\n' +
`
    // ${MARKER}: give every category menu entry its colour as a CSS variable
    const pmCategory = ScratchBlocks.Toolbox && ScratchBlocks.Toolbox.Category;
    if (pmCategory && !pmCategory.prototype.pmColoured) {
        const originalCreateDom = pmCategory.prototype.createDom;
        pmCategory.prototype.pmColoured = true;
        pmCategory.prototype.createDom = function () {
            originalCreateDom.apply(this, arguments);
            const colour = typeof this.colour_ === 'string' && /^#[0-9a-fA-F]{6}/.test(this.colour_) ?
                this.colour_ : '#666666';
            if (this.item_) {
                this.item_.style.setProperty('--pm-cat-colour', colour);
            }
        };

        // The blocks library assumes the category menu is 60 px wide (toolbox width =
        // menu + flyout). Ours is wider, so add the difference; otherwise the menu would
        // cover the left edge of the block palette.
        const toolboxProto = ScratchBlocks.Toolbox.prototype;
        const originalGetWidth = toolboxProto.getWidth;
        toolboxProto.getWidth = function () {
            const table = this.categoryMenu_ && this.categoryMenu_.table;
            if (table && table.offsetWidth) this.pmMenuWidth = table.offsetWidth;
            return originalGetWidth.apply(this, arguments) + Math.max(0, (this.pmMenuWidth || 60) - 60);
        };
    }
`);

// 11b. The look of the boxes.
//      Not selected: the name on ONE line, cut with a dot when too long.
//      Selected: the box grows to two lines (no frame) and shows up to two lines of the name.
//      The text is always white with a thin black outline, aligned to the top left.
const BC = 'src/components/blocks/blocks.css';
write(BC, read(BC).replace(/\s*$/, '\n') + `
/* ${MARKER}: category menu = equal-width colour boxes with only the name */
.blocks :global(.scratchCategoryMenu) {
    /* box = "Pointerlock" (61 px of text) + 0.15rem padding on each side, + 2 px menu padding */
    width: 4.5rem;
    box-sizing: border-box;
    padding: 2px;
}

.blocks :global(.scratchCategoryMenuRow) {
    margin: 0 0 2px;
}

.blocks :global(.scratchCategoryMenuItem) {
    box-sizing: border-box;
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    width: 100%;
    /* half of the padding Session 6 had (0.3rem at the sides, about 0.43rem top and bottom) */
    padding: 0.215rem 0.15rem;
    text-align: left;
    background: var(--pm-cat-colour, #666666);
    color: #ffffff !important;
}

/* selected entry: no frame, the box is two lines tall instead of one */
.blocks :global(.scratchCategoryMenuItem.categorySelected) {
    background: var(--pm-cat-colour, #666666);
    min-height: calc(1.54rem + 0.43rem);
}

.blocks :global(.scratchCategoryMenuItem:hover) {
    color: #ffffff !important;
    filter: brightness(1.15);
}

/* no icons or colour dots any more, just the name */
.blocks :global(.scratchCategoryItemBubble),
.blocks :global(.scratchCategoryItemIcon) {
    display: none !important;
}

.blocks :global(.scratchCategoryMenuItemLabel) {
    flex: 1 1 auto;
    min-width: 0;
    margin: 0;
    padding: 0;
    font-size: 0.7rem;
    font-weight: 600;
    line-height: 1.1;
    text-align: left;
    color: #ffffff !important;
    /* thin black outline around the white letters: small blurred shadows on four sides
       plus a soft halo are anti-aliased and look smoother than -webkit-text-stroke */
    text-shadow: -0.7px 0 0.6px #000000, 0.7px 0 0.6px #000000, 0 -0.7px 0.6px #000000,
        0 0.7px 0.6px #000000, 0 0 1px #000000;
    /* one line, cut when too long */
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* selected: up to two lines */
.blocks :global(.scratchCategoryMenuItem.categorySelected .scratchCategoryMenuItemLabel) {
    white-space: normal;
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
}
`);

/* ------------------------------------------------------------------ */
/* 12. Remove the "Back to Home" button from the menu bar              */
/* ------------------------------------------------------------------ */
// The button is a link to the live PenguinMod website (https://penguinmod.com) in the
// editor's top bar. The desktop app has no home page, so the button is removed.
// To undo this section, delete it from this script (or ask Claude to reverse it).
const MB = 'src/components/menu-bar/menu-bar.jsx';
const homeButtonLines = [
    '                    <div className={styles.menuBarItem}>',
    '                        <a',
    '                            className={styles.feedbackLink}',
    '                            href="https://penguinmod.com"',
    '                            rel="noopener noreferrer"',
    '                            target="_blank"',
    '                        >',
    '                            <Button className={styles.feedbackButton}>',
    '                                <FormattedMessage',
    '                                    defaultMessage="Back to Home"',
    '                                    description="Button to go back to the home page"',
    '                                    id="pm.backToHomeButton"',
    '                                />',
    '                            </Button>',
    '                        </a>',
    '                    </div>',
    ''
];
replaceOnce(MB, homeButtonLines.join('\n'), '');
// Leave a marker so the change is easy to find in the GUI source.
replaceOnce(MB,
    '                    <div className={styles.menuBarItem}>\n                        {this.props.isShowingProject && this.props.canEditTitle ?\n                            (<ShareButton',
    '                    {/* ' + MARKER + ': "Back to Home" button removed */}\n' +
    '                    <div className={styles.menuBarItem}>\n                        {this.props.isShowingProject && this.props.canEditTitle ?\n                            (<ShareButton');

/* ------------------------------------------------------------------ */
/* 13. Re-ordering the category boxes: the box itself slides           */
/* ------------------------------------------------------------------ */
// The "Draggable Categories in Block Palette" addon (hold a category box for half a second,
// then drag) normally fades the box you hold to 50%, shows a floating copy with a shadow
// under the mouse, and opens a blank gap where it would land. Here the box you hold is
// instead moved up and down with the mouse (it stays in its column), and the other boxes
// slide out of its way as it passes them, so there is no copy, no fading and no gap.
// The hold-to-start, the saved order and the refresh after the drop are the addon's own.
// To undo this section, delete it from this script (or ask Claude to reverse it).
const CD = 'src/addons/addons/toolbox-category-drag/userscript.js';

// 13a. Start the new drag instead of the old one (one-line edit of the 500 ms hold handler).
replaceOnce(CD,
    'setTimeout(() => initDragDroper(e, blocklyToolboxDiv), 500)',
    'setTimeout(() => pmInitSlideDrag(e, blocklyToolboxDiv), 500)');

// 13b. The new drag. Inserted next to the old function (which stays in the file, unused),
//      so it can use the addon's own helpers (extractCategoryID, compileNewOrder, ...).
replaceOnce(CD,
    '    function activateBlocklyListener() {',
`    // ${MARKER}: the held category box slides up and down, the others slide out of its way
    function pmInitSlideDrag(clickEvent, blocklyToolboxDiv) {
        const rowSelector = 'div[class*="scratchCategoryMenuRow"]';
        const draggedCat = clickEvent.target.closest('div[class="scratchCategoryMenuRow"]');
        if (!draggedCat) return;

        const rows = Array.from(blocklyToolboxDiv.querySelectorAll(rowSelector));
        const from = rows.indexOf(draggedCat);
        if (from === -1) return;
        const last = rows.length - 1;

        // Positions are measured once, in "scrolled content" coordinates, before anything moves.
        const contentOrigin = () => blocklyToolboxDiv.getBoundingClientRect().top - blocklyToolboxDiv.scrollTop;
        const tops = rows.map(row => row.getBoundingClientRect().top - contentOrigin());
        const heights = rows.map(row => row.getBoundingClientRect().height);
        // how far the boxes below move when this box is taken out: its height plus the gap
        const pitch = rows.map((row, i) => i < last ?
            tops[i + 1] - tops[i] :
            heights[i] + (parseFloat(getComputedStyle(row).marginBottom) || 0));
        const minShift = tops[0] - tops[from];
        const maxShift = tops[last] + heights[last] - tops[from] - heights[from];

        const startY = clickEvent.clientY - contentOrigin();
        let mouseY = clickEvent.clientY;
        let target = from;
        let frame = 0;

        draggedCat.style.position = 'relative';
        draggedCat.style.zIndex = '2';
        for (const row of rows) {
            if (row !== draggedCat) row.style.transition = 'transform 0.15s ease';
        }

        const tick = () => {
            // scroll the menu when the box is held near its top or bottom edge
            const bounds = blocklyToolboxDiv.getBoundingClientRect();
            if (mouseY < bounds.top + 40) {
                blocklyToolboxDiv.scrollTop -= 6;
            } else if (mouseY > bounds.bottom - 40) {
                blocklyToolboxDiv.scrollTop += 6;
            }

            // the held box follows the mouse up and down, but stays inside the menu
            const shift = Math.max(minShift, Math.min(maxShift, mouseY - contentOrigin() - startY));
            draggedCat.style.transform = 'translateY(' + shift + 'px)';

            // its new place = how many other boxes have their middle above its middle
            const middle = tops[from] + heights[from] / 2 + shift;
            let place = 0;
            rows.forEach((row, i) => {
                if (i !== from && tops[i] + heights[i] / 2 < middle) place++;
            });
            // the box can only reach the middle of the first / last box, not pass it, so
            // being pushed against the top or bottom end of the menu means the first / last place
            if (shift <= minShift + 1) place = 0;
            if (shift >= maxShift - 1) place = last;
            target = place;

            // boxes it has passed slide by one box height, the others stay where they are
            rows.forEach((row, i) => {
                if (i === from) return;
                let move = 0;
                if (target > from && i > from && i <= target) move = -pitch[from];
                if (target < from && i >= target && i < from) move = pitch[from];
                row.style.transform = move ? 'translateY(' + move + 'px)' : '';
            });

            frame = requestAnimationFrame(tick);
        };

        const onMouseMove = moveEvent => {
            mouseY = moveEvent.clientY;
        };
        const stopSelecting = selectEvent => selectEvent.preventDefault();
        const onMouseUp = () => {
            cancelAnimationFrame(frame);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('selectstart', stopSelecting);
            for (const row of rows) {
                row.style.transition = '';
                row.style.transform = '';
            }
            draggedCat.style.position = '';
            draggedCat.style.zIndex = '';

            // moved to a new place: save the new order and rebuild the menu (as the addon does)
            if (target !== from) {
                const id = extractCategoryID(draggedCat.firstChild.classList);
                draggedCat.parentNode.insertBefore(draggedCat, target > from ? rows[target].nextSibling : rows[target]);
                compileNewOrder(blocklyToolboxDiv.querySelectorAll(rowSelector));
                vm.runtime.emitProjectChanged(); // the project now has unsaved changes
                setTimeout(() => {
                    forceRefreshToolbox();
                    if (id) ScratchBlocks.mainWorkspace.toolbox_.setSelectedCategoryById(id);
                }, 100);
            }
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('selectstart', stopSelecting);
        frame = requestAnimationFrame(tick);
    }

    // ${MARKER}: the order is stored in a comment on the Stage; keep that comment up to date
    function pmUpdateOrderingComment() {
        const stageTarget = vm.runtime.getTargetForStage();
        if (!stageTarget) return;
        for (const comment of Object.values(stageTarget.comments)) {
            if (!comment.text.endsWith(COMMENT_TRAPPER_ID)) continue;
            const lines = comment.text.split("\\n");
            const dataLine = lines.findIndex(line => line.endsWith(COMMENT_TRAPPER_ID));
            lines[dataLine] = JSON.stringify(categoryOrdering) + COMMENT_TRAPPER_ID;
            comment.text = lines.join("\\n");
            return;
        }
    }

    // ${MARKER}: opening a project that has no stored order must not keep the previous project's
    // order. The addon sorts the menu's XML in place, so rebuild the menu from the editor's own
    // untouched copy of it (the same call the editor makes when its toolbox changes).
    vm.runtime.on("PROJECT_LOADED", () => {
        if (categoryOrdering === undefined || findOrderingComment(true)) return;
        categoryOrdering = undefined;
        setTimeout(() => {
            const workspace = ScratchBlocks.getMainWorkspace();
            const toolboxXML = ReduxStore.getState().scratchGui.toolbox.toolboxXML;
            if (workspace && toolboxXML) workspace.updateToolbox(toolboxXML);
        }, 100);
    });

    function activateBlocklyListener() {`);

// 13c. Saving the order. The addon writes its settings comment into the project only the
//      first time and then never updates it, so a second re-ordering was not saved. Update
//      the existing comment instead of skipping (one-line edit; the comment is written
//      into the project when it is saved, as before).
replaceOnce(CD,
    'if (findOrderingComment()) return;',
    'if (findOrderingComment()) { pmUpdateOrderingComment(); return; }');

console.log('Stage layout patch applied successfully.');

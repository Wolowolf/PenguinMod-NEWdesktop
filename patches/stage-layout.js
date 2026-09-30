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
    '    const stageDimensions = getStageDimensions(stageSize, customStageSize, isFullScreen);\n' +
    '    const minWidth = getMinWidth(stageSize);\n',
    '    // Player-only mode keeps its normal size; the editor uses the fixed-size box\n' +
    '    const boxWidth = isPlayerOnly ? null : stageBoxWidth;\n' +
    '    const stageDimensions = getStageDimensions(stageSize, customStageSize, isFullScreen, boxWidth);\n' +
    '    const minWidth = getMinWidth(stageSize, boxWidth);\n');

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

import {DEFAULT_STAGE_BOX_WIDTH, getEffectiveStageBoxWidth} from '../../lib/screen-utils';
import {setStageBoxWidth, saveStageBoxWidth} from '../../reducers/stage-size';

import styles from './stage-resize-handle.css';

class StageResizeHandle extends React.Component {
    constructor (props) {
        super(props);
        this.state = {active: false};
        this.dragging = false;
        this.startX = 0;
        this.startWidth = DEFAULT_STAGE_BOX_WIDTH;
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
        this.applyWidth(this.startWidth + delta);
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
    isRtl: PropTypes.bool,
    onChange: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
    boxWidth: state.scratchGui.stageSize.boxWidth
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

console.log('Stage layout patch applied successfully.');

// PenguinMod Desktop (patches/stage-layout.js section 21): the "FPS" and "Stage Size" rows of the
// Settings window. Copied to src/components/tw-settings-modal/ and used by settings-modal.jsx.
import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import {FormattedMessage} from 'react-intl';
import Input from '../forms/input.jsx';
import BufferedInputHOC from '../forms/buffered-input-hoc.jsx';
import styles from './settings-modal.css';

const BufferedInput = BufferedInputHOC(Input);

// FPS: a number box (the container keeps it between 1 and 250) and a note that is always shown.
const FramerateSetting = ({framerate, onChange}) => (
    <div className={styles.setting}>
        <div className={styles.label}>
            <FormattedMessage
                defaultMessage="FPS:"
                description="Frames per second setting"
                id="pmdesktop.settingsModal.fps"
            />
            <BufferedInput
                className={styles.customStageSizeInput}
                type="number"
                min="1"
                max="250"
                step="1"
                value={framerate}
                onSubmit={onChange}
            />
        </div>
        <div className={styles.pmSettingNote}>
            <FormattedMessage
                defaultMessage="Runs scripts {framerate, plural, one {# time} other {# times}} per second."
                description="Note under the frames per second setting"
                id="pmdesktop.settingsModal.fpsNote"
                values={{framerate}}
            />
            <br />
            <FormattedMessage
                defaultMessage="⚠ It can break your project if you don’t use DELTA TIMING in your game calculations. ⚠"
                description="Warning under the frames per second setting"
                id="pmdesktop.settingsModal.fpsWarning"
            />
        </div>
    </div>
);
FramerateSetting.propTypes = {
    framerate: PropTypes.number,
    onChange: PropTypes.func
};

const RATIO_KEY = 'pmdesktop:stageRatioLocked';
const loadRatioLocked = () => {
    try {
        return localStorage.getItem(RATIO_KEY) !== 'false';
    } catch (e) {
        return true;
    }
};
// A whole number from 1 to 4096, or null for anything else.
const toSize = value => {
    const size = Math.round(Number(value));
    return size >= 1 ? Math.min(4096, size) : null;
};

const ChainIcon = ({linked}) => (
    <svg
        width="24"
        height="14"
        viewBox="0 0 24 14"
        aria-hidden="true"
    >
        <g
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
        >
            {linked ? (
                <React.Fragment>
                    <rect
                        x="1.5"
                        y="3"
                        width="12"
                        height="8"
                        rx="4"
                    />
                    <rect
                        x="10.5"
                        y="3"
                        width="12"
                        height="8"
                        rx="4"
                    />
                </React.Fragment>
            ) : (
                <React.Fragment>
                    <rect
                        x="1"
                        y="3"
                        width="9"
                        height="8"
                        rx="4"
                    />
                    <rect
                        x="14"
                        y="3"
                        width="9"
                        height="8"
                        rx="4"
                    />
                </React.Fragment>
            )}
        </g>
    </svg>
);
ChainIcon.propTypes = {
    linked: PropTypes.bool
};

// Stage size: width [chain link] height. While the link is on, changing one side changes the other
// so the width : height ratio stays the same. The link state is remembered between launches.
class StageSizeSetting extends React.Component {
    constructor (props) {
        super(props);
        this.handleWidthChange = this.handleWidthChange.bind(this);
        this.handleHeightChange = this.handleHeightChange.bind(this);
        this.handleToggleRatio = this.handleToggleRatio.bind(this);
        this.state = {
            ratioLocked: loadRatioLocked(),
            // the ratio is taken once (not from the rounded sizes after each change), so it doesn't drift
            ratio: props.width / props.height
        };
    }
    handleToggleRatio () {
        const ratioLocked = !this.state.ratioLocked;
        try {
            localStorage.setItem(RATIO_KEY, String(ratioLocked));
        } catch (e) {
            // not remembered, still works
        }
        this.setState({
            ratioLocked,
            ratio: this.props.width / this.props.height
        });
    }
    handleWidthChange (value) {
        const width = toSize(value);
        if (width === null) return;
        const height = this.state.ratioLocked ? toSize(width / this.state.ratio) : this.props.height;
        this.props.onChange(width, height || 1);
    }
    handleHeightChange (value) {
        const height = toSize(value);
        if (height === null) return;
        const width = this.state.ratioLocked ? toSize(height * this.state.ratio) : this.props.width;
        this.props.onChange(width || 1, height);
    }
    render () {
        const locked = this.state.ratioLocked;
        return (
            <div className={styles.setting}>
                <div className={classNames(styles.label, styles.customStageSizeContainer)}>
                    <FormattedMessage
                        defaultMessage="Stage Size:"
                        description="Stage Size option"
                        id="pm.settingsModal.stageSize"
                    />
                    <BufferedInput
                        className={styles.customStageSizeInput}
                        type="number"
                        min="1"
                        max="4096"
                        step="1"
                        value={this.props.width}
                        onSubmit={this.handleWidthChange}
                    />
                    <button
                        className={classNames(styles.pmRatioLink, {
                            [styles.pmRatioLinkOn]: locked
                        })}
                        title={locked ?
                            'Keeping the ratio (click to change width and height separately)' :
                            'Width and height change separately (click to keep the ratio)'}
                        aria-pressed={locked}
                        onClick={this.handleToggleRatio}
                    >
                        <ChainIcon linked={locked} />
                    </button>
                    <BufferedInput
                        className={styles.customStageSizeInput}
                        type="number"
                        min="1"
                        max="4096"
                        step="1"
                        value={this.props.height}
                        onSubmit={this.handleHeightChange}
                    />
                </div>
            </div>
        );
    }
}
StageSizeSetting.propTypes = {
    width: PropTypes.number,
    height: PropTypes.number,
    onChange: PropTypes.func
};

export {
    FramerateSetting,
    StageSizeSetting
};

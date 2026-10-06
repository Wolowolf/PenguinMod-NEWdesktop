// PenguinMod Desktop (patches/stage-layout.js section 21): replaces upstream's
// src/containers/tw-settings-modal.jsx. High quality pen, infinite clones, remove fencing, remove
// miscellaneous limits and dangerous optimizations are always on (in the VM) and interpolation is
// removed, so their switches are gone; FPS is a number box and the stage size has no presets.
import PropTypes from 'prop-types';
import React from 'react';
import {injectIntl, intlShape} from 'react-intl';
import bindAll from 'lodash.bindall';
import {connect} from 'react-redux';
import {closeSettingsModal} from '../reducers/modals';
import SettingsModalComponent from '../components/tw-settings-modal/settings-modal.jsx';

class UsernameModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleFramerateChange',
            'handleWarpTimerChange',
            'handleStageSizeChange',
            'handleDisableCompilerChange',
            'handleStoreProjectOptions',
            'handleDisableOffscreenRenderingChange',
            'handleDisableDirectionClamping'
        ]);
    }
    handleFramerateChange (value) {
        const framerate = Number(value);
        // 1 to 250 times per second (the VM caps it at 250 too); anything else is ignored
        if (framerate >= 1) {
            this.props.vm.setFramerate(Math.min(250, framerate));
        }
    }
    handleDisableOffscreenRenderingChange (e) {
        this.props.vm.setRuntimeOptions({
            disableOffscreenRendering: e.target.checked
        });
    }
    handleDisableDirectionClamping (e) {
        this.props.vm.setRuntimeOptions({
            disableDirectionClamping: e.target.checked
        });
    }
    handleWarpTimerChange (e) {
        this.props.vm.setCompilerOptions({
            warpTimer: e.target.checked
        });
    }
    handleDisableCompilerChange (e) {
        this.props.vm.setCompilerOptions({
            enabled: !e.target.checked
        });
    }
    handleStageSizeChange (width, height) {
        this.props.vm.setStageSize(width, height);
    }
    handleStoreProjectOptions () {
        this.props.vm.storeProjectOptions();
    }
    render () {
        const {
            /* eslint-disable no-unused-vars */
            onClose,
            vm,
            /* eslint-enable no-unused-vars */
            ...props
        } = this.props;
        return (
            <SettingsModalComponent
                onClose={this.props.onClose}
                onFramerateChange={this.handleFramerateChange}
                onDisableOffscreenRenderingChange={this.handleDisableOffscreenRenderingChange}
                onDisableDirectionClamping={this.handleDisableDirectionClamping}
                onWarpTimerChange={this.handleWarpTimerChange}
                onStageSizeChange={this.handleStageSizeChange}
                onDisableCompilerChange={this.handleDisableCompilerChange}
                stageWidth={this.props.customStageSize.width}
                stageHeight={this.props.customStageSize.height}
                onStoreProjectOptions={this.handleStoreProjectOptions}
                {...props}
            />
        );
    }
}

UsernameModal.propTypes = {
    intl: intlShape,
    onClose: PropTypes.func,
    vm: PropTypes.shape({
        setFramerate: PropTypes.func,
        setCompilerOptions: PropTypes.func,
        setRuntimeOptions: PropTypes.func,
        setStageSize: PropTypes.func,
        storeProjectOptions: PropTypes.func
    }),
    isEmbedded: PropTypes.bool,
    framerate: PropTypes.number,
    disableOffscreenRendering: PropTypes.bool,
    disableDirectionClamping: PropTypes.bool,
    warpTimer: PropTypes.bool,
    customStageSize: PropTypes.shape({
        width: PropTypes.number,
        height: PropTypes.number
    }),
    disableCompiler: PropTypes.bool
};

const mapStateToProps = state => ({
    vm: state.scratchGui.vm,
    isEmbedded: state.scratchGui.mode.isEmbedded,
    framerate: state.scratchGui.tw.framerate,
    disableOffscreenRendering: state.scratchGui.tw.runtimeOptions.disableOffscreenRendering,
    disableDirectionClamping: state.scratchGui.tw.runtimeOptions.disableDirectionClamping,
    warpTimer: state.scratchGui.tw.compilerOptions.warpTimer,
    customStageSize: state.scratchGui.customStageSize,
    disableCompiler: !state.scratchGui.tw.compilerOptions.enabled
});

const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closeSettingsModal())
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(UsernameModal));

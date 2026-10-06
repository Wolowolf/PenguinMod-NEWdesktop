// PenguinMod Desktop (patch section 20): the sound editor's waveform, drawn like the sound library's
// (pm-waveforms.js): one column per screen pixel from the lowest to the highest sample, coloured by
// how bright that moment sounds (its spectral centroid) from blue (low) over green and yellow to red
// (high). As only one sound is shown and it is large, it is drawn at the screen's full resolution and
// also shows the loudness (RMS) of each column as a darker core.
import React from 'react';
import PropTypes from 'prop-types';
import {analyseWave, paintWave} from '../../lib/pm-waveforms.js';

class PMSoundWave extends React.PureComponent {
    constructor (props) {
        super(props);
        this.setCanvas = this.setCanvas.bind(this);
        this.scheduleDraw = this.scheduleDraw.bind(this);
        this.draw = this.draw.bind(this);
        this.canvas = null;
        this.frame = 0;
        this.wave = null; // the analysed columns, kept while the sound and width stay the same
        this.drawn = null;
    }
    componentDidMount () {
        if (typeof ResizeObserver !== 'undefined' && this.canvas) {
            this.observer = new ResizeObserver(this.scheduleDraw);
            this.observer.observe(this.canvas);
        }
        this.draw();
    }
    componentDidUpdate () {
        this.draw();
    }
    componentWillUnmount () {
        if (this.observer) this.observer.disconnect();
        cancelAnimationFrame(this.frame);
    }
    setCanvas (canvas) {
        this.canvas = canvas;
    }
    // resizing: once per frame at most
    scheduleDraw () {
        cancelAnimationFrame(this.frame);
        this.frame = requestAnimationFrame(this.draw);
    }
    draw () {
        const canvas = this.canvas;
        if (!canvas) return;
        const {samples, sampleRate} = this.props;
        const ratio = window.devicePixelRatio || 1;
        const w = Math.max(1, Math.round(canvas.clientWidth * ratio));
        const h = Math.max(1, Math.round(canvas.clientHeight * ratio));
        const d = this.drawn;
        if (d && d.samples === samples && d.w === w && d.h === h) return;
        if (!this.wave || this.wave.samples !== samples || this.wave.w !== w) {
            const wave = analyseWave([samples], sampleRate, w);
            // each column also reaches its neighbours' peaks: at this resolution a high note's peaks
            // otherwise fall in every other column only, which looks striped
            const min = wave.min.slice();
            const max = wave.max.slice();
            for (let x = 0; x < w; x++) {
                for (let k = Math.max(0, x - 1); k <= Math.min(w - 1, x + 1); k++) {
                    if (wave.min[k] < min[x]) min[x] = wave.min[k];
                    if (wave.max[k] > max[x]) max[x] = wave.max[k];
                }
            }
            this.wave = {min, max, color: wave.color, rms: this.loudness(samples, w), samples, w};
        }
        canvas.width = w;
        canvas.height = h;
        paintWave(this.wave, canvas);
        // the loudness core, inside each column's lowest and highest sample
        const ctx = canvas.getContext('2d');
        const mid = h / 2;
        const amp = (h - 4) / 2;
        const {min, max, rms} = this.wave;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        for (let x = 0; x < w; x++) {
            const top = mid - Math.min(max[x], rms[x]) * amp;
            const bottom = mid - Math.max(min[x], -rms[x]) * amp;
            if (bottom - top >= 1) ctx.fillRect(x, top, 1, bottom - top);
        }
        this.drawn = {samples, w, h};
    }
    // the RMS of each column's samples (the same columns as analyseWave's)
    loudness (samples, columns) {
        const n = samples.length;
        const rms = new Float32Array(columns);
        for (let c = 0; c < columns; c++) {
            const start = Math.floor(c * n / columns);
            const end = Math.min(n, Math.max(start + 1, Math.floor((c + 1) * n / columns)));
            let sum = 0;
            for (let i = start; i < end; i++) sum += samples[i] * samples[i];
            rms[c] = end > start ? Math.sqrt(sum / (end - start)) : 0;
        }
        return rms;
    }
    render () {
        return (
            <canvas
                ref={this.setCanvas}
                style={{display: 'block', width: '100%', aspectRatio: '600 / 160'}}
            />
        );
    }
}

PMSoundWave.propTypes = {
    sampleRate: PropTypes.number.isRequired,
    samples: PropTypes.instanceOf(Float32Array).isRequired
};

export default PMSoundWave;

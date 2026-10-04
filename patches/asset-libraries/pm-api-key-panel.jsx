// PenguinMod Desktop (patch section 16): unlocking a library that needs the user's own API key.
// Shows what the library offers, its limits, how to get a free key (links open in the user's
// browser) and a field to paste it. The key is tested, then kept on this PC (pm-api-keys.js).
import PropTypes from 'prop-types';
import React from 'react';

import styles from './pm-api-key-panel.css';
import {getKey, hasKey, registerOpenverse, setKey, testKey} from '../../lib/pm-api-keys.js';

export const KEY_INFO = {
    pixabay: {
        label: 'Pixabay',
        about: 'Millions of photos, illustrations and vector graphics. Free for commercial use, no credit needed ' +
            '(Pixabay Content License; don\'t resell the files unchanged).',
        limits: 'With your free key: 100 searches a minute, no daily limit.',
        steps: [
            ['Create a free Pixabay account.', 'https://pixabay.com/accounts/register/'],
            ['Log in, then open Pixabay\'s API page. Your key is shown under "Parameters", next to "key (required)".',
                'https://pixabay.com/api/docs/'],
            ['Copy the key and paste it below.']
        ],
        fields: [['key', 'API key', 'e.g. 12345678-0a1b2c3d4e5f6a7b8c9d0e1f2']]
    },
    europeana: {
        label: 'Europeana',
        about: 'Millions of images from European museums, libraries and archives: paintings, photos, maps, posters. ' +
            'Only public domain, CC0 and CC BY are shown; CC BY items are credited automatically.',
        limits: 'With your free key: no limits.',
        steps: [
            ['Request a free API key with your name and email; it arrives by email within a few minutes.',
                'https://pro.europeana.eu/pages/get-api'],
            ['Copy the key from the email and paste it below.']
        ],
        fields: [['key', 'API key', 'e.g. aBcdEfGhi']]
    },
    openverse: {
        label: 'Openverse',
        about: 'Over 800 million openly licensed images (Flickr, Wikimedia, museums, NASA…), Freesound sound effects ' +
            'and Jamendo music. Only CC0, public domain and CC BY; credit lines are added automatically.',
        limits: 'With your free key: 100 searches a minute and 10,000 a day (20 and 200 until you confirm your email).',
        steps: [
            ['Type your email below and press "Get a key": Openverse registers this app for you and sends you an email.'],
            ['Click the link in that email to confirm it (you can already use Openverse before that).'],
            ['Already have a client ID and secret (from Openverse\'s API page)? Paste them in the second part instead.',
                'https://api.openverse.org/v1/#tag/auth']
        ],
        fields: [['clientId', 'Client ID', ''], ['clientSecret', 'Client secret', '']]
    }
};

const open = url => {
    if (window.PMDesktop && window.PMDesktop.openExternal) window.PMDesktop.openExternal(url);
    else window.open(url, '_blank');
};

class ApiKeyPanel extends React.Component {
    constructor (props) {
        super(props);
        const saved = getKey(props.source) || {};
        const values = {};
        for (const [name] of KEY_INFO[props.source].fields) values[name] = saved[name] || '';
        this.state = {values, email: '', busy: false, error: null, done: null};
    }
    async handleSave () {
        const {source} = this.props;
        const values = {};
        for (const [name] of KEY_INFO[source].fields) values[name] = this.state.values[name].trim();
        if (Object.values(values).some(v => !v)) {
            this.setState({error: 'Please fill in every field.'});
            return;
        }
        this.setState({busy: true, error: null});
        try {
            await testKey(source, values);
            if (source !== 'openverse') setKey(source, values);
            this.props.onUnlocked();
        } catch (err) {
            if (!this.unmounted) this.setState({busy: false, error: err.message});
        }
    }
    async handleRegister () {
        const email = this.state.email.trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            this.setState({error: 'Please type a valid email address.'});
            return;
        }
        this.setState({busy: true, error: null});
        try {
            await registerOpenverse(email);
            if (!this.unmounted) this.setState({busy: false, done: email});
        } catch (err) {
            if (!this.unmounted) this.setState({busy: false, error: `Registration failed: ${err.message}`});
        }
    }
    componentWillUnmount () {
        this.unmounted = true;
    }
    renderFields () {
        const info = KEY_INFO[this.props.source];
        return (
            <div className={styles.fields}>
                {info.fields.map(([name, label, placeholder]) => (
                    <label className={styles.field} key={name}>
                        <span>{label}</span>
                        <input
                            className={styles.input}
                            type={name === 'clientSecret' ? 'password' : 'text'}
                            value={this.state.values[name]}
                            placeholder={placeholder}
                            spellCheck={false}
                            onChange={e => this.setState({values: Object.assign({}, this.state.values, {[name]: e.target.value})})}
                            onKeyDown={e => e.key === 'Enter' && this.handleSave()}
                        />
                    </label>
                ))}
                <button className={styles.primary} disabled={this.state.busy} onClick={() => this.handleSave()}>
                    {this.state.busy ? 'Checking…' : 'Save and unlock'}
                </button>
            </div>
        );
    }
    render () {
        const {source, editing, onCancel} = this.props;
        const info = KEY_INFO[source];
        const {error, done, busy, email} = this.state;
        return (
            <div className={styles.panel}>
                <h2 className={styles.title}>{editing ? `${info.label}: change your key` : `Unlock ${info.label}`}</h2>
                <p className={styles.about}>{info.about}</p>
                <p className={styles.limits}>{info.limits}</p>
                <ol className={styles.steps}>
                    {info.steps.map(([text, url], i) => (
                        <li key={i}>
                            {text}
                            {url && <button className={styles.link} onClick={() => open(url)}>{'Open the page ↗'}</button>}
                        </li>
                    ))}
                </ol>
                {source === 'openverse' && !done && (
                    <div className={styles.box}>
                        <h3 className={styles.subtitle}>{'Get a key here'}</h3>
                        <div className={styles.fields}>
                            <label className={styles.field}>
                                <span>{'Your email'}</span>
                                <input className={styles.input} type="email" value={email} placeholder="you@example.com"
                                    onChange={e => this.setState({email: e.target.value})}
                                    onKeyDown={e => e.key === 'Enter' && this.handleRegister()} />
                            </label>
                            <button className={styles.primary} disabled={busy} onClick={() => this.handleRegister()}>
                                {busy ? 'Registering…' : 'Get a key'}
                            </button>
                        </div>
                        <p className={styles.note}>{'Your email is sent only to Openverse (WordPress.org), to register your key.'}</p>
                    </div>
                )}
                {done && (
                    <div className={styles.success}>
                        <p>{`Done! Openverse sent an email to ${done}. Click the link in it to get the full limits.`}</p>
                        <p>{'Your client ID and secret are saved on this PC. Openverse works right away.'}</p>
                        <button className={styles.primary} onClick={() => this.props.onUnlocked()}>{'Start using Openverse'}</button>
                    </div>
                )}
                {!done && (
                    <div className={styles.box}>
                        {source === 'openverse' && <h3 className={styles.subtitle}>{'I already have a client ID and secret'}</h3>}
                        {this.renderFields()}
                    </div>
                )}
                {error && <div className={styles.error}>{error}</div>}
                <p className={styles.note}>{'Your key is saved only on this PC, never in your projects.'}</p>
                {editing && (
                    <div className={styles.actions}>
                        <button className={styles.secondary} onClick={onCancel}>{'Cancel'}</button>
                        {hasKey(source) && (
                            <button className={styles.danger} onClick={() => {
                                setKey(source, null);
                                this.props.onRemoved();
                            }}>{'Remove my key'}</button>
                        )}
                    </div>
                )}
            </div>
        );
    }
}

ApiKeyPanel.propTypes = {
    editing: PropTypes.bool,
    onCancel: PropTypes.func,
    onRemoved: PropTypes.func,
    onUnlocked: PropTypes.func.isRequired,
    source: PropTypes.oneOf(['pixabay', 'europeana', 'openverse']).isRequired
};

export default ApiKeyPanel;

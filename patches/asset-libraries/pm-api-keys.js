// PenguinMod Desktop (patch section 16): the user's own API keys for the libraries that need one
// (Pixabay, Europeana, Openverse). They are kept in this app's local storage on the user's PC, are
// never put into projects, and can be changed or removed in the library.

const STORE = 'pmdesktop:apiKeys';
const OPENVERSE = 'https://api.openverse.org/v1/';

const read = () => {
    try {
        return JSON.parse(localStorage.getItem(STORE)) || {};
    } catch (e) {
        return {};
    }
};
const write = all => {
    try {
        localStorage.setItem(STORE, JSON.stringify(all));
    } catch (e) { /* keys only kept until the app closes */ }
};

export const getKey = source => read()[source] || null;
export const setKey = (source, data) => {
    const all = read();
    if (data) all[source] = data;
    else delete all[source];
    write(all);
};
export const hasKey = source => {
    const k = getKey(source);
    return !!(k && (source === 'openverse' ? k.clientId && k.clientSecret : k.key));
};

// ---- Openverse: register an app (with the user's email) and get access tokens -----------------

export const registerOpenverse = async email => {
    const name = `PenguinMod Desktop ${Math.random().toString(36)
        .slice(2, 8)}`;
    const res = await fetch(`${OPENVERSE}auth_tokens/register/`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name, description: 'Asset library of a PenguinMod Desktop editor (personal use).', email})
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.client_id) {
        throw new Error(json.detail || Object.values(json).flat().join(' ') || `Openverse answered HTTP ${res.status}.`);
    }
    setKey('openverse', {clientId: json.client_id, clientSecret: json.client_secret, name, email});
    return json;
};

// A valid access token (fetched again when it has run out).
export const openverseToken = async () => {
    const k = getKey('openverse');
    if (!k || !k.clientId) throw new Error('Openverse needs your client ID and secret.');
    if (k.token && k.expires > Date.now() + 60000) return k.token;
    const res = await fetch(`${OPENVERSE}auth_tokens/token/`, {
        method: 'POST',
        body: new URLSearchParams({client_id: k.clientId, client_secret: k.clientSecret, grant_type: 'client_credentials'})
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.access_token) throw new Error('Openverse did not accept this client ID and secret.');
    setKey('openverse', Object.assign({}, k, {token: json.access_token, expires: Date.now() + (json.expires_in || 3600) * 1000}));
    return json.access_token;
};

// ---- checking a key before it is saved -----------------------------------------------------------

export const testKey = async (source, data) => {
    if (source === 'pixabay') {
        const res = await fetch(`https://pixabay.com/api/?${new URLSearchParams({key: data.key, q: 'cat', per_page: '3'})}`);
        if (res.status === 400 || res.status === 401) throw new Error('Pixabay does not accept this key.');
        if (!res.ok) throw new Error(`Pixabay answered HTTP ${res.status}.`);
        return;
    }
    if (source === 'europeana') {
        const res = await fetch(`https://api.europeana.eu/record/v2/search.json?${new URLSearchParams({wskey: data.key, query: 'cat', rows: '1'})}`);
        if (res.status === 400 || res.status === 401) throw new Error('Europeana does not accept this key.');
        if (!res.ok) throw new Error(`Europeana answered HTTP ${res.status}.`);
        return;
    }
    if (source === 'openverse') {
        const old = getKey('openverse');
        setKey('openverse', {clientId: data.clientId, clientSecret: data.clientSecret});
        try {
            await openverseToken();
        } catch (err) {
            setKey('openverse', old);
            throw err;
        }
    }
};

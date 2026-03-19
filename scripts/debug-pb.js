// Test: what field format works for PocketBase v0.26?
const PB_URL = 'https://db.mkg.vn';

async function api(path, method, body, token) {
    const h = { 'Content-Type': 'application/json' };
    if (token) h.Authorization = 'Bearer ' + token;
    const r = await fetch(PB_URL + path, {
        method: method || 'GET', headers: h, body: body ? JSON.stringify(body) : null,
    });
    const t = await r.text();
    let d; try { d = JSON.parse(t); } catch (_) { d = { raw: t }; }
    return { ok: r.ok, status: r.status, data: d };
}

async function main() {
    const a = await api('/api/collections/_superusers/auth-with-password', 'POST', {
        identity: 'quy28181818@gmail.com', password: '@Mkg201444',
    });
    const tk = a.data.token;
    console.log('Logged in');

    // Get task_users collection to understand existing fields structure
    const col = await api('/api/collections/task_users', 'GET', null, tk);
    const existingFields = col.data.fields || [];
    console.log('Existing fields count:', existingFields.length);

    // Print the FULL structure of one field to understand format
    if (existingFields[0]) {
        console.log('Sample field structure:', JSON.stringify(existingFields[0], null, 2));
    }

    // Try patching with minimal custom field - no id, no extra props
    const p = await api('/api/collections/task_users', 'PATCH', {
        fields: [
            ...existingFields,
            { name: 'name', type: 'text' },
        ],
    }, tk);

    console.log('Patch result:', p.ok);
    if (!p.ok) {
        console.log('Error:', JSON.stringify(p.data).slice(0, 500));
    } else {
        console.log('New fields:', p.data.fields?.map(f => f.name).join(', '));
    }
}

main().catch(e => { console.error(e.message); process.exit(1); });

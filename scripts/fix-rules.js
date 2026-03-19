const PB_URL = 'https://db.mkg.vn';

async function api(path, method, body, token) {
    const h = { 'Content-Type': 'application/json' };
    if (token) h.Authorization = 'Bearer ' + token;
    const r = await fetch(PB_URL + path, {
        method: method || 'GET', headers: h, body: body ? JSON.stringify(body) : null,
    });
    const txt = await r.text();
    try { return { ok: r.ok, data: JSON.parse(txt) }; }
    catch (_) { return { ok: r.ok, data: { raw: txt } }; }
}

async function main() {
    const a = await api('/api/collections/_superusers/auth-with-password', 'POST', {
        identity: 'quy28181818@gmail.com', password: '@Mkg201444',
    });
    const tk = a.data.token;
    const authRule = '@request.auth.id != ""';

    const collections = ['tasks', 'task_comments'];
    for (const name of collections) {
        const r = await api('/api/collections/' + name, 'PATCH', {
            listRule: authRule,
            viewRule: authRule,
            createRule: authRule,
            updateRule: authRule,
            deleteRule: authRule,
        }, tk);
        console.log(name + ' rules:', r.ok ? 'OK' : 'FAIL ' + JSON.stringify(r.data).slice(0, 100));
    }

    // task_users: authenticated can list/view (but NOT create/update/delete via API)
    const r3 = await api('/api/collections/task_users', 'PATCH', {
        listRule: authRule,
        viewRule: authRule,
    }, tk);
    console.log('task_users list/view rules:', r3.ok ? 'OK' : 'FAIL ' + JSON.stringify(r3.data).slice(0, 100));
}

main().catch(e => { console.error(e.message); process.exit(1); });

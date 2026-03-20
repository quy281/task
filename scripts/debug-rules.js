const PB_URL = 'https://db.mkg.vn';

async function api(path, method, body, token) {
    const h = { 'Content-Type': 'application/json' };
    if (token) h.Authorization = 'Bearer ' + token;
    const r = await fetch(PB_URL + path, {
        method: method || 'GET', headers: h, body: body ? JSON.stringify(body) : null,
    });
    const txt = await r.text();
    try { return { ok: r.ok, status: r.status, data: JSON.parse(txt) }; }
    catch (_) { return { ok: r.ok, status: r.status, data: { raw: txt } }; }
}

async function main() {
    // 1. Login as admin user (task_users collection)
    const login = await api('/api/collections/task_users/auth-with-password', 'POST', {
        identity: 'admin@mkg.vn', password: 'mkg20144',
    });
    console.log('Login:', login.ok ? 'OK token=' + login.data.token?.slice(0, 30) + '...' : 'FAIL ' + JSON.stringify(login.data));

    const userToken = login.data.token;

    // 2. Test GET tasks with user token
    const t1 = await api('/api/collections/tasks/records?sort=-created', 'GET', null, userToken);
    console.log('GET tasks (user token):', t1.ok ? 'OK count=' + t1.data.totalItems : 'FAIL ' + t1.status + ' ' + JSON.stringify(t1.data));

    // 3. Test GET tasks without any token
    const t2 = await api('/api/collections/tasks/records?sort=-created', 'GET', null, null);
    console.log('GET tasks (no token):', t2.ok ? 'OK count=' + t2.data.totalItems : 'FAIL ' + t2.status);

    // 4. Check collection rules
    const superLogin = await api('/api/collections/_superusers/auth-with-password', 'POST', {
        identity: 'quy28181818@gmail.com', password: '@Mkg201444',
    });
    const sk = superLogin.data.token;

    const colInfo = await api('/api/collections/tasks', 'GET', null, sk);
    console.log('tasks listRule:', JSON.stringify(colInfo.data.listRule));
    console.log('tasks createRule:', JSON.stringify(colInfo.data.createRule));

    // 5. Try with empty listRule (public access)
    const patch = await api('/api/collections/tasks', 'PATCH', {
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
    }, sk);
    console.log('Set empty rules:', patch.ok ? 'OK' : 'FAIL ' + JSON.stringify(patch.data).slice(0, 100));

    // 6. Test GET tasks again after setting empty rules
    const t3 = await api('/api/collections/tasks/records?sort=-created', 'GET', null, userToken);
    console.log('GET tasks after empty rules:', t3.ok ? 'OK count=' + t3.data.totalItems : 'FAIL ' + t3.status + ' ' + JSON.stringify(t3.data).slice(0, 100));
}

main().catch(e => { console.error(e.message); process.exit(1); });

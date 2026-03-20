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
    // Login as superuser
    const a = await api('/api/collections/_superusers/auth-with-password', 'POST', {
        identity: 'quy28181818@gmail.com', password: '@Mkg201444',
    });
    if (!a.ok) { console.error('Super login failed:', a.data); return; }
    const tk = a.data.token;
    console.log('Superuser logged in');

    // Find users
    const users = await api('/api/collections/task_users/records?perPage=50', 'GET', null, tk);
    console.log('All users:', users.data.items?.map(u => u.email + ' (' + u.name + ')'));

    const PASSWORD_MAP = {
        'admin@mkg.vn': 'mkg20144',
        'thuyle@mkg.vn': 'mkg20266',
    };

    for (const u of (users.data.items || [])) {
        const newPass = PASSWORD_MAP[u.email];
        if (!newPass) continue;

        const r = await api('/api/collections/task_users/records/' + u.id, 'PATCH', {
            password: newPass,
            passwordConfirm: newPass,
        }, tk);
        console.log(u.email, r.ok ? '✅ password updated' : '❌ FAIL: ' + JSON.stringify(r.data).slice(0, 200));
    }

    // Verify logins
    console.log('\n--- Verify logins ---');
    const t1 = await api('/api/collections/task_users/auth-with-password', 'POST', {
        identity: 'admin@mkg.vn', password: 'mkg20144',
    });
    console.log('admin:', t1.ok ? '✅ OK' : '❌ FAIL');

    const t2 = await api('/api/collections/task_users/auth-with-password', 'POST', {
        identity: 'thuyle@mkg.vn', password: 'mkg20266',
    });
    console.log('thuyle:', t2.ok ? '✅ OK' : '❌ FAIL');
}

main().catch(e => { console.error(e.message); process.exit(1); });

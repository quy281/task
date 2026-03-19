// Create task_users bare, then patch fields
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

    // Step 1: Create bare task_users
    const r1 = await api('/api/collections', 'POST', {
        name: 'task_users',
        type: 'auth',
    }, tk);
    if (!r1.ok) {
        console.error('Create failed:', JSON.stringify(r1.data).slice(0, 300));
        // Try to get existing
        const existing = await api('/api/collections/task_users', 'GET', null, tk);
        if (existing.ok) {
            console.log('Already exists:', existing.data.id);
        } else {
            return;
        }
    }
    const tuId = r1.ok ? r1.data.id : (await api('/api/collections/task_users', 'GET', null, tk)).data.id;
    console.log('task_users id:', tuId);

    // Step 2: Get existing system fields
    const colInfo = await api('/api/collections/' + tuId, 'GET', null, tk);
    const sysFields = colInfo.data.fields || [];
    console.log('System fields:', sysFields.map(f => f.name).join(', '));

    // Step 3: Patch to add custom fields (use different id format)
    const customFields = [
        { id: 'abc1234567890ab', name: 'name', type: 'text', required: true, presentable: true },
        {
            id: 'abc1234567890ac', name: 'role', type: 'select', required: false,
            options: { maxSelect: 1, values: ['director', 'manager', 'staff'] }
        },
        { id: 'abc1234567890ad', name: 'department', type: 'text', required: false },
    ];

    const p = await api('/api/collections/' + tuId, 'PATCH', {
        listRule: '',
        viewRule: '',
        updateRule: '@request.auth.id = id',
        fields: [...sysFields, ...customFields],
    }, tk);

    if (p.ok) {
        console.log('Fields added:', p.data.fields.map(f => f.name).join(', '));
    } else {
        console.error('Patch error:', JSON.stringify(p.data).slice(0, 400));
        // Try without existing sysFields (just provide new ones)
        const p2 = await api('/api/collections/' + tuId, 'PATCH', {
            fields: customFields,
        }, tk);
        console.log('Patch2:', p2.ok, p2.ok ? p2.data.fields.map(f => f.name).join(',') : JSON.stringify(p2.data).slice(0, 200));
    }

    // Step 4: Create users (password min 8 chars)
    const users = [
        {
            username: 'admin', email: 'admin@mkg.vn', password: 'mkg20144', passwordConfirm: 'mkg20144',
            name: 'Admin MKG', role: 'director', department: 'BGD', emailVisibility: true
        },
        {
            username: 'thuyle', email: 'thuyle@mkg.vn', password: 'Mkg2024!', passwordConfirm: 'Mkg2024!',
            name: 'Thuy Le', role: 'manager', department: 'MKT', emailVisibility: true
        },
    ];

    for (const u of users) {
        const r = await api('/api/collections/task_users/records', 'POST', u, tk);
        if (r.ok) {
            console.log('User created:', u.username, '| name:', r.data.name, '| role:', r.data.role);
        } else {
            const m = JSON.stringify(r.data);
            if (m.includes('unique') || m.includes('already')) {
                console.log('User exists:', u.username);
            } else {
                console.error('User error', u.username, m.slice(0, 200));
            }
        }
    }

    // Step 5: Verify
    const l1 = await api('/api/collections/task_users/auth-with-password', 'POST',
        { identity: 'admin', password: 'mkg20144' });
    console.log('admin login:', l1.ok ? 'OK name=' + l1.data.record?.name + ' role=' + l1.data.record?.role : 'FAIL ' + JSON.stringify(l1.data).slice(0, 80));

    const l2 = await api('/api/collections/task_users/auth-with-password', 'POST',
        { identity: 'thuyle', password: 'Mkg2024!' });
    console.log('thuyle login:', l2.ok ? 'OK name=' + l2.data.record?.name + ' role=' + l2.data.record?.role : 'FAIL ' + JSON.stringify(l2.data).slice(0, 80));
}

main().catch(e => { console.error(e.message); process.exit(1); });

// Final: delete task_users, recreate with all fields at once
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

    // Delete task_users
    const del = await api('/api/collections/task_users', 'DELETE', null, tk);
    console.log('Delete task_users:', del.ok ? 'OK' : del.status, JSON.stringify(del.data).slice(0, 100));

    // Recreate with ALL fields in the initial creation body
    const create = await api('/api/collections', 'POST', {
        name: 'task_users',
        type: 'auth',
        listRule: '',
        viewRule: '',
        createRule: null,
        updateRule: '@request.auth.id = id',
        deleteRule: null,
        fields: [
            {
                id: 'SMFSIMN1hl3Kbdl', // stable-looking id
                name: 'name',
                type: 'text',
                required: true,
                presentable: true,
            },
            {
                id: 'SMFSIMN1hl3Kbdm',
                name: 'role',
                type: 'select',
                required: false,
                options: {
                    maxSelect: 1,
                    values: ['director', 'manager', 'staff'],
                },
            },
            {
                id: 'SMFSIMN1hl3Kbdn',
                name: 'department',
                type: 'text',
                required: false,
            },
        ],
    }, tk);

    if (!create.ok) {
        console.error('Create failed:', JSON.stringify(create.data).slice(0, 400));
        return;
    }
    const tuId = create.data.id;
    const fieldNames = create.data.fields?.map(f => f.name).join(', ') || 'none';
    console.log('Created task_users:', tuId);
    console.log('Fields:', fieldNames);

    // Create users
    const users = [
        {
            username: 'admin', email: 'admin@mkg.vn',
            password: 'mkg20144', passwordConfirm: 'mkg20144',
            name: 'Admin MKG', role: 'director', department: 'BGD', emailVisibility: true,
        },
        {
            username: 'thuyle', email: 'thuyle@mkg.vn',
            password: 'Mkg2024!', passwordConfirm: 'Mkg2024!',
            name: 'Thuy Le', role: 'manager', department: 'MKT', emailVisibility: true,
        },
    ];

    for (const u of users) {
        const r = await api('/api/collections/task_users/records', 'POST', u, tk);
        if (r.ok) {
            console.log(`✅ ${u.username}: name=${r.data.name} role=${r.data.role}`);
        } else {
            console.error(`❌ ${u.username}:`, JSON.stringify(r.data).slice(0, 200));
        }
    }

    // Verify
    const l1 = await api('/api/collections/task_users/auth-with-password', 'POST',
        { identity: 'admin@mkg.vn', password: 'mkg20144' });
    console.log('admin:', l1.ok ? `✅ name=${l1.data.record?.name} role=${l1.data.record?.role}` : '❌ ' + JSON.stringify(l1.data).slice(0, 80));

    const l2 = await api('/api/collections/task_users/auth-with-password', 'POST',
        { identity: 'thuyle@mkg.vn', password: 'Mkg2024!' });
    console.log('thuyle:', l2.ok ? `✅ name=${l2.data.record?.name} role=${l2.data.record?.role}` : '❌ ' + JSON.stringify(l2.data).slice(0, 80));
}

main().catch(e => { console.error(e.message); process.exit(1); });

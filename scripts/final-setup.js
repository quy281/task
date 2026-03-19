// Final setup: create users + remaining collections
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

    // Get all collections
    const cols = await api('/api/collections?perPage=200', 'GET', null, tk);
    const byName = {};
    for (const c of cols.data.items) byName[c.name] = c;
    const tuId = byName['task_users']?.id;
    console.log('task_users:', tuId, '| fields:', byName['task_users']?.fields?.map(f => f.name).join(','));

    // Enable username auth on task_users via PATCH options
    const authPatch = await api('/api/collections/' + tuId, 'PATCH', {
        passwordAuth: { enabled: true, identityFields: ['email', 'username'] },
    }, tk);
    console.log('Auth patch:', authPatch.ok ? 'OK' : JSON.stringify(authPatch.data).slice(0, 100));

    // Create tasks collection if not exists
    let tsId = byName['tasks']?.id;
    if (!tsId) {
        const r = await api('/api/collections', 'POST', {
            name: 'tasks',
            type: 'base',
            listRule: '',
            viewRule: '',
            createRule: '',
            updateRule: '',
            deleteRule: '',
            fields: [
                { name: 'title', type: 'text', required: true },
                { name: 'description', type: 'text' },
                { name: 'status', type: 'select', options: { maxSelect: 1, values: ['todo', 'in_progress', 'done', 'fail'] } },
                { name: 'priority', type: 'select', options: { maxSelect: 1, values: ['low', 'medium', 'high', 'urgent'] } },
                { name: 'due_date', type: 'text' },
                { name: 'color', type: 'text' },
                { name: 'checklist', type: 'json' },
                { name: 'assigned_by', type: 'relation', options: { collectionId: tuId, maxSelect: 1, cascadeDelete: false } },
                { name: 'assigned_to', type: 'relation', options: { collectionId: tuId, maxSelect: 10, cascadeDelete: false } },
            ],
        }, tk);
        if (r.ok) {
            tsId = r.data.id;
            console.log('tasks created:', tsId);
        } else {
            console.error('tasks error:', JSON.stringify(r.data).slice(0, 300));
        }
    } else {
        console.log('tasks exists:', tsId);
    }

    // Create task_comments if not exists
    if (!byName['task_comments'] && tsId) {
        const r = await api('/api/collections', 'POST', {
            name: 'task_comments',
            type: 'base',
            listRule: '',
            viewRule: '',
            createRule: '',
            updateRule: '',
            deleteRule: '',
            fields: [
                { name: 'content', type: 'text', required: true },
                { name: 'task', type: 'relation', required: true, options: { collectionId: tsId, maxSelect: 1, cascadeDelete: true } },
                { name: 'author', type: 'relation', required: true, options: { collectionId: tuId, maxSelect: 1, cascadeDelete: false } },
            ],
        }, tk);
        console.log('task_comments:', r.ok ? 'created ' + r.data.id : 'error: ' + JSON.stringify(r.data).slice(0, 200));
    } else {
        console.log('task_comments:', byName['task_comments'] ? 'exists' : 'skipped (no tsId)');
    }

    // Create users
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
            console.log('User:', u.username, '| name:', r.data.name, '| role:', r.data.role, '| id:', r.data.id);
        } else {
            const m = JSON.stringify(r.data);
            if (m.includes('unique') || m.includes('already')) {
                console.log('User exists:', u.username);
            } else {
                console.error('User error', u.username, m.slice(0, 200));
            }
        }
    }

    // Verify logins
    const tests = [
        { id: 'admin/email', body: { identity: 'admin@mkg.vn', password: 'mkg20144' } },
        { id: 'admin/username', body: { identity: 'admin', password: 'mkg20144' } },
        { id: 'thuyle/email', body: { identity: 'thuyle@mkg.vn', password: 'Mkg2024!' } },
        { id: 'thuyle/user', body: { identity: 'thuyle', password: 'Mkg2024!' } },
    ];
    console.log('\nLogin tests:');
    for (const t of tests) {
        const r = await api('/api/collections/task_users/auth-with-password', 'POST', t.body);
        console.log(t.id + ':', r.ok ? '✅ name=' + r.data.record?.name + ' role=' + r.data.record?.role : '❌ ' + JSON.stringify(r.data).slice(0, 60));
    }
}

main().catch(e => { console.error(e.message); process.exit(1); });

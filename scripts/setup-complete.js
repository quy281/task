// Full PocketBase v0.26 setup script
const PB_URL = 'https://db.mkg.vn';

async function api(path, method, body, token) {
    method = method || 'GET';
    const h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = 'Bearer ' + token;
    const r = await fetch(PB_URL + path, { method, headers: h, body: body ? JSON.stringify(body) : null });
    const t = await r.text();
    let d;
    try { d = JSON.parse(t); } catch (_) { d = { raw: t }; }
    return { ok: r.ok, status: r.status, data: d };
}

async function mustApi(path, method, body, token) {
    const result = await api(path, method, body, token);
    if (!result.ok) throw new Error(path + ' ' + result.status + ': ' + JSON.stringify(result.data).slice(0, 300));
    return result.data;
}

async function main() {
    // Login
    const auth = await mustApi('/api/collections/_superusers/auth-with-password', 'POST', {
        identity: 'quy28181818@gmail.com',
        password: '@Mkg201444',
    });
    const tk = auth.token;
    console.log('Logged in OK');

    // Get all existing collections
    const cols = await mustApi('/api/collections?perPage=200', 'GET', null, tk);
    const byName = {};
    for (const c of cols.items) byName[c.name] = c;

    const tuId = byName['task_users']?.id;
    console.log('task_users id:', tuId);

    // Patch task_users to add custom fields
    const tuPatch = await api('/api/collections/' + tuId, 'PATCH', {
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id = id',
        fields: [
            { name: 'name', type: 'text', required: true },
            { name: 'role', type: 'select', required: true, options: { maxSelect: 1, values: ['director', 'manager', 'staff'] } },
            { name: 'department', type: 'text' },
        ],
    }, tk);
    if (tuPatch.ok) {
        console.log('task_users: fields + rules set');
    } else {
        console.log('task_users patch warn:', JSON.stringify(tuPatch.data).slice(0, 200));
    }

    // Create tasks collection
    let tsId = byName['tasks']?.id;
    if (!tsId) {
        const r = await api('/api/collections', 'POST', {
            name: 'tasks',
            type: 'base',
            listRule: '@request.auth.id != ""',
            viewRule: '@request.auth.id != ""',
            createRule: '@request.auth.id != ""',
            updateRule: '@request.auth.id != ""',
            deleteRule: '@request.auth.id != ""',
            fields: [
                { name: 'title', type: 'text', required: true },
                { name: 'description', type: 'editor' },
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
            console.log('tasks created, id:', tsId);
        } else {
            console.error('tasks error:', JSON.stringify(r.data).slice(0, 300));
            // Try to get existing
            const existing = await api('/api/collections/tasks', 'GET', null, tk);
            if (existing.ok) { tsId = existing.data.id; console.log('tasks exists, id:', tsId); }
        }
    } else {
        console.log('tasks already exists, id:', tsId);
    }

    // Create task_comments collection
    let tcId = byName['task_comments']?.id;
    if (!tcId) {
        const r = await api('/api/collections', 'POST', {
            name: 'task_comments',
            type: 'base',
            listRule: '@request.auth.id != ""',
            viewRule: '@request.auth.id != ""',
            createRule: '@request.auth.id != ""',
            updateRule: '@request.auth.id != ""',
            deleteRule: '@request.auth.id != ""',
            fields: [
                { name: 'content', type: 'text', required: true },
                { name: 'task', type: 'relation', required: true, options: { collectionId: tsId, maxSelect: 1, cascadeDelete: true } },
                { name: 'author', type: 'relation', required: true, options: { collectionId: tuId, maxSelect: 1, cascadeDelete: false } },
            ],
        }, tk);
        if (r.ok) {
            tcId = r.data.id;
            console.log('task_comments created, id:', tcId);
        } else {
            console.error('task_comments error:', JSON.stringify(r.data).slice(0, 300));
        }
    } else {
        console.log('task_comments already exists');
    }

    // Create users
    const users = [
        { username: 'admin', email: 'admin@mkg.vn', password: 'mkg20144', passwordConfirm: 'mkg20144', name: 'Admin MKG', role: 'director', department: 'Ban Giam doc', emailVisibility: true },
        { username: 'thuyle', email: 'thuyle@mkg.vn', password: 'mkg2024', passwordConfirm: 'mkg2024', name: 'Thuy Le', role: 'manager', department: 'Phong Marketing', emailVisibility: true },
    ];

    for (const u of users) {
        const r = await api('/api/collections/task_users/records', 'POST', u, tk);
        if (r.ok) {
            console.log('User created:', u.username, u.name);
        } else {
            const m = JSON.stringify(r.data);
            if (m.includes('unique') || m.includes('already')) {
                console.log('User already exists:', u.username);
            } else {
                console.error('User error:', u.username, m.slice(0, 200));
            }
        }
    }

    // Verify
    const verif = await api('/api/collections/task_users/records?perPage=50', 'GET', null, tk);
    if (verif.ok) {
        console.log('\nUsers in DB:');
        for (const u of verif.data.items) {
            console.log(' -', u.username, '/', u.name, '/', u.role);
        }
    }

    console.log('\n=== All done! ===');
    console.log('Test at: http://localhost:5174');
    console.log('  admin / mkg20144  (director)');
    console.log('  thuyle / mkg2024  (manager)');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

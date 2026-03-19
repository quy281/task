// Full reset + recreate all task collections with proper fields
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
    if (!a.ok) { console.error('Login failed:', JSON.stringify(a.data)); return; }
    const tk = a.data.token;
    console.log('✅ Admin logged in');

    // ── Get existing collections ──────────────────────────────
    const cols = await api('/api/collections?perPage=200', 'GET', null, tk);
    const byName = {};
    for (const c of cols.data.items) byName[c.name] = c;

    // ── Delete old collections in reverse dependency order ────
    for (const name of ['task_comments', 'tasks', 'task_users']) {
        if (byName[name]) {
            const r = await api('/api/collections/' + byName[name].id, 'DELETE', null, tk);
            console.log(r.ok ? `🗑  Deleted ${name}` : `⚠️  Delete ${name}: ${JSON.stringify(r.data).slice(0, 100)}`);
        }
    }

    // ── Create task_users (auth) with all fields + username support ──
    const tuResult = await api('/api/collections', 'POST', {
        name: 'task_users',
        type: 'auth',
        // Enable both email AND username login
        passwordAuth: { enabled: true, identityFields: ['email', 'username'] },
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: null,
        updateRule: '@request.auth.id = id',
        deleteRule: null,
        fields: [
            { name: 'name', type: 'text', required: true },
            {
                name: 'role', type: 'select', required: true,
                options: { maxSelect: 1, values: ['director', 'manager', 'staff'] }
            },
            { name: 'department', type: 'text', required: false },
        ],
    }, tk);

    if (!tuResult.ok) {
        console.error('❌ Create task_users failed:', JSON.stringify(tuResult.data).slice(0, 300));
        return;
    }
    const tuId = tuResult.data.id;
    console.log('✅ Created task_users:', tuId);
    console.log('   Fields:', tuResult.data.fields?.map(f => f.name).join(', '));

    // ── Create tasks ──────────────────────────────────────────
    const tsResult = await api('/api/collections', 'POST', {
        name: 'tasks',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
            { name: 'title', type: 'text', required: true },
            { name: 'description', type: 'text', required: false },
            { name: 'status', type: 'select', options: { maxSelect: 1, values: ['todo', 'in_progress', 'done', 'fail'] } },
            { name: 'priority', type: 'select', options: { maxSelect: 1, values: ['low', 'medium', 'high', 'urgent'] } },
            { name: 'due_date', type: 'text', required: false },
            { name: 'color', type: 'text', required: false },
            { name: 'checklist', type: 'json', required: false },
            { name: 'assigned_by', type: 'relation', options: { collectionId: tuId, maxSelect: 1, cascadeDelete: false } },
            { name: 'assigned_to', type: 'relation', options: { collectionId: tuId, maxSelect: 10, cascadeDelete: false } },
        ],
    }, tk);

    const tsId = tsResult.ok ? tsResult.data.id : null;
    console.log(tsResult.ok ? '✅ Created tasks: ' + tsId : '❌ tasks error: ' + JSON.stringify(tsResult.data).slice(0, 200));

    // ── Create task_comments ──────────────────────────────────
    const tcResult = await api('/api/collections', 'POST', {
        name: 'task_comments',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
            { name: 'content', type: 'text', required: true },
            {
                name: 'task', type: 'relation', required: true,
                options: { collectionId: tsId, maxSelect: 1, cascadeDelete: true }
            },
            {
                name: 'author', type: 'relation', required: true,
                options: { collectionId: tuId, maxSelect: 1, cascadeDelete: false }
            },
        ],
    }, tk);
    console.log(tcResult.ok ? '✅ Created task_comments: ' + tcResult.data.id : '⚠️  task_comments: ' + JSON.stringify(tcResult.data).slice(0, 150));

    // ── Create users (password min 8 chars) ───────────────────
    const users = [
        {
            username: 'admin', email: 'admin@mkg.vn', password: 'mkg20144', passwordConfirm: 'mkg20144',
            name: 'Admin MKG', role: 'director', department: 'Ban Giam doc', emailVisibility: true
        },
        {
            username: 'thuyle', email: 'thuyle@mkg.vn', password: 'mkg20244', passwordConfirm: 'mkg20244',
            name: 'Thuy Le', role: 'manager', department: 'Marketing', emailVisibility: true
        },
    ];

    for (const u of users) {
        const r = await api('/api/collections/task_users/records', 'POST', u, tk);
        if (r.ok) {
            console.log(`✅ User ${u.username}: name=${r.data.name} role=${r.data.role} id=${r.data.id}`);
        } else {
            console.error(`❌ User ${u.username}:`, JSON.stringify(r.data).slice(0, 200));
        }
    }

    // ── Verify logins ─────────────────────────────────────────
    console.log('\n--- Verify logins ---');
    const checks = [
        { id: 'admin/email', body: { identity: 'admin@mkg.vn', password: 'mkg20144' } },
        { id: 'admin/username', body: { identity: 'admin', password: 'mkg20144' } },
        { id: 'thuyle/email', body: { identity: 'thuyle@mkg.vn', password: 'mkg20244' } },
        { id: 'thuyle/username', body: { identity: 'thuyle', password: 'mkg20244' } },
    ];
    for (const c of checks) {
        const r = await api('/api/collections/task_users/auth-with-password', 'POST', c.body);
        console.log(c.id + ':', r.ok ? `✅ OK (role=${r.data.record?.role} name=${r.data.record?.name})` : '❌ ' + JSON.stringify(r.data).slice(0, 80));
    }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

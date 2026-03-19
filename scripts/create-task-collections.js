// Create tasks and task_comments collections 
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
    const tuId = 'pbc_2588197702'; // task_users known ID

    // Create tasks
    const t1 = await api('/api/collections', 'POST', {
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

    let tsId;
    if (t1.ok) {
        tsId = t1.data.id;
        console.log('tasks created:', tsId, 'fields:', t1.data.fields?.map(f => f.name).join(','));
    } else {
        console.error('tasks error:', JSON.stringify(t1.data).slice(0, 300));
        // Try to get it
        const existing = await api('/api/collections/tasks', 'GET', null, tk);
        if (existing.ok) { tsId = existing.data.id; console.log('tasks exists:', tsId); }
    }

    // Create task_comments
    if (tsId) {
        const t2 = await api('/api/collections', 'POST', {
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
        console.log('task_comments:', t2.ok ? 'created ' + t2.data.id : 'error: ' + JSON.stringify(t2.data).slice(0, 200));
    }

    // Final verify
    const cols = await api('/api/collections?perPage=200', 'GET', null, tk);
    const tc = cols.data.items.filter(c => ['tasks', 'task_comments', 'task_users'].includes(c.name));
    console.log('\nFinal collections:');
    for (const c of tc) console.log(' -', c.name, c.id, '| fields:', c.fields?.map(f => f.name).join(','));
}

main().catch(e => { console.error(e.message); process.exit(1); });

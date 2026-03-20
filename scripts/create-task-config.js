// Create task_config collection for shared settings (departments, etc.)
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
    console.log('✅ Superuser logged in');

    // Step 1: Create task_config collection
    const r1 = await api('/api/collections', 'POST', {
        name: 'task_config',
        type: 'base',
        fields: [
            { name: 'key', type: 'text', required: true },
            { name: 'value', type: 'json', required: false },
        ],
        listRule: '',   // everyone can read
        viewRule: '',
        createRule: '@request.auth.id != ""', // authenticated users can create
        updateRule: '@request.auth.id != ""', // authenticated users can update
    }, tk);

    if (r1.ok) {
        console.log('✅ task_config collection created');
    } else {
        const msg = JSON.stringify(r1.data);
        if (msg.includes('already exists')) {
            console.log('ℹ️ task_config already exists');
        } else {
            console.error('❌ Create failed:', msg.slice(0, 300));
        }
    }

    // Step 2: Seed default departments
    const defaultDepts = [
        'Đội thợ 1', 'Đội thợ 2', 'Phòng thiết kế',
        'Phòng kinh doanh', 'Phòng marketing', 'Ban giám đốc',
    ];

    // Check if departments config already exists
    const existing = await api('/api/collections/task_config/records?filter=(key="departments")', 'GET', null, tk);
    if (existing.ok && existing.data.items && existing.data.items.length > 0) {
        console.log('ℹ️ Departments config already exists:', existing.data.items[0].value);
    } else {
        const r2 = await api('/api/collections/task_config/records', 'POST', {
            key: 'departments',
            value: defaultDepts,
        }, tk);
        if (r2.ok) {
            console.log('✅ Default departments seeded:', defaultDepts);
        } else {
            console.error('❌ Seed failed:', JSON.stringify(r2.data).slice(0, 200));
        }
    }

    // Step 3: Also update task_users updateRule so admins can change others' roles
    const tuCol = await api('/api/collections/task_users', 'GET', null, tk);
    if (tuCol.ok) {
        const patch = await api('/api/collections/' + tuCol.data.id, 'PATCH', {
            updateRule: '', // anyone authenticated can update (admin controls this in UI)
        }, tk);
        console.log(patch.ok ? '✅ task_users updateRule set to open' : '❌ Patch failed: ' + JSON.stringify(patch.data).slice(0, 200));
    }

    console.log('\n✅ Done!');
}

main().catch(e => { console.error(e.message); process.exit(1); });

const PB_URL = 'https://db.mkg.vn';

async function apiCall(path, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${PB_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
    return data;
}

async function main() {
    const adminEmail = process.argv[2];
    const adminPassword = process.argv[3];
    if (!adminEmail || !adminPassword) {
        console.error('Usage: node scripts/setup-db.js <email> <password>');
        process.exit(1);
    }

    console.log('Logging in as:', adminEmail);
    let adminToken;

    // Try PocketBase v0.23+ (_superusers)
    try {
        const auth = await apiCall('/api/collections/_superusers/auth-with-password', 'POST', {
            identity: adminEmail,
            password: adminPassword,
        });
        adminToken = auth.token;
        console.log('Logged in (v0.23+)');
    } catch (e1) {
        console.log('v0.23+ failed, trying legacy...', e1.message.slice(0, 80));
        try {
            const auth = await apiCall('/api/admins/auth-with-password', 'POST', {
                identity: adminEmail,
                password: adminPassword,
            });
            adminToken = auth.token;
            console.log('Logged in (legacy)');
        } catch (e2) {
            console.error('Login failed:', e2.message.slice(0, 200));
            process.exit(1);
        }
    }

    // Helper to create collection
    async function createCollection(def) {
        try {
            await apiCall('/api/collections', 'POST', def, adminToken);
            console.log('Created collection:', def.name);
        } catch (e) {
            const msg = e.message;
            if (msg.includes('already') || msg.includes('unique') || msg.includes('exist')) {
                console.log('Already exists:', def.name);
            } else {
                console.error('Error creating', def.name, ':', msg.slice(0, 150));
            }
        }
    }

    // task_users (auth collection)
    await createCollection({
        name: 'task_users',
        type: 'auth',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: null,
        updateRule: '@request.auth.id = id',
        deleteRule: null,
        fields: [
            { name: 'name', type: 'text', required: true },
            { name: 'role', type: 'select', required: true, options: { maxSelect: 1, values: ['director', 'manager', 'staff'] } },
            { name: 'department', type: 'text', required: false },
        ],
    });

    // tasks
    await createCollection({
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
        ],
    });

    // task_comments
    await createCollection({
        name: 'task_comments',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id = author',
        deleteRule: '@request.auth.id = author',
        fields: [
            { name: 'content', type: 'text', required: true },
        ],
    });

    console.log('\nCreating test users...');

    // Get collection ID for task_users to add relations later
    let taskUsersId;
    try {
        const col = await apiCall('/api/collections/task_users', 'GET', null, adminToken);
        taskUsersId = col.id;
        console.log('task_users collection ID:', taskUsersId);
    } catch (e) {
        console.error('Could not get task_users ID:', e.message.slice(0, 100));
    }

    const users = [
        { username: 'admin', email: 'admin@mkg.vn', password: 'mkg20144', passwordConfirm: 'mkg20144', name: 'Admin MKG', role: 'director', department: 'Ban Giam doc', emailVisibility: true },
        { username: 'thuyle', email: 'thuyle@mkg.vn', password: 'mkg2024', passwordConfirm: 'mkg2024', name: 'Thuy Le', role: 'manager', department: 'Phong Marketing', emailVisibility: true },
    ];

    for (const u of users) {
        try {
            await apiCall('/api/collections/task_users/records', 'POST', u, adminToken);
            console.log('Created user:', u.username);
        } catch (e) {
            const msg = e.message;
            if (msg.includes('unique') || msg.includes('already')) {
                console.log('User already exists:', u.username);
            } else {
                console.error('Error creating user', u.username, ':', msg.slice(0, 200));
            }
        }
    }

    console.log('\nDone! Login at http://localhost:5174');
    console.log('  admin / mkg20144');
    console.log('  thuyle / mkg2024');
}

main().catch(e => { console.error(e.message); process.exit(1); });

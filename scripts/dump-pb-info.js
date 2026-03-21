const PB_URL = 'https://db.mkg.vn';
async function api(path, token) {
    const h = { 'Content-Type': 'application/json' };
    if (token) h.Authorization = 'Bearer ' + token;
    const r = await fetch(PB_URL + path, { headers: h });
    return await r.json();
}
async function main() {
    const a = await (await fetch(PB_URL + '/api/collections/_superusers/auth-with-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: 'quy28181818@gmail.com', password: '@Mkg201444' }),
    })).json();
    const tk = a.token;

    console.log('=== USERS ===');
    const u = await api('/api/collections/task_users/records?perPage=50', tk);
    u.items.forEach(i => console.log(`  ${i.name} | ${i.email} | role: ${i.role} | dept: ${i.department}`));

    console.log('\n=== CONFIG ===');
    const cfg = await api('/api/collections/task_config/records?perPage=50', tk);
    cfg.items.forEach(i => console.log(`  ${i.key} = ${JSON.stringify(i.value)}`));

    console.log('\n=== COLLECTIONS (task*) ===');
    const cols = await api('/api/collections', tk);
    cols.items.filter(c => c.name.startsWith('task')).forEach(c => {
        console.log(`  ${c.name} (${c.type})`);
        console.log(`    list: ${JSON.stringify(c.listRule)}, view: ${JSON.stringify(c.viewRule)}`);
        console.log(`    create: ${JSON.stringify(c.createRule)}, update: ${JSON.stringify(c.updateRule)}, delete: ${JSON.stringify(c.deleteRule)}`);
        console.log(`    fields: ${c.fields.map(f => f.name + ':' + f.type).join(', ')}`);
    });
}
main().catch(e => console.error(e));

// Seed demo data for task-manager
const PB_URL = 'https://db.mkg.vn';

async function api(path, method, body, token) {
    const h = { 'Content-Type': 'application/json' };
    if (token) h.Authorization = 'Bearer ' + token;
    const r = await fetch(PB_URL + path, {
        method: method || 'GET', headers: h, body: body ? JSON.stringify(body) : null,
    });
    const t = await r.text();
    let d; try { d = JSON.parse(t); } catch (_) { d = { raw: t }; }
    return { ok: r.ok, data: d };
}

async function main() {
    const a = await api('/api/collections/_superusers/auth-with-password', 'POST', {
        identity: 'quy28181818@gmail.com', password: '@Mkg201444',
    });
    const tk = a.data.token;

    // Get users
    const users = await api('/api/collections/task_users/records?perPage=50', 'GET', null, tk);
    const byUsername = {};
    for (const u of users.data.items) {
        const uname = u.email.split('@')[0];
        byUsername[uname] = u;
        console.log('User:', u.email, '| id:', u.id, '| role:', u.role);
    }

    const adminId = byUsername['admin']?.id;
    const thuyleId = byUsername['thuyle']?.id;

    if (!adminId || !thuyleId) {
        console.error('Missing users! admin:', adminId, 'thuyle:', thuyleId);
        return;
    }

    // Check existing tasks count
    const existingTasks = await api('/api/collections/tasks/records?perPage=1', 'GET', null, tk);
    console.log('Existing tasks count:', existingTasks.data.totalItems);

    // Demo tasks
    const tasks = [
        {
            title: 'Lên kế hoạch chiến lược Q2/2025',
            description: 'Phân tích thị trường, xác định mục tiêu tăng trưởng và lập kế hoạch Marketing cho quý 2. Bao gồm ngân sách, KPI và timeline chi tiết.',
            status: 'in_progress',
            priority: 'urgent',
            due_date: '2025-04-15',
            color: '#ef4444',
            assigned_by: adminId,
            assigned_to: [thuyleId],
            checklist: JSON.stringify([
                { text: 'Phân tích báo cáo Q1', done: true },
                { text: 'Họp team để xác định mục tiêu', done: true },
                { text: 'Draft kế hoạch Marketing', done: false },
                { text: 'Review và duyệt ngân sách', done: false },
                { text: 'Trình bày cho Ban giám đốc', done: false },
            ]),
        },
        {
            title: 'Triển khai chiến dịch Facebook Ads tháng 4',
            description: 'Setup và chạy chiến dịch quảng cáo Facebook cho sản phẩm combo phòng ngủ mới. Target khách hàng 25-45 tuổi, thu nhập trung bình - cao.',
            status: 'todo',
            priority: 'high',
            due_date: '2025-04-01',
            color: '#f59e0b',
            assigned_by: thuyleId,
            assigned_to: [thuyleId],
            checklist: JSON.stringify([
                { text: 'Chuẩn bị creative (ảnh + video)', done: false },
                { text: 'Viết copy quảng cáo', done: false },
                { text: 'Setup campaign trong Ads Manager', done: false },
                { text: 'Test A/B với 2 nhóm đối tượng', done: false },
                { text: 'Theo dõi và tối ưu hàng ngày', done: false },
            ]),
        },
        {
            title: 'Nghiên cứu đối thủ cạnh tranh',
            description: 'Phân tích chiến lược marketing, sản phẩm và giá cả của các đối thủ: IKEA, Nitori, Hoà Phát, Xuân Hoà. Lập báo cáo so sánh.',
            status: 'done',
            priority: 'medium',
            due_date: '2025-03-20',
            color: '#10b981',
            assigned_by: adminId,
            assigned_to: [thuyleId],
            checklist: JSON.stringify([
                { text: 'Thu thập data từ website đối thủ', done: true },
                { text: 'Phân tích IKEA', done: true },
                { text: 'Phân tích Nitori', done: true },
                { text: 'Phân tích Hoà Phát', done: true },
                { text: 'Viết báo cáo tổng hợp', done: true },
            ]),
        },
        {
            title: 'Cập nhật bảng giá sản phẩm Q2',
            description: 'Rà soát và cập nhật bảng giá toàn bộ sản phẩm cho quý 2. Xem xét chi phí nguyên vật liệu, tỷ giá và định giá cạnh tranh.',
            status: 'todo',
            priority: 'medium',
            due_date: '2025-04-05',
            color: '#8b5cf6',
            assigned_by: adminId,
            assigned_to: [adminId],
            checklist: JSON.stringify([
                { text: 'Lấy báo giá từ nhà cung cấp', done: false },
                { text: 'Tính toán chi phí sản xuất mới', done: false },
                { text: 'So sánh với giá thị trường', done: false },
            ]),
        },
        {
            title: 'Training kỹ năng bán hàng cho team',
            description: 'Tổ chức buổi training về kỹ năng tư vấn và chốt sales cho đội ngũ kinh doanh. Thuê chuyên gia hoặc tự tổ chức nội bộ.',
            status: 'in_progress',
            priority: 'high',
            due_date: '2025-04-20',
            color: '#3b82f6',
            assigned_by: adminId,
            assigned_to: [thuyleId, adminId],
            checklist: JSON.stringify([
                { text: 'Xác định nội dung training', done: true },
                { text: 'Liên hệ chuyên gia đào tạo', done: true },
                { text: 'Chuẩn bị tài liệu', done: false },
                { text: 'Tổ chức buổi training', done: false },
                { text: 'Đánh giá kết quả sau training', done: false },
            ]),
        },
        {
            title: 'Thiết kế bộ nhận diện thương hiệu mới',
            description: 'Làm mới logo, màu sắc và typography để phù hợp xu hướng thiết kế hiện đại. Áp dụng cho tất cả kênh truyền thông.',
            status: 'todo',
            priority: 'low',
            due_date: '2025-05-01',
            color: '#ec4899',
            assigned_by: adminId,
            assigned_to: [thuyleId],
            checklist: JSON.stringify([
                { text: 'Brief design agency', done: false },
                { text: 'Review concept lần 1', done: false },
                { text: 'Chỉnh sửa và hoàn thiện', done: false },
                { text: 'Áp dụng vào các ấn phẩm', done: false },
            ]),
        },
    ];

    let created = 0;
    let skipped = 0;

    for (const task of tasks) {
        // Check if task with same title already exists
        const exists = await api(`/api/collections/tasks/records?filter=title="${encodeURIComponent(task.title).replace(/%20/g, ' ')}"&perPage=1`, 'GET', null, tk);
        if (exists.data.totalItems > 0) {
            console.log('Skip (exists):', task.title.slice(0, 40));
            skipped++;
            continue;
        }

        const r = await api('/api/collections/tasks/records', 'POST', task, tk);
        if (r.ok) {
            console.log('✅ Created:', task.title.slice(0, 50));
            created++;

            // Add a sample comment to tasks that are in_progress or done
            if (task.status === 'in_progress' || task.status === 'done') {
                const comment = task.status === 'done'
                    ? 'Đã hoàn thành! Báo cáo đã được gửi qua email.'
                    : 'Đang xử lý, sẽ update tiến độ vào cuối ngày.';
                await api('/api/collections/task_comments/records', 'POST', {
                    task: r.data.id,
                    author: thuyleId,
                    content: comment,
                }, tk);
                await api('/api/collections/task_comments/records', 'POST', {
                    task: r.data.id,
                    author: adminId,
                    content: task.status === 'done' ? 'Tốt lắm! Lưu kết quả vào tài liệu chung nhé.' : 'Nhớ deadline, update daily ahh.',
                }, tk);
            }
        } else {
            console.error('❌ Failed:', task.title.slice(0, 40), JSON.stringify(r.data).slice(0, 100));
        }
    }

    console.log(`\nDone! Created: ${created}, Skipped: ${skipped}`);

    // Final count
    const final = await api('/api/collections/tasks/records?perPage=1', 'GET', null, tk);
    console.log('Total tasks in DB:', final.data.totalItems);
}

main().catch(e => { console.error(e.message); process.exit(1); });

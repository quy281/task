// Demo data for offline mode when PocketBase is not configured

const DEMO_USERS = [
    { id: 'u1', name: 'Nguyễn Văn An', email: 'giamdoc@mkg.vn', role: 'director', department: 'Ban Giám đốc' },
    { id: 'u2', name: 'Trần Thị Bình', email: 'truongphong1@mkg.vn', role: 'manager', department: 'Phòng Kinh doanh' },
    { id: 'u3', name: 'Phạm Minh Đức', email: 'truongphong2@mkg.vn', role: 'manager', department: 'Phòng Marketing' },
    { id: 'u4', name: 'Lê Minh Cường', email: 'nhanvien1@mkg.vn', role: 'staff', department: 'Phòng Kinh doanh' },
    { id: 'u5', name: 'Hoàng Thị Dung', email: 'nhanvien2@mkg.vn', role: 'staff', department: 'Phòng Marketing' },
];

function expandUser(id) {
    return DEMO_USERS.find(u => u.id === id) || null;
}

const now = new Date();
const day = (d) => {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    return date.toISOString();
};
const ago = (h) => {
    const date = new Date(now);
    date.setHours(date.getHours() - h);
    return date.toISOString();
};

/*
  Checklist item structure:
  {
    id: string,
    text: string,
    status: 'todo' | 'done' | 'fail' | 'in_progress',
    level: 0 | 1 | 2,          // 0 = top-level, 1 = subtask, 2 = sub-subtask
    comments: [{ id, author (userId), content, created }]
  }
*/

const DEMO_TASKS = [
    {
        id: 't1', title: 'Hoàn thành báo cáo Q1 2026',
        description: 'Tổng hợp doanh thu, chi phí, lợi nhuận quý 1. Bao gồm biểu đồ so sánh với cùng kỳ năm trước.',
        assigned_by: 'u1', assigned_to: ['u2'],
        status: 'in_progress', priority: 'high',
        due_date: day(3), color: 'blue',
        checklist: [
            {
                id: 'c1', text: 'Thu thập dữ liệu doanh thu', status: 'done', level: 0, comments: [
                    { id: 'ic1', author: 'u2', content: 'Đã lấy data từ SAP xong', created: ago(40) },
                    { id: 'ic2', author: 'u1', content: 'OK, check lại số liệu tháng 1 nhé', created: ago(38) },
                ]
            },
            {
                id: 'c2', text: 'Phân tích chi phí theo phòng ban', status: 'done', level: 0, comments: [
                    { id: 'ic3', author: 'u2', content: 'Phòng MKT chi phí tăng 20% so Q4', created: ago(20) },
                ]
            },
            { id: 'c2a', text: 'Chi phí nhân sự', status: 'done', level: 1, comments: [] },
            { id: 'c2b', text: 'Chi phí vận hành', status: 'done', level: 1, comments: [] },
            {
                id: 'c2c', text: 'Chi phí marketing', status: 'in_progress', level: 1, comments: [
                    { id: 'ic4', author: 'u2', content: 'Đang chờ hoá đơn từ agency', created: ago(5) },
                ]
            },
            { id: 'c3', text: 'Tạo biểu đồ so sánh', status: 'in_progress', level: 0, comments: [] },
            { id: 'c4', text: 'Viết nhận xét tổng kết', status: 'todo', level: 0, comments: [] },
            { id: 'c5', text: 'Gửi GĐ duyệt', status: 'todo', level: 0, comments: [] },
        ],
        created: ago(48),
        expand: { assigned_by: expandUser('u1'), assigned_to: [expandUser('u2')] }
    },
    {
        id: 't2', title: 'Thiết kế banner Landing Page mới',
        description: 'Thiết kế 3 phiên bản banner cho trang landing page sản phẩm nội thất mới.',
        assigned_by: 'u3', assigned_to: ['u5'],
        status: 'todo', priority: 'medium',
        due_date: day(5), color: 'pink',
        checklist: [
            { id: 'c1', text: 'Research competitor designs', status: 'todo', level: 0, comments: [] },
            { id: 'c1a', text: 'Phân tích IKEA', status: 'todo', level: 1, comments: [] },
            { id: 'c1b', text: 'Phân tích Nitori', status: 'todo', level: 1, comments: [] },
            { id: 'c2', text: 'Phiên bản Desktop', status: 'todo', level: 0, comments: [] },
            { id: 'c3', text: 'Phiên bản Mobile', status: 'todo', level: 0, comments: [] },
        ],
        created: ago(24),
        expand: { assigned_by: expandUser('u3'), assigned_to: [expandUser('u5')] }
    },
    {
        id: 't3', title: 'Chạy chiến dịch Facebook Ads tháng 3',
        description: 'Setup 5 ad sets cho combo phòng ngủ. Budget: 15tr/ngày. Mục tiêu: ROAS 4x.',
        assigned_by: 'u1', assigned_to: ['u3', 'u5'],
        status: 'in_progress', priority: 'urgent',
        due_date: day(1), color: 'orange',
        checklist: [
            {
                id: 'c1', text: 'Viết copy quảng cáo (5 sets)', status: 'done', level: 0, comments: [
                    { id: 'ic5', author: 'u5', content: '5 sets copy đã xong, gửi review', created: ago(30) },
                    { id: 'ic6', author: 'u3', content: 'Set 3 chỉnh lại CTA nhé', created: ago(28) },
                ]
            },
            { id: 'c2', text: 'Chuẩn bị creative (ảnh + video)', status: 'done', level: 0, comments: [] },
            { id: 'c2a', text: 'Chụp sản phẩm combo', status: 'done', level: 1, comments: [] },
            {
                id: 'c2b', text: 'Quay video 15s & 30s', status: 'done', level: 1, comments: [
                    { id: 'ic7', author: 'u5', content: 'Video 30s render xong, quality 4K', created: ago(20) },
                ]
            },
            { id: 'c3', text: 'Setup Facebook Business Manager', status: 'done', level: 0, comments: [] },
            {
                id: 'c4', text: 'Tạo audiences & targeting', status: 'in_progress', level: 0, comments: [
                    { id: 'ic8', author: 'u3', content: 'Lookalike 1% từ KH cũ, Interest-based cho combo', created: ago(3) },
                ]
            },
            { id: 'c5', text: 'Launch campaigns', status: 'todo', level: 0, comments: [] },
            { id: 'c6', text: 'Monitor & optimize hàng ngày', status: 'todo', level: 0, comments: [] },
        ],
        created: ago(72),
        expand: { assigned_by: expandUser('u1'), assigned_to: [expandUser('u3'), expandUser('u5')] }
    },
    {
        id: 't4', title: 'Gọi điện follow-up 20 khách hàng tiềm năng',
        description: 'Danh sách khách hàng đã để lại thông tin qua form tháng 2. Cần gọi xác nhận nhu cầu.',
        assigned_by: 'u2', assigned_to: ['u4'],
        status: 'in_progress', priority: 'high',
        due_date: day(2), color: 'green',
        checklist: [
            {
                id: 'c1', text: 'Gọi nhóm A (10 KH ưu tiên)', status: 'done', level: 0, comments: [
                    { id: 'ic9', author: 'u4', content: '6/10 quan tâm, 2 hẹn showroom', created: ago(15) },
                ]
            },
            { id: 'c1a', text: 'KH hẹn showroom: Anh Tuấn, Chị Hà', status: 'done', level: 1, comments: [] },
            { id: 'c1b', text: 'KH cần gọi lại: Anh Phong', status: 'in_progress', level: 1, comments: [] },
            { id: 'c2', text: 'Gọi nhóm B (10 KH còn lại)', status: 'in_progress', level: 0, comments: [] },
            { id: 'c3', text: 'Cập nhật CRM', status: 'todo', level: 0, comments: [] },
            { id: 'c4', text: 'Báo cáo kết quả', status: 'todo', level: 0, comments: [] },
        ],
        created: ago(36),
        expand: { assigned_by: expandUser('u2'), assigned_to: [expandUser('u4')] }
    },
    {
        id: 't5', title: 'Cập nhật bảng giá sản phẩm Q2',
        description: 'Cập nhật giá mới cho toàn bộ sản phẩm, bao gồm giá nhập, giá bán, và margin.',
        assigned_by: 'u1', assigned_to: ['u2', 'u4'],
        status: 'todo', priority: 'medium',
        due_date: day(7), color: 'yellow',
        checklist: [
            { id: 'c1', text: 'Lấy báo giá nhà cung cấp', status: 'todo', level: 0, comments: [] },
            { id: 'c2', text: 'Tính toán giá bán mới', status: 'todo', level: 0, comments: [] },
            { id: 'c3', text: 'Cập nhật hệ thống', status: 'todo', level: 0, comments: [] },
        ],
        created: ago(12),
        expand: { assigned_by: expandUser('u1'), assigned_to: [expandUser('u2'), expandUser('u4')] }
    },
    {
        id: 't6', title: 'Viết content SEO blog (5 bài)',
        description: 'Viết 5 bài blog chuẩn SEO cho website. Chủ đề: nội thất phòng ngủ, phòng khách, phòng bếp.',
        assigned_by: 'u3', assigned_to: ['u5'],
        status: 'todo', priority: 'low',
        due_date: day(10), color: 'purple',
        checklist: [
            {
                id: 'c1', text: 'Nghiên cứu keyword', status: 'todo', level: 0, comments: [
                    { id: 'ic10', author: 'u5', content: 'List 20 keywords volume cao rồi ạ', created: ago(3) },
                ]
            },
            { id: 'c2', text: 'Viết outline 5 bài', status: 'todo', level: 0, comments: [] },
            { id: 'c3', text: 'Viết bài + tối ưu SEO', status: 'todo', level: 0, comments: [] },
            { id: 'c3a', text: 'Bài 1: Nội thất phòng ngủ hiện đại', status: 'todo', level: 1, comments: [] },
            { id: 'c3b', text: 'Bài 2: Thiết kế phòng khách nhỏ', status: 'todo', level: 1, comments: [] },
            { id: 'c3c', text: 'Bài 3-5: Phòng bếp & combo', status: 'todo', level: 1, comments: [] },
            { id: 'c4', text: 'Đăng lên WordPress', status: 'todo', level: 0, comments: [] },
        ],
        created: ago(6),
        expand: { assigned_by: expandUser('u3'), assigned_to: [expandUser('u5')] }
    },
    {
        id: 't7', title: 'Đào tạo nhân viên mới quy trình bán hàng',
        description: 'Training 2 nhân viên mới về quy trình tư vấn, chốt đơn và chăm sóc hậu mãi.',
        assigned_by: 'u1', assigned_to: ['u2'],
        status: 'done', priority: 'medium',
        due_date: day(-2), color: 'default',
        checklist: [
            { id: 'c1', text: 'Chuẩn bị tài liệu training', status: 'done', level: 0, comments: [] },
            { id: 'c2', text: 'Buổi 1: Quy trình tư vấn', status: 'done', level: 0, comments: [] },
            { id: 'c3', text: 'Buổi 2: Kỹ năng chốt đơn', status: 'done', level: 0, comments: [] },
            {
                id: 'c4', text: 'Test kiến thức', status: 'done', level: 0, comments: [
                    { id: 'ic11', author: 'u2', content: '2 bạn đều đạt 85%+', created: ago(50) },
                ]
            },
        ],
        created: ago(168),
        expand: { assigned_by: expandUser('u1'), assigned_to: [expandUser('u2')] }
    },
    {
        id: 't8', title: 'Kiểm kê hàng tồn kho cuối tháng',
        description: 'Kiểm kê số lượng hàng tồn tại kho chính và đối chiếu với hệ thống.',
        assigned_by: 'u2', assigned_to: ['u4'],
        status: 'in_progress', priority: 'high',
        due_date: day(-1), color: 'default',
        checklist: [
            { id: 'c1', text: 'Kiểm kê khu A', status: 'done', level: 0, comments: [] },
            {
                id: 'c2', text: 'Kiểm kê khu B', status: 'fail', level: 0, comments: [
                    { id: 'ic12', author: 'u4', content: 'Có 5 mục lệch số liệu, cần check lại', created: ago(30) },
                    { id: 'ic13', author: 'u2', content: 'Lệch mấy mục? Gửi chi tiết cho anh', created: ago(28) },
                ]
            },
            { id: 'c2a', text: 'Đếm lại kệ B1-B5', status: 'in_progress', level: 1, comments: [] },
            { id: 'c2b', text: 'Đếm lại kệ B6-B10', status: 'todo', level: 1, comments: [] },
            { id: 'c3', text: 'Đối chiếu hệ thống', status: 'todo', level: 0, comments: [] },
            { id: 'c4', text: 'Lập biên bản chênh lệch', status: 'todo', level: 0, comments: [] },
        ],
        created: ago(96),
        expand: { assigned_by: expandUser('u2'), assigned_to: [expandUser('u4')] }
    },
    {
        id: 't9', title: 'Tối ưu Google Ads cho từ khóa chính',
        description: 'Review và optimize 3 campaigns Google Ads hiện tại. Tập trung quality score và CPC.',
        assigned_by: 'u3', assigned_to: ['u5'],
        status: 'in_progress', priority: 'medium',
        due_date: day(4), color: 'blue',
        checklist: [
            { id: 'c1', text: 'Audit hiện tại', status: 'done', level: 0, comments: [] },
            {
                id: 'c2', text: 'Loại bỏ keyword kém', status: 'done', level: 0, comments: [
                    { id: 'ic14', author: 'u5', content: 'Loại 15 keywords CPC cao, QS tăng 5→7', created: ago(10) },
                ]
            },
            { id: 'c3', text: 'Thêm negative keywords', status: 'in_progress', level: 0, comments: [] },
            { id: 'c4', text: 'Tối ưu landing pages', status: 'todo', level: 0, comments: [] },
        ],
        created: ago(60),
        expand: { assigned_by: expandUser('u3'), assigned_to: [expandUser('u5')] }
    },
    {
        id: 't10', title: 'Lên kế hoạch event showroom tháng 4',
        description: 'Tổ chức event khai trương showroom mới. Cần lên kế hoạch chi tiết và ngân sách.',
        assigned_by: 'u1', assigned_to: ['u2', 'u3'],
        status: 'todo', priority: 'high',
        due_date: day(14), color: 'yellow',
        checklist: [
            { id: 'c1', text: 'Lên concept event', status: 'todo', level: 0, comments: [] },
            { id: 'c2', text: 'Liên hệ nhà cung cấp dịch vụ', status: 'todo', level: 0, comments: [] },
            { id: 'c2a', text: 'Âm thanh & ánh sáng', status: 'todo', level: 1, comments: [] },
            { id: 'c2b', text: 'Catering', status: 'todo', level: 1, comments: [] },
            { id: 'c2c', text: 'MC & chương trình', status: 'todo', level: 1, comments: [] },
            { id: 'c3', text: 'Lập ngân sách', status: 'todo', level: 0, comments: [] },
            { id: 'c4', text: 'Design thiệp mời + poster', status: 'todo', level: 0, comments: [] },
            { id: 'c5', text: 'Mời khách VIP', status: 'todo', level: 0, comments: [] },
        ],
        created: ago(4),
        expand: { assigned_by: expandUser('u1'), assigned_to: [expandUser('u2'), expandUser('u3')] }
    },
];

// Task-level comments (the main thread on the board)
const DEMO_COMMENTS = {
    t1: [
        { id: 'cm1', task: 't1', author: 'u2', content: 'Em đã hoàn thành phần doanh thu rồi ạ. Đang làm phần chi phí.', created: ago(12), expand: { author: expandUser('u2') } },
        { id: 'cm2', task: 't1', author: 'u1', content: 'OK, nhớ thêm biểu đồ so sánh cùng kỳ năm ngoái nhé.', created: ago(10), expand: { author: expandUser('u1') } },
        { id: 'cm3', task: 't1', author: 'u2', content: 'Dạ vâng, em sẽ xong trong hôm nay ạ.', created: ago(8), expand: { author: expandUser('u2') } },
    ],
    t2: [
        { id: 'cm4', task: 't2', author: 'u5', content: 'Em đã xem reference, có 3 hướng thiết kế.', created: ago(20), expand: { author: expandUser('u5') } },
        { id: 'cm5', task: 't2', author: 'u3', content: 'OK gửi đi, nhớ làm phong cách tối giản nhé.', created: ago(18), expand: { author: expandUser('u3') } },
    ],
    t3: [
        { id: 'cm6', task: 't3', author: 'u5', content: 'Creative đã xong, em đang upload lên Business Manager.', created: ago(5), expand: { author: expandUser('u5') } },
        { id: 'cm7', task: 't3', author: 'u3', content: 'Tốt. Nhớ setup A/B test cho copy nhé.', created: ago(4), expand: { author: expandUser('u3') } },
        { id: 'cm8', task: 't3', author: 'u1', content: 'Budget confirm 15tr/ngày. Launch ASAP.', created: ago(2), expand: { author: expandUser('u1') } },
    ],
    t4: [
        { id: 'cm9', task: 't4', author: 'u4', content: 'Nhóm A đã gọi xong, 6/10 KH quan tâm.', created: ago(15), expand: { author: expandUser('u4') } },
        { id: 'cm10', task: 't4', author: 'u2', content: 'Tốt lắm! Nhóm B cố gắng gọi xong trong ngày.', created: ago(13), expand: { author: expandUser('u2') } },
    ],
    t5: [],
    t6: [
        { id: 'cm11', task: 't6', author: 'u5', content: 'Em đã list được 20 keywords tiềm năng.', created: ago(3), expand: { author: expandUser('u5') } },
    ],
    t7: [
        { id: 'cm12', task: 't7', author: 'u2', content: 'Training hoàn thành, 2 bạn đều đạt 85%+.', created: ago(50), expand: { author: expandUser('u2') } },
        { id: 'cm13', task: 't7', author: 'u1', content: 'Tốt lắm! Cho các bạn vào thực hành.', created: ago(48), expand: { author: expandUser('u1') } },
    ],
    t8: [
        { id: 'cm14', task: 't8', author: 'u4', content: 'Khu A xong, khu B lệch số liệu.', created: ago(30), expand: { author: expandUser('u4') } },
        { id: 'cm15', task: 't8', author: 'u2', content: 'Deadline qua rồi, cần xong hôm nay.', created: ago(25), expand: { author: expandUser('u2') } },
    ],
    t9: [
        { id: 'cm16', task: 't9', author: 'u5', content: 'Đã loại 15 keywords CPC cao. QS tăng 5→7.', created: ago(10), expand: { author: expandUser('u5') } },
    ],
    t10: [],
};

export { DEMO_USERS, DEMO_TASKS, DEMO_COMMENTS };

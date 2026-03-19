import PocketBase from 'pocketbase';

const pb = new PocketBase('https://db.mkg.vn');

// Disable auto-cancellation for realtime
pb.autoCancellation(false);

// ===== AUTH =====
export async function login(usernameOrEmail, password) {
  // Auto-map shorthand username to email: admin → admin@mkg.vn
  const identity = usernameOrEmail.includes('@')
    ? usernameOrEmail
    : `${usernameOrEmail}@mkg.vn`;
  return await pb.collection('task_users').authWithPassword(identity, password);
}

export function logout() {
  pb.authStore.clear();
}

export function getCurrentUser() {
  if (pb.authStore.isValid) {
    return pb.authStore.record;
  }
  return null;
}

export function onAuthChange(callback) {
  return pb.authStore.onChange(callback);
}

// ===== ROLE HELPERS =====
const ROLE_HIERARCHY = { director: 3, manager: 2, staff: 1 };

export function canAssignTo(currentUser, targetUser) {
  return (ROLE_HIERARCHY[currentUser.role] || 0) > (ROLE_HIERARCHY[targetUser.role] || 0);
}

export function getRoleLabel(role) {
  const labels = {
    director: 'Giám đốc',
    manager: 'Trưởng phòng',
    staff: 'Nhân viên'
  };
  return labels[role] || role;
}

export function getRoleColor(role) {
  const colors = { director: '#ef4444', manager: '#f59e0b', staff: '#3b82f6' };
  return colors[role] || '#94a3b8';
}

// ===== USERS =====
export async function getUsers() {
  return await pb.collection('task_users').getFullList({ sort: '-role,name' });
}

export async function getSubordinates(currentUser) {
  const allUsers = await getUsers();
  return allUsers.filter(u => canAssignTo(currentUser, u));
}

// ===== TASKS =====
export async function getTasks(filter = '') {
  return await pb.collection('tasks').getFullList({
    sort: '-id',
    filter: filter || undefined,
  });
}

export async function getTask(id) {
  return await pb.collection('tasks').getOne(id);
}

export async function createTask(data) {
  return await pb.collection('tasks').create(data);
}

export async function updateTask(id, data) {
  return await pb.collection('tasks').update(id, data);
}

export async function deleteTask(id) {
  return await pb.collection('tasks').delete(id);
}

// ===== COMMENTS =====
export async function getComments(taskId) {
  return await pb.collection('task_comments').getFullList({
    filter: `task = "${taskId}"`,
    sort: 'id',
    expand: 'author',
  });
}

export async function getLatestComment(taskId) {
  try {
    const result = await pb.collection('task_comments').getList(1, 1, {
      filter: `task = "${taskId}"`,
      sort: '-id',
      expand: 'author',
    });
    return result.items[0] || null;
  } catch {
    return null;
  }
}

export async function createComment(taskId, authorId, content) {
  return await pb.collection('task_comments').create({
    task: taskId,
    author: authorId,
    content,
  });
}

// ===== REALTIME =====
export function subscribeToTasks(callback) {
  pb.collection('tasks').subscribe('*', callback);
  return () => pb.collection('tasks').unsubscribe('*');
}

export function subscribeToComments(taskId, callback) {
  const topic = taskId ? `task = "${taskId}"` : '*';
  pb.collection('task_comments').subscribe('*', callback);
  return () => pb.collection('task_comments').unsubscribe('*');
}

// ===== UTILS =====
export function getAvatarUrl(record) {
  if (record?.avatar) {
    return pb.files.getURL(record, record.avatar);
  }
  return null;
}

export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

export default pb;

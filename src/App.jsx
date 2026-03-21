import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useTasks } from './hooks/useTasks';
import { useNotifications } from './hooks/useNotifications';
import LoginForm from './components/LoginForm';
import Layout from './components/Layout';
import TaskCard from './components/TaskCard';
import TaskDetail from './components/TaskDetail';
import TaskForm from './components/TaskForm';
import AdminSettings from './components/AdminSettings';
import NotificationPanel from './components/NotificationPanel';
import DailyBoard from './components/DailyBoard';
import { IconSearch, IconPlus, IconList, IconGrid, IconCalendar, IconTag, IconArchive } from './components/Icons';
import { getTask, getUsers, getConfig, setConfig } from './services/pb';
import './styles/index.css';

export { useAuth };

// Default groups (fallback if PB not available)
const INITIAL_GROUPS = [
  'Đội thợ 1',
  'Đội thợ 2',
  'Phòng thiết kế',
  'Phòng kinh doanh',
  'Phòng marketing',
  'Ban giám đốc',
];

// ===== DASHBOARD =====
function Dashboard() {
  const { user, isStaff, isDirector } = useAuth();
  const { tasks, loading, addTask, editTask, removeTask, reorderTasks } = useTasks();
  const { notifications, unreadCount, markAllRead, markRead, clearAll } = useNotifications(user?.id);

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'group' | 'daily'
  const [departments, setDepartments] = useState(INITIAL_GROUPS);
  const [allUsers, setAllUsers] = useState([]);

  // Load departments from PocketBase (online sync)
  useEffect(() => {
    (async () => {
      const cfg = await getConfig('departments');
      if (cfg?.value && Array.isArray(cfg.value)) {
        setDepartments(cfg.value);
      }
      // Fetch all users for DailyBoard
      const users = await getUsers();
      setAllUsers(users);
    })();
  }, []);

  // Save departments to PocketBase when changed via admin
  async function handleUpdateDepartments(newDepts) {
    setDepartments(newDepts);
    try {
      await setConfig('departments', newDepts);
    } catch (err) {
      console.error('Failed to save departments online:', err);
    }
  }

  // Drag state
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Build GROUP_MAP dynamically from departments
  const GROUP_MAP = useMemo(() => {
    const map = {};
    departments.forEach(dept => {
      const key = 'group_' + dept.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .replace(/\s+/g, '_');
      map[key] = dept;
    });
    return map;
  }, [departments]);

  // Active tasks = not archived (status !== 'done')
  const activeTasks = useMemo(() => tasks.filter(t => t.status !== 'done'), [tasks]);
  const archivedTasks = useMemo(() => tasks.filter(t => t.status === 'done'), [tasks]);

  const filteredTasks = useMemo(() => {
    let source = filter === 'archived' ? archivedTasks : activeTasks;
    let result = [...source];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)
      );
    }
    switch (filter) {
      case 'assigned_to_me':
        result = result.filter(t => {
          const to = t.assigned_to;
          return Array.isArray(to) ? to.includes(user.id) : to === user.id;
        });
        break;
      case 'assigned_by_me':
        result = result.filter(t => t.assigned_by === user.id);
        break;
      case 'urgent':
        result = activeTasks.filter(t =>
          (t.checklist || []).some(c => c.urgent && !c.checked && c.status !== 'done')
        );
        break;
      case 'archived':
        // already using archivedTasks as source
        break;
      default:
        // Check if it's a group filter
        if (filter.startsWith('group_') && GROUP_MAP[filter]) {
          result = result.filter(t => t.group === GROUP_MAP[filter]);
        }
        break;
    }
    return result;
  }, [tasks, activeTasks, archivedTasks, filter, search, user, GROUP_MAP]);

  // Group tasks by `group` field
  const groupedTasks = useMemo(() => {
    const groups = {};
    filteredTasks.forEach(t => {
      const g = t.group || 'Chưa phân nhóm';
      if (!groups[g]) groups[g] = [];
      groups[g].push(t);
    });
    const sorted = {};
    Object.keys(groups).sort((a, b) => {
      if (a === 'Chưa phân nhóm') return 1;
      if (b === 'Chưa phân nhóm') return -1;
      return a.localeCompare(b);
    }).forEach(key => { sorted[key] = groups[key]; });
    return sorted;
  }, [filteredTasks]);

  // Collect all urgent checklist items across tasks for approval queue
  const urgentItems = useMemo(() => {
    const items = [];
    activeTasks.forEach(t => {
      (t.checklist || []).forEach((c, ci) => {
        if (c.urgent && !c.checked && c.status !== 'done') {
          items.push({ task: t, item: c, itemIndex: ci });
        }
      });
    });
    return items;
  }, [activeTasks]);

  // Per-group counts
  const groupCounts = useMemo(() => {
    const counts = {};
    activeTasks.forEach(t => {
      const g = t.group;
      if (g) counts[g] = (counts[g] || 0) + 1;
    });
    return counts;
  }, [activeTasks]);

  const taskCounts = useMemo(() => ({
    all: activeTasks.length,
    urgent: urgentItems.length,
    archived: archivedTasks.length,
    assignedToMe: activeTasks.filter(t => {
      const to = t.assigned_to;
      return Array.isArray(to) ? to.includes(user.id) : to === user.id;
    }).length,
    assignedByMe: activeTasks.filter(t => t.assigned_by === user.id).length,
    groups: groupCounts,
  }), [activeTasks, archivedTasks, user, urgentItems, groupCounts]);

  const LABELS = useMemo(() => ({
    all: 'Tất cả công việc',
    assigned_to_me: 'Việc của tôi',
    assigned_by_me: 'Việc đã giao',
    urgent: '🔴 Việc khẩn cấp',
    archived: '📦 Lưu trữ',
    ...Object.fromEntries(Object.entries(GROUP_MAP).map(([k, v]) => [k, v])),
  }), [GROUP_MAP]);

  async function handleAddTask(data) {
    await addTask(data);
    setShowForm(false);
  }

  async function handleUpdateTask(id, updates) {
    await editTask(id, updates);
    if (selectedTask?.id === id) {
      setSelectedTask(prev => prev ? { ...prev, ...updates } : prev);
    }
  }

  async function handleDeleteTask(id) {
    if (!confirm('Xóa công việc này?')) return;
    try {
      await removeTask(id);
      setSelectedTask(null);
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  }

  // Drag & Drop handlers
  const handleDragStart = useCallback((e, index) => {
    dragItem.current = index;
    e.dataTransfer.effectAllowed = 'move';
    requestAnimationFrame(() => { e.target.classList.add('dragging'); });
  }, []);

  const handleDragOver = useCallback((e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOverItem.current = index;
    setDragOverIndex(index);
  }, []);

  const handleDragEnd = useCallback((e) => {
    e.target.classList.remove('dragging');
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const fromTask = filteredTasks[dragItem.current];
      const toTask = filteredTasks[dragOverItem.current];
      const realFrom = tasks.findIndex(t => t.id === fromTask?.id);
      const realTo = tasks.findIndex(t => t.id === toTask?.id);
      if (realFrom !== -1 && realTo !== -1) reorderTasks(realFrom, realTo);
    }
    dragItem.current = null;
    dragOverItem.current = null;
    setDragOverIndex(null);
  }, [filteredTasks, tasks, reorderTasks]);

  if (loading) {
    return (
      <Layout filter={filter} onFilterChange={setFilter} taskCounts={taskCounts} departments={departments} onShowAdmin={() => setShowAdmin(true)}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 32, animation: 'spin 1s linear infinite' }}>⟳</div>
          <p style={{ color: 'var(--text-muted)' }}>Đang tải công việc...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout filter={filter} onFilterChange={setFilter} taskCounts={taskCounts} departments={departments} onShowAdmin={() => setShowAdmin(true)}>
      {/* Header */}
      <header className="header">
        <div className="header-search">
          <span className="search-icon"><IconSearch /></span>
          <input type="text" placeholder="Tìm công việc..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="header-actions">
          {/* Notifications */}
          <NotificationPanel
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAllRead={markAllRead}
            onMarkRead={markRead}
            onClearAll={clearAll}
            onClickNotif={async (taskId) => {
              try {
                const t = await getTask(taskId);
                setSelectedTask(t);
              } catch (e) { console.error(e); }
            }}
          />
          {/* View mode toggle */}
          <div className="view-toggle">
            <button className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="Xem danh sách">
              <IconList />
            </button>
            <button className={`view-toggle-btn ${viewMode === 'group' ? 'active' : ''}`} onClick={() => setViewMode('group')} title="Xem theo nhóm">
              <IconGrid />
            </button>
            <button className={`view-toggle-btn ${viewMode === 'daily' ? 'active' : ''}`} onClick={() => setViewMode('daily')} title="Bảng phân công theo ngày">
              <IconCalendar />
            </button>
          </div>
          {!isStaff && (
            <button className="btn-create desktop-only" onClick={() => setShowForm(true)}>
              <IconPlus /> Giao việc
            </button>
          )}
        </div>
      </header>

      {/* ===== URGENT APPROVAL QUEUE ===== */}
      {urgentItems.length > 0 && (
        <div className="urgent-queue">
          <div className="urgent-queue-header">
            <span className="urgent-queue-icon">🔴</span>
            <h3>Việc khẩn cần duyệt</h3>
            <span className="urgent-queue-count">{urgentItems.length}</span>
          </div>
          <div className="urgent-queue-list">
            {urgentItems.map(({ task: t, item: c, itemIndex: ci }) => (
              <div
                key={`${t.id}-${ci}`}
                className="urgent-queue-item"
                onClick={() => setSelectedTask(t)}
              >
                <span className="urgent-queue-dot">🔴</span>
                <div className="urgent-queue-info">
                  <span className="urgent-queue-task-name">{t.title}</span>
                  <span className="urgent-queue-item-text">{c.text}</span>
                  {(c.comments || []).length > 0 && (
                    <span className="urgent-queue-cmt">💬 {(c.comments || []).length} trao đổi</span>
                  )}
                </div>
                <span className="urgent-queue-arrow">›</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task grid / Daily board */}
      {viewMode === 'daily' ? (
        <DailyBoard
          tasks={activeTasks}
          onUpdateTask={handleUpdateTask}
          allUsers={allUsers}
          onSelectTask={setSelectedTask}
        />
      ) : (
        <div className="task-grid-container">
          <div className="task-grid-header">
            <h2>{LABELS[filter]}</h2>
            <span className="task-count">{filteredTasks.length} công việc</span>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><IconArchive style={{ width: 48, height: 48 }} /></div>
              <h3>Chưa có công việc nào</h3>
              <p>
                {isStaff
                  ? 'Chưa có việc nào được giao cho bạn.'
                  : 'Bấm "+" để tạo công việc mới.'
                }
              </p>
            </div>
          ) : viewMode === 'group' ? (
            /* ===== GROUP VIEW ===== */
            <div className="task-groups">
              {Object.entries(groupedTasks).map(([groupName, groupTasks]) => (
                <div key={groupName} className="task-group">
                  <div className="task-group-header">
                    <span className="task-group-icon">
                      {groupName === 'Chưa phân nhóm' ? <IconArchive /> : <IconTag />}
                    </span>
                    <h3 className="task-group-name">{groupName}</h3>
                    <span className="task-group-count">{groupTasks.length}</span>
                  </div>
                  <div className="task-grid">
                    {groupTasks.map((task, index) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        index={index}
                        isDragOver={false}
                        onClick={() => setSelectedTask(task)}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ===== LIST VIEW ===== */
            <div className="task-grid">
              {filteredTasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  isDragOver={dragOverIndex === index}
                  onClick={() => setSelectedTask(task)}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* FAB - Floating Action Button */}
      {!isStaff && (
        <button className="fab-button" onClick={() => setShowForm(true)} title="Giao việc mới">
          <span className="fab-icon"><IconPlus /></span>
          <span className="fab-label">Giao việc</span>
        </button>
      )}

      {/* Modals */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
          groups={departments}
        />
      )}
      {showForm && (
        <TaskForm
          onClose={() => setShowForm(false)}
          onSubmit={handleAddTask}
          groups={departments}
        />
      )}
      {showAdmin && (
        <AdminSettings
          onClose={() => setShowAdmin(false)}
          departments={departments}
          onDepartmentsChange={handleUpdateDepartments}
        />
      )}
    </Layout>
  );
}

// ===== APP ROOT =====
function AppInner() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <p>Đang khởi động...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginForm />;
  return <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

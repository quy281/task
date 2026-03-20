import { useState, useMemo, useRef, useCallback } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useTasks } from './hooks/useTasks';
import LoginForm from './components/LoginForm';
import Layout from './components/Layout';
import TaskCard from './components/TaskCard';
import TaskDetail from './components/TaskDetail';
import TaskForm from './components/TaskForm';
import './styles/index.css';

export { useAuth };

// Default groups
const DEFAULT_GROUPS = [
  'Đội thợ 1',
  'Đội thợ 2',
  'Phòng thiết kế',
  'Phòng kinh doanh',
  'Phòng marketing',
  'Ban giám đốc',
];

// ===== DASHBOARD =====
function Dashboard() {
  const { user, isStaff } = useAuth();
  const { tasks, loading, addTask, editTask, reorderTasks } = useTasks();

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'group'

  // Drag state
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const filteredTasks = useMemo(() => {
    let result = [...tasks];
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
      case 'todo': result = result.filter(t => t.status === 'todo'); break;
      case 'in_progress': result = result.filter(t => t.status === 'in_progress'); break;
      case 'done': result = result.filter(t => t.status === 'done'); break;
      case 'urgent':
        result = result.filter(t =>
          (t.checklist || []).some(c => c.urgent && !c.checked && c.status !== 'done')
        );
        break;
      case 'overdue':
        result = result.filter(t =>
          t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
        );
        break;
      default: break;
    }
    return result;
  }, [tasks, filter, search, user]);

  // Group tasks by `group` field
  const groupedTasks = useMemo(() => {
    const groups = {};
    filteredTasks.forEach(t => {
      const g = t.group || 'Chưa phân nhóm';
      if (!groups[g]) groups[g] = [];
      groups[g].push(t);
    });
    // Sort: named groups first, then ungrouped
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
    tasks.forEach(t => {
      (t.checklist || []).forEach((c, ci) => {
        if (c.urgent && !c.checked && c.status !== 'done') {
          items.push({ task: t, item: c, itemIndex: ci });
        }
      });
    });
    return items;
  }, [tasks]);

  const taskCounts = useMemo(() => ({
    all: tasks.length,
    urgent: urgentItems.length,
    assignedToMe: tasks.filter(t => {
      const to = t.assigned_to;
      return Array.isArray(to) ? to.includes(user.id) : to === user.id;
    }).length,
    assignedByMe: tasks.filter(t => t.assigned_by === user.id).length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'done').length,
    overdue: tasks.filter(t =>
      t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
    ).length,
  }), [tasks, user, urgentItems]);

  const LABELS = {
    all: 'Tất cả công việc',
    assigned_to_me: 'Việc của tôi',
    assigned_by_me: 'Việc đã giao',
    urgent: '🔴 Việc khẩn cấp',
    todo: 'Chờ làm',
    in_progress: 'Đang làm',
    done: 'Hoàn thành',
    overdue: 'Quá hạn',
  };

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
      <Layout filter={filter} onFilterChange={setFilter} taskCounts={taskCounts}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 32, animation: 'spin 1s linear infinite' }}>⟳</div>
          <p style={{ color: 'var(--text-muted)' }}>Đang tải công việc...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout filter={filter} onFilterChange={setFilter} taskCounts={taskCounts}>
      {/* Header */}
      <header className="header">
        <div className="header-search">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Tìm công việc..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="header-actions">
          {/* View mode toggle */}
          <div className="view-toggle">
            <button className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="Xem danh sách">
              ☰
            </button>
            <button className={`view-toggle-btn ${viewMode === 'group' ? 'active' : ''}`} onClick={() => setViewMode('group')} title="Xem theo nhóm">
              ▤
            </button>
          </div>
          {!isStaff && (
            <button className="btn-create desktop-only" onClick={() => setShowForm(true)}>
              <span>+</span> Giao việc
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

      {/* Task grid */}
      <div className="task-grid-container">
        <div className="task-grid-header">
          <h2>{LABELS[filter]}</h2>
          <span className="task-count">{filteredTasks.length} công việc</span>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>Chưa có công việc nào</h3>
            <p>
              {isStaff
                ? 'Chưa có việc nào được giao cho bạn.'
                : 'Bấm "+ Giao việc" để tạo công việc mới.'
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
                    {groupName === 'Chưa phân nhóm' ? '📦' : '🏷️'}
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

      {/* FAB - Floating Action Button */}
      {!isStaff && (
        <button className="fab-button" onClick={() => setShowForm(true)} title="Giao việc mới">
          <span className="fab-icon">+</span>
          <span className="fab-label">Giao việc</span>
        </button>
      )}

      {/* Modals */}
      {selectedTask && (
        <TaskDetail task={selectedTask} onClose={() => setSelectedTask(null)} onUpdate={handleUpdateTask} />
      )}
      {showForm && (
        <TaskForm
          onClose={() => setShowForm(false)}
          onSubmit={handleAddTask}
          groups={DEFAULT_GROUPS}
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

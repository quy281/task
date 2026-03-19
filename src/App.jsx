import { useState, useMemo } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useTasks } from './hooks/useTasks';
import LoginForm from './components/LoginForm';
import Layout from './components/Layout';
import TaskCard from './components/TaskCard';
import TaskDetail from './components/TaskDetail';
import TaskForm from './components/TaskForm';
import './styles/index.css';

// Re-export useAuth for Layout (which imports from '../App')
export { useAuth };

// ===== DASHBOARD =====
function Dashboard() {
  const { user, isStaff } = useAuth();
  const { tasks, loading, addTask, editTask } = useTasks();

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showForm, setShowForm] = useState(false);

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
      case 'overdue':
        result = result.filter(t =>
          t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
        );
        break;
      default: break;
    }
    return result;
  }, [tasks, filter, search, user]);

  const taskCounts = useMemo(() => ({
    all: tasks.length,
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
  }), [tasks, user]);

  const LABELS = {
    all: 'Tất cả công việc',
    assigned_to_me: 'Việc của tôi',
    assigned_by_me: 'Việc đã giao',
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
    // Update selectedTask locally too
    if (selectedTask?.id === id) {
      setSelectedTask(prev => prev ? { ...prev, ...updates } : prev);
    }
  }

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
          <input
            type="text"
            placeholder="Tìm công việc..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="header-actions">
          {!isStaff && (
            <button className="btn-create" onClick={() => setShowForm(true)}>
              <span>+</span> Giao việc
            </button>
          )}
        </div>
      </header>

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
        ) : (
          <div className="task-grid">
            {filteredTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => setSelectedTask(task)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdateTask}
        />
      )}
      {showForm && (
        <TaskForm
          onClose={() => setShowForm(false)}
          onSubmit={handleAddTask}
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
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg)',
      }}>
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

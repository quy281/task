import { useState, useEffect, useMemo, useRef, createContext, useContext } from 'react';
import { DEMO_USERS, DEMO_TASKS, DEMO_COMMENTS } from './data/demo';
import LoginForm from './components/LoginForm';
import Layout from './components/Layout';
import TaskCard from './components/TaskCard';
import { getInitials, getRoleLabel, getRoleColor, canAssignTo, timeAgo, formatDate } from './services/pb';
import './styles/index.css';

// ===== DEMO AUTH CONTEXT =====
const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// ===== STATUS HELPERS =====
const STATUS_ICONS = {
  todo: '○',
  in_progress: '◐',
  done: '✓',
  fail: '✕',
};

function AppContent() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('task_manager_tasks_v2');
    return saved ? JSON.parse(saved) : DEMO_TASKS;
  });
  const [comments, setComments] = useState(() => {
    const saved = localStorage.getItem('task_manager_comments_v2');
    return saved ? JSON.parse(saved) : DEMO_COMMENTS;
  });

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    localStorage.setItem('task_manager_tasks_v2', JSON.stringify(tasks));
  }, [tasks]);
  useEffect(() => {
    localStorage.setItem('task_manager_comments_v2', JSON.stringify(comments));
  }, [comments]);

  function login(email) {
    const found = DEMO_USERS.find(u => u.email === email);
    if (found) { setUser(found); return true; }
    throw new Error('Invalid');
  }
  function logout() { setUser(null); }

  function addTask(data) {
    const newTask = {
      ...data, id: 't' + Date.now(), created: new Date().toISOString(),
      expand: {
        assigned_by: DEMO_USERS.find(u => u.id === data.assigned_by),
        assigned_to: (data.assigned_to || []).map(id => DEMO_USERS.find(u => u.id === id)).filter(Boolean),
      }
    };
    setTasks(prev => [newTask, ...prev]);
    setComments(prev => ({ ...prev, [newTask.id]: [] }));
    return newTask;
  }

  function editTask(id, updates) {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const updated = { ...t, ...updates };
      if (updates.assigned_to) {
        updated.expand = { ...t.expand, assigned_to: updates.assigned_to.map(uid => DEMO_USERS.find(u => u.id === uid)).filter(Boolean) };
      }
      return updated;
    }));
    if (selectedTask?.id === id) {
      setSelectedTask(prev => prev ? { ...prev, ...updates } : prev);
    }
  }

  function addComment(taskId, content) {
    const c = { id: 'cm' + Date.now(), task: taskId, author: user.id, content, created: new Date().toISOString(), expand: { author: user } };
    setComments(prev => ({ ...prev, [taskId]: [...(prev[taskId] || []), c] }));
    return c;
  }

  function getTaskComments(taskId) { return comments[taskId] || []; }
  function getLatestComment(taskId) {
    const c = comments[taskId] || [];
    return c.length > 0 ? c[c.length - 1] : null;
  }
  function getSubordinatesForUser() {
    return user ? DEMO_USERS.filter(u => canAssignTo(user, u)) : [];
  }

  const authValue = useMemo(() => ({
    user, loading: false, login, logout,
    isDirector: user?.role === 'director', isManager: user?.role === 'manager', isStaff: user?.role === 'staff',
    canAssign: user ? (target) => canAssignTo(user, target) : () => false,
    roleLabel: user ? getRoleLabel(user.role) : '',
  }), [user]);

  if (!user) return <AuthContext.Provider value={authValue}><LoginForm /></AuthContext.Provider>;

  return (
    <AuthContext.Provider value={authValue}>
      <Dashboard
        tasks={tasks} filter={filter} setFilter={setFilter}
        search={search} setSearch={setSearch}
        selectedTask={selectedTask} setSelectedTask={setSelectedTask}
        showForm={showForm} setShowForm={setShowForm}
        addTask={addTask} editTask={editTask}
        getLatestComment={getLatestComment} getTaskComments={getTaskComments}
        addComment={addComment} getSubordinates={getSubordinatesForUser}
      />
    </AuthContext.Provider>
  );
}

// ===== DASHBOARD =====
function Dashboard({ tasks, filter, setFilter, search, setSearch, selectedTask, setSelectedTask, showForm, setShowForm, addTask, editTask, getLatestComment, getTaskComments, addComment, getSubordinates }) {
  const { user, isStaff } = useAuth();

  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
    }
    switch (filter) {
      case 'assigned_to_me': result = result.filter(t => { const to = t.assigned_to; return Array.isArray(to) ? to.includes(user.id) : to === user.id; }); break;
      case 'assigned_by_me': result = result.filter(t => t.assigned_by === user.id); break;
      case 'todo': result = result.filter(t => t.status === 'todo'); break;
      case 'in_progress': result = result.filter(t => t.status === 'in_progress'); break;
      case 'done': result = result.filter(t => t.status === 'done'); break;
      case 'overdue': result = result.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'); break;
    }
    return result;
  }, [tasks, filter, search, user]);

  const taskCounts = useMemo(() => ({
    all: tasks.length,
    assignedToMe: tasks.filter(t => { const to = t.assigned_to; return Array.isArray(to) ? to.includes(user.id) : to === user.id; }).length,
    assignedByMe: tasks.filter(t => t.assigned_by === user.id).length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'done').length,
    overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length,
  }), [tasks, user]);

  const LABELS = { all: 'Tất cả công việc', assigned_to_me: 'Việc của tôi', assigned_by_me: 'Việc đã giao', todo: 'Chờ làm', in_progress: 'Đang làm', done: 'Hoàn thành', overdue: 'Quá hạn' };

  return (
    <Layout filter={filter} onFilterChange={setFilter} taskCounts={taskCounts}>
      <header className="header">
        <div className="header-search"><span className="search-icon">🔍</span><input type="text" placeholder="Tìm công việc..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="header-actions">{!isStaff && <button className="btn-create" onClick={() => setShowForm(true)}><span>+</span> Giao việc</button>}</div>
      </header>
      <div className="task-grid-container">
        <div className="task-grid-header"><h2>{LABELS[filter]}</h2><span className="task-count">{filteredTasks.length} công việc</span></div>
        {filteredTasks.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📭</div><h3>Chưa có công việc nào</h3><p>{isStaff ? 'Chưa có việc nào được giao cho bạn.' : 'Bấm "+ Giao việc" để tạo công việc mới.'}</p></div>
        ) : (
          <div className="task-grid">{filteredTasks.map(task => <TaskCard key={task.id} task={task} latestComment={getLatestComment(task.id)} onClick={() => setSelectedTask(task)} />)}</div>
        )}
      </div>
      {selectedTask && <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} onUpdate={editTask} getComments={getTaskComments} addComment={addComment} />}
      {showForm && <TaskFormModal onClose={() => setShowForm(false)} onSubmit={addTask} getSubordinates={getSubordinates} />}
    </Layout>
  );
}

// ===== ENHANCED CHECKLIST COMPONENT =====
function EnhancedChecklist({ checklist, onChange, user }) {
  const [expandedItem, setExpandedItem] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [dragSide, setDragSide] = useState(null); // 'top' | 'bottom' | 'indent'
  const [commentInputs, setCommentInputs] = useState({});
  const [newItemText, setNewItemText] = useState('');
  const newItemRef = useRef(null);

  const doneCount = checklist.filter(c => c.status === 'done').length;

  function addNewItem() {
    if (!newItemText.trim()) return;
    const newItem = { id: 'c' + Date.now(), text: newItemText.trim(), status: 'todo', level: 0, comments: [] };
    onChange([...checklist, newItem]);
    setNewItemText('');
    setTimeout(() => newItemRef.current?.focus(), 50);
  }

  function cycleStatus(index, e) {
    e.stopPropagation();
    const order = ['todo', 'in_progress', 'done', 'fail'];
    const current = checklist[index].status || 'todo';
    const next = order[(order.indexOf(current) + 1) % order.length];
    const updated = [...checklist];
    updated[index] = { ...updated[index], status: next };
    onChange(updated);
  }

  function setItemStatus(index, status) {
    const updated = [...checklist];
    updated[index] = { ...updated[index], status };
    onChange(updated);
  }

  function toggleExpand(index) {
    setExpandedItem(expandedItem === index ? null : index);
  }

  function addItemComment(index) {
    const text = commentInputs[index]?.trim();
    if (!text) return;
    const updated = [...checklist];
    const newComment = { id: 'ic' + Date.now(), author: user.id, content: text, created: new Date().toISOString() };
    updated[index] = { ...updated[index], comments: [...(updated[index].comments || []), newComment] };
    onChange(updated);
    setCommentInputs(prev => ({ ...prev, [index]: '' }));
  }

  // Drag & Drop
  function handleDragStart(e, index) {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  }

  function handleDragOver(e, index) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const x = e.clientX - rect.left;
    const height = rect.height;

    // If dragging to the right side → indent (make subtask)
    if (x > rect.width * 0.65) {
      setDragOverIndex(index);
      setDragSide('indent');
    } else if (y < height / 2) {
      setDragOverIndex(index);
      setDragSide('top');
    } else {
      setDragOverIndex(index);
      setDragSide('bottom');
    }
  }

  function handleDragEnd() {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const updated = [...checklist];
      const [moved] = updated.splice(dragIndex, 1);

      if (dragSide === 'indent') {
        // Increase level (max 2)
        moved.level = Math.min((moved.level || 0) + 1, 2);
        const insertAt = dragIndex < dragOverIndex ? dragOverIndex : dragOverIndex + 1;
        updated.splice(insertAt, 0, moved);
      } else {
        const insertAt = dragSide === 'top'
          ? (dragIndex < dragOverIndex ? dragOverIndex - 1 : dragOverIndex)
          : (dragIndex < dragOverIndex ? dragOverIndex : dragOverIndex + 1);
        updated.splice(Math.max(0, insertAt), 0, moved);
      }
      onChange(updated);
    }
    setDragIndex(null);
    setDragOverIndex(null);
    setDragSide(null);
  }

  function handleDragLeave() {
    setDragOverIndex(null);
    setDragSide(null);
  }

  function getAuthorName(authorId) {
    return DEMO_USERS.find(u => u.id === authorId)?.name || 'Ẩn danh';
  }

  return (
    <div className="enhanced-checklist">
      <h3>Checklist ({doneCount}/{checklist.length})</h3>
      <div className="checklist-progress" style={{ marginBottom: 12 }}>
        <div className="checklist-bar" style={{ height: 6 }}>
          <div className="checklist-bar-fill" style={{
            width: `${checklist.length > 0 ? (doneCount / checklist.length) * 100 : 0}%`,
            background: doneCount === checklist.length ? 'var(--status-done)' : 'var(--accent)',
          }} />
        </div>
      </div>

      <div className="ecl-list">
        {checklist.map((item, i) => {
          const isExpanded = expandedItem === i;
          const itemComments = item.comments || [];
          const dragClass = dragIndex === i ? ' dragging' : '';
          const overClass = dragOverIndex === i ? ` drag-over-${dragSide}` : '';

          return (
            <div
              key={item.id}
              className={`ecl-item${dragClass}${overClass}`}
              data-level={item.level || 0}
              data-status={item.status || 'todo'}
              draggable
              onDragStart={e => handleDragStart(e, i)}
              onDragOver={e => handleDragOver(e, i)}
              onDragLeave={handleDragLeave}
              onDragEnd={handleDragEnd}
            >
              <div className="ecl-row" onClick={() => toggleExpand(i)}>
                <span className="ecl-drag-handle" onMouseDown={e => e.stopPropagation()}>⋮⋮</span>

                <button
                  className="ecl-status-btn"
                  data-status={item.status || 'todo'}
                  onClick={e => cycleStatus(i, e)}
                  title="Click để đổi trạng thái"
                >
                  {STATUS_ICONS[item.status || 'todo']}
                </button>

                <span className="ecl-text">{item.text}</span>

                <div className="ecl-icons">
                  {itemComments.length > 0 && (
                    <span className="ecl-icon has-comments" title={`${itemComments.length} trao đổi`}>
                      💬{itemComments.length > 1 ? itemComments.length : ''}
                    </span>
                  )}
                  {item.status === 'done' && <span className="ecl-icon status-done">✓</span>}
                  {item.status === 'fail' && <span className="ecl-icon status-fail">✕</span>}
                  {item.status === 'in_progress' && <span className="ecl-icon status-progress">◐</span>}
                </div>
              </div>

              {isExpanded && (
                <div className="ecl-detail">
                  <div className="ecl-detail-header">
                    <span className="ecl-detail-title">{item.text}</span>
                    <div className="ecl-detail-status-picker">
                      {['todo', 'in_progress', 'done', 'fail'].map(s => (
                        <button
                          key={s}
                          className={`ecl-status-pick ${item.status === s ? 'active' : ''}`}
                          data-s={s}
                          onClick={e => { e.stopPropagation(); setItemStatus(i, s); }}
                          title={s === 'todo' ? 'Chờ làm' : s === 'in_progress' ? 'Đang làm' : s === 'done' ? 'Xong' : 'Lỗi'}
                        >
                          {STATUS_ICONS[s]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="ecl-comments">
                    {itemComments.length === 0 && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0' }}>Chưa có trao đổi</p>
                    )}
                    {itemComments.map(c => (
                      <div key={c.id} className="ecl-comment">
                        <div className="ecl-comment-avatar">{getInitials(getAuthorName(c.author))}</div>
                        <div className="ecl-comment-body">
                          <span className="ecl-comment-name">{getAuthorName(c.author)}</span>
                          <span className="ecl-comment-time">{timeAgo(c.created)}</span>
                          <div className="ecl-comment-text">{c.content}</div>
                        </div>
                      </div>
                    ))}

                    <div className="ecl-comment-input" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        placeholder="Trao đổi về mục này..."
                        value={commentInputs[i] || ''}
                        onChange={e => setCommentInputs(prev => ({ ...prev, [i]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') addItemComment(i); }}
                      />
                      <button onClick={() => addItemComment(i)}>Gửi</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Google Keep-style add item */}
      <div className="ecl-row ecl-add-row" style={{ opacity: 1 }}>
        <span style={{ width: 18 }} />
        <span className="ecl-status-btn" data-status="todo" style={{ opacity: 0.4 }}>+</span>
        <input
          ref={newItemRef}
          type="text"
          className="ecl-add-input"
          placeholder="Thêm mục..."
          value={newItemText}
          onChange={e => setNewItemText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNewItem(); } }}
          style={{
            flex: 1, border: 'none', background: 'transparent',
            fontSize: 13.5, fontFamily: 'inherit', outline: 'none',
            color: 'var(--text-secondary)', padding: '4px 0',
          }}
        />
        {newItemText.trim() && (
          <button
            onClick={addNewItem}
            style={{
              padding: '4px 10px', fontSize: 12, fontWeight: 600,
              background: 'var(--accent)', color: 'white',
              border: 'none', borderRadius: 6, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >Thêm</button>
        )}
      </div>
    </div>
  );
}

// ===== TASK DETAIL MODAL =====
function TaskDetailModal({ task, onClose, onUpdate, getComments, addComment }) {
  const { user } = useAuth();
  const [taskComments, setTaskComments] = useState(getComments(task.id));
  const [newComment, setNewComment] = useState('');
  const [checklist, setChecklist] = useState(task.checklist || []);

  useEffect(() => {
    setTaskComments(getComments(task.id));
    setChecklist(task.checklist || []);
  }, [task.id]);

  function handleSendComment(e) {
    e.preventDefault();
    if (!newComment.trim()) return;
    const c = addComment(task.id, newComment.trim());
    setTaskComments(prev => [...prev, c]);
    setNewComment('');
  }

  function handleChecklistChange(newChecklist) {
    setChecklist(newChecklist);
    onUpdate(task.id, { checklist: newChecklist });
  }

  function handleStatusChange(status) {
    onUpdate(task.id, { status });
  }

  const assignedBy = task.expand?.assigned_by;
  const assignedTo = task.expand?.assigned_to;
  const assignees = Array.isArray(assignedTo) ? assignedTo : assignedTo ? [assignedTo] : [];
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  const SL = { todo: 'Chờ làm', in_progress: 'Đang làm', done: 'Hoàn thành', overdue: 'Quá hạn' };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-top">
            <h2 className="modal-title">{task.title}</h2>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
          <div className="modal-meta">
            <span className={`badge ${task.status === 'done' ? 'badge-done' : isOverdue ? 'badge-overdue' : task.status === 'in_progress' ? 'badge-progress' : 'badge-todo'}`}>
              {isOverdue ? 'Quá hạn' : SL[task.status]}
            </span>
            {task.priority && <span className={`badge badge-${task.priority}`}>{task.priority === 'urgent' ? '🔥 Gấp' : task.priority === 'high' ? 'Ưu tiên cao' : task.priority === 'medium' ? 'Trung bình' : 'Thấp'}</span>}
            {task.due_date && <div className="modal-meta-item">📅 <strong>{formatDate(task.due_date)}</strong></div>}
            {assignedBy && <div className="modal-meta-item">Giao bởi: <strong>{assignedBy.name}</strong> ({getRoleLabel(assignedBy.role)})</div>}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            {['todo', 'in_progress', 'done'].map(s => (
              <button key={s} onClick={() => handleStatusChange(s)} style={{
                padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: '1.5px solid', cursor: 'pointer', fontFamily: 'inherit',
                background: task.status === s ? (s === 'done' ? '#f0fdf4' : s === 'in_progress' ? '#eff6ff' : '#f8fafc') : 'white',
                borderColor: task.status === s ? (s === 'done' ? '#22c55e' : s === 'in_progress' ? '#3b82f6' : '#94a3b8') : 'var(--border)',
                color: task.status === s ? (s === 'done' ? '#22c55e' : s === 'in_progress' ? '#3b82f6' : '#64748b') : 'var(--text-muted)',
              }}>{SL[s]}</button>
            ))}
          </div>
        </div>

        <div className="modal-body">
          {task.description && <div className="modal-description">{task.description}</div>}

          {assignees.length > 0 && (
            <div className="modal-assigned">
              <h3>Người thực hiện</h3>
              <div className="assigned-list">
                {assignees.map((p, i) => (
                  <div key={i} className="assigned-person">
                    <div className="assigned-person-avatar">{getInitials(p.name)}</div>
                    <span>{p.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{getRoleLabel(p.role)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {checklist.length > 0 && (
            <EnhancedChecklist checklist={checklist} onChange={handleChecklistChange} user={user} />
          )}

          <div className="comments-section">
            <h3>Trao đổi chung ({taskComments.length})</h3>
            {taskComments.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có trao đổi nào</p>}
            {taskComments.map(c => {
              const author = c.expand?.author;
              return (
                <div key={c.id} className="comment-item">
                  <div className="comment-avatar">{getInitials(author?.name)}</div>
                  <div className="comment-bubble">
                    <div className="comment-bubble-header">
                      <span className="name">{author?.name || 'Ẩn danh'}</span>
                      <span className="time">{timeAgo(c.created)}</span>
                    </div>
                    <div className="comment-bubble-text">{c.content}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <form className="comment-input-area" onSubmit={handleSendComment}>
          <input type="text" placeholder="Viết trao đổi..." value={newComment} onChange={e => setNewComment(e.target.value)} />
          <button type="submit" disabled={!newComment.trim()}>Gửi</button>
        </form>
      </div>
    </div>
  );
}

// ===== TASK FORM MODAL =====
function TaskFormModal({ onClose, onSubmit, getSubordinates }) {
  const { user } = useAuth();
  const subordinates = getSubordinates();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState([]);
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [color, setColor] = useState('default');
  const [checklistItems, setChecklistItems] = useState([]);
  const [newItem, setNewItem] = useState('');

  const COLORS = [
    { name: 'default', hex: '#ffffff' }, { name: 'blue', hex: '#e8f0fe' },
    { name: 'green', hex: '#e6f7ed' }, { name: 'yellow', hex: '#fef7e0' },
    { name: 'pink', hex: '#fde8ef' }, { name: 'purple', hex: '#f0e6ff' },
    { name: 'orange', hex: '#fff0e6' },
  ];

  function addItem() {
    if (!newItem.trim()) return;
    setChecklistItems([...checklistItems, { id: Date.now().toString(), text: newItem.trim(), status: 'todo', level: 0, comments: [] }]);
    setNewItem('');
  }
  function toggleAssignee(uid) { setAssignedTo(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]); }

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), description: description.trim(), assigned_by: user.id, assigned_to: assignedTo, status: 'todo', priority, due_date: dueDate || null, color, checklist: checklistItems });
    onClose();
  }

  return (
    <div className="modal-overlay form-modal" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-top"><h2 className="modal-title">Giao việc mới</h2><button className="modal-close" onClick={onClose}>✕</button></div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group"><label>Tiêu đề *</label><input type="text" placeholder="Nhập tiêu đề..." value={title} onChange={e => setTitle(e.target.value)} required autoFocus /></div>
            <div className="form-group"><label>Mô tả</label><textarea placeholder="Mô tả chi tiết..." value={description} onChange={e => setDescription(e.target.value)} rows={3} /></div>
            <div className="form-row">
              <div className="form-group"><label>Ưu tiên</label><select value={priority} onChange={e => setPriority(e.target.value)}><option value="low">Thấp</option><option value="medium">Trung bình</option><option value="high">Cao</option><option value="urgent">🔥 Khẩn cấp</option></select></div>
              <div className="form-group"><label>Deadline</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
            </div>

            <div className="form-group">
              <label>Giao cho</label>
              {subordinates.length === 0 ? <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Không có cấp dưới</p> : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {subordinates.map(sub => (
                    <button key={sub.id} type="button" onClick={() => toggleAssignee(sub.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                      background: assignedTo.includes(sub.id) ? 'var(--accent-bg)' : 'var(--bg-input)',
                      border: `1.5px solid ${assignedTo.includes(sub.id) ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                      color: assignedTo.includes(sub.id) ? 'var(--accent)' : 'var(--text-secondary)', transition: 'all 0.15s',
                    }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: getRoleColor(sub.role), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white' }}>{getInitials(sub.name)}</span>
                      <span>{sub.name}</span>
                      <span style={{ fontSize: 11, opacity: 0.7 }}>{getRoleLabel(sub.role)}</span>
                      {assignedTo.includes(sub.id) && <span>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Checklist</label>
              <div className="form-checklist-input">
                <input type="text" placeholder="Thêm mục..." value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }} />
                <button type="button" onClick={addItem}>+ Thêm</button>
              </div>
              <div className="form-checklist-list">
                {checklistItems.map((item, i) => (
                  <div key={item.id} className="form-checklist-item"><span>☐ {item.text}</span><button type="button" onClick={() => setChecklistItems(checklistItems.filter((_, j) => j !== i))}>✕</button></div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Màu card</label>
              <div className="color-picker">
                {COLORS.map(c => <div key={c.name} className={`color-dot ${color === c.name ? 'selected' : ''}`} style={{ background: c.hex, border: c.hex === '#ffffff' ? '2px solid var(--border)' : undefined }} onClick={() => setColor(c.name)} />)}
              </div>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn-primary" disabled={!title.trim()}>Giao việc</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  return <AppContent />;
}

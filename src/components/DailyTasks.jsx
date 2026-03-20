import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';

function loadDailyTasks(userId) {
    try {
        const saved = localStorage.getItem(`daily_tasks_${userId}`);
        if (saved) return JSON.parse(saved);
    } catch { }
    return [];
}

function saveDailyTasks(userId, tasks) {
    localStorage.setItem(`daily_tasks_${userId}`, JSON.stringify(tasks));
}

export default function DailyTasks() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [newText, setNewText] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (user?.id) setTasks(loadDailyTasks(user.id));
    }, [user?.id]);

    function persist(updated) {
        setTasks(updated);
        if (user?.id) saveDailyTasks(user.id, updated);
    }

    function handleAdd() {
        if (!newText.trim()) return;
        const item = {
            id: Date.now().toString(),
            text: newText.trim(),
            done: false,
            created: new Date().toISOString(),
        };
        persist([...tasks, item]);
        setNewText('');
        inputRef.current?.focus();
    }

    function handleToggle(id) {
        const updated = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
        persist(updated);
    }

    function handleDelete(id) {
        persist(tasks.filter(t => t.id !== id));
    }

    function handleClearDone() {
        persist(tasks.filter(t => !t.done));
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
    }

    const doneCount = tasks.filter(t => t.done).length;
    const pendingTasks = tasks.filter(t => !t.done);
    const doneTasks = tasks.filter(t => t.done);

    return (
        <div className="daily-tasks">
            <div className="daily-header">
                <h3>📝 Việc cá nhân</h3>
                {doneCount > 0 && (
                    <button className="daily-clear-btn" onClick={handleClearDone}>
                        Xóa {doneCount} việc xong
                    </button>
                )}
            </div>

            {/* Add input */}
            <div className="daily-add">
                <span className="daily-add-icon">+</span>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Thêm việc cá nhân..."
                    value={newText}
                    onChange={e => setNewText(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                {newText.trim() && (
                    <button className="daily-add-btn" onClick={handleAdd}>Thêm</button>
                )}
            </div>

            {/* All tasks in order */}
            <div className="daily-list">
                {pendingTasks.map(t => (
                    <div key={t.id} className="daily-item">
                        <label className="daily-checkbox">
                            <input
                                type="checkbox"
                                checked={t.done}
                                onChange={() => handleToggle(t.id)}
                            />
                            <span className="daily-checkmark" />
                        </label>
                        <span className="daily-item-text">{t.text}</span>
                        <button className="daily-item-del" onClick={() => handleDelete(t.id)} title="Xóa">✕</button>
                    </div>
                ))}
            </div>

            {/* Done tasks */}
            {doneTasks.length > 0 && (
                <div className="daily-done-section">
                    <div className="daily-done-label">✅ Đã xong ({doneTasks.length})</div>
                    {doneTasks.map(t => (
                        <div key={t.id} className="daily-item done">
                            <label className="daily-checkbox">
                                <input
                                    type="checkbox"
                                    checked={t.done}
                                    onChange={() => handleToggle(t.id)}
                                />
                                <span className="daily-checkmark" />
                            </label>
                            <span className="daily-item-text">{t.text}</span>
                            <button className="daily-item-del" onClick={() => handleDelete(t.id)} title="Xóa">✕</button>
                        </div>
                    ))}
                </div>
            )}

            {tasks.length === 0 && (
                <div className="daily-empty">
                    Chưa có việc nào — ghi nhanh việc cần làm trong ngày.
                </div>
            )}
        </div>
    );
}

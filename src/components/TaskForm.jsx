import { useState, useEffect } from 'react';
import { getSubordinates, getInitials, getRoleLabel, getRoleColor } from '../services/pb';
import { useAuth } from '../hooks/useAuth';

const CARD_COLORS = [
    { name: 'default', hex: '#ffffff' },
    { name: 'blue', hex: '#e8f0fe' },
    { name: 'green', hex: '#e6f7ed' },
    { name: 'yellow', hex: '#fef7e0' },
    { name: 'pink', hex: '#fde8ef' },
    { name: 'purple', hex: '#f0e6ff' },
    { name: 'orange', hex: '#fff0e6' },
];

export default function TaskForm({ onClose, onSubmit }) {
    const { user } = useAuth();
    const [subordinates, setSubordinates] = useState([]);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [assignedTo, setAssignedTo] = useState([]);
    const [priority, setPriority] = useState('medium');
    const [dueDate, setDueDate] = useState('');
    const [color, setColor] = useState('default');
    const [checklistItems, setChecklistItems] = useState([]);
    const [newItem, setNewItem] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadSubordinates();
    }, []);

    async function loadSubordinates() {
        try {
            const subs = await getSubordinates(user);
            setSubordinates(subs);
        } catch (err) {
            console.error('Failed to load subordinates:', err);
        }
    }

    function addChecklistItem() {
        if (!newItem.trim()) return;
        setChecklistItems([...checklistItems, { id: Date.now().toString(), text: newItem.trim(), checked: false }]);
        setNewItem('');
    }

    function removeChecklistItem(index) {
        setChecklistItems(checklistItems.filter((_, i) => i !== index));
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            addChecklistItem();
        }
    }

    function toggleAssignee(userId) {
        setAssignedTo(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        try {
            await onSubmit({
                title: title.trim(),
                description: description.trim(),
                assigned_by: user.id,
                assigned_to: assignedTo,
                status: 'todo',
                priority,
                due_date: dueDate || null,
                color,
                checklist: checklistItems,
            });
            onClose();
        } catch (err) {
            console.error('Failed to create task:', err);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="modal-overlay form-modal" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-header-top">
                        <h2 className="modal-title">Giao việc mới</h2>
                        <button className="modal-close" onClick={onClose}>✕</button>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label>Tiêu đề *</label>
                            <input
                                type="text"
                                placeholder="Nhập tiêu đề công việc..."
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                required autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label>Mô tả</label>
                            <textarea
                                placeholder="Mô tả chi tiết công việc..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={3}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Ưu tiên</label>
                                <select value={priority} onChange={e => setPriority(e.target.value)}>
                                    <option value="low">Thấp</option>
                                    <option value="medium">Trung bình</option>
                                    <option value="high">Cao</option>
                                    <option value="urgent">🔥 Khẩn cấp</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Deadline</label>
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Assign to */}
                        <div className="form-group">
                            <label>Giao cho</label>
                            {subordinates.length === 0 ? (
                                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                    Không có nhân viên cấp dưới
                                </p>
                            ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {subordinates.map(sub => (
                                        <button
                                            key={sub.id}
                                            type="button"
                                            onClick={() => toggleAssignee(sub.id)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 8,
                                                padding: '8px 14px',
                                                background: assignedTo.includes(sub.id) ? 'var(--accent-bg)' : 'var(--bg-input)',
                                                border: `1.5px solid ${assignedTo.includes(sub.id) ? 'var(--accent)' : 'var(--border)'}`,
                                                borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                                                color: assignedTo.includes(sub.id) ? 'var(--accent)' : 'var(--text-secondary)',
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            <span style={{
                                                width: 24, height: 24, borderRadius: '50%',
                                                background: getRoleColor(sub.role),
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 10, fontWeight: 700, color: 'white',
                                            }}>
                                                {getInitials(sub.name)}
                                            </span>
                                            <span>{sub.name}</span>
                                            <span style={{ fontSize: 11, opacity: 0.7 }}>
                                                {getRoleLabel(sub.role)}
                                            </span>
                                            {assignedTo.includes(sub.id) && <span>✓</span>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Checklist */}
                        <div className="form-group">
                            <label>Checklist</label>
                            <div className="form-checklist-input">
                                <input
                                    type="text"
                                    placeholder="Thêm mục công việc..."
                                    value={newItem}
                                    onChange={e => setNewItem(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                />
                                <button type="button" onClick={addChecklistItem}>+ Thêm</button>
                            </div>
                            <div className="form-checklist-list">
                                {checklistItems.map((item, i) => (
                                    <div key={item.id} className="form-checklist-item">
                                        <span>☐ {item.text}</span>
                                        <button type="button" onClick={() => removeChecklistItem(i)}>✕</button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Color */}
                        <div className="form-group">
                            <label>Màu card</label>
                            <div className="color-picker">
                                {CARD_COLORS.map(c => (
                                    <div
                                        key={c.name}
                                        className={`color-dot ${color === c.name ? 'selected' : ''}`}
                                        style={{ background: c.hex, border: c.hex === '#ffffff' ? '2px solid var(--border)' : undefined }}
                                        onClick={() => setColor(c.name)}
                                        title={c.name}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>Hủy</button>
                        <button type="submit" className="btn-primary" disabled={submitting || !title.trim()}>
                            {submitting ? 'Đang tạo...' : 'Giao việc'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function TaskForm({ onClose, onSubmit, groups = [] }) {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [checklistItems, setChecklistItems] = useState([]);
    const [newItem, setNewItem] = useState('');
    const [group, setGroup] = useState('');
    const [submitting, setSubmitting] = useState(false);

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

    function handleTitleKeyDown(e) {
        if (e.key === 'Enter' && title.trim()) {
            e.preventDefault();
            handleSubmit(e);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        try {
            await onSubmit({
                title: title.trim(),
                description: '',
                assigned_by: user.id,
                assigned_to: [],
                status: 'in_progress',
                priority: 'medium',
                due_date: null,
                color: 'default',
                checklist: checklistItems,
                group: group || null,
            });
            onClose();
        } catch (err) {
            console.error('Failed to create task:', err);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="modal-overlay keep-modal" onClick={onClose}>
            <div className="keep-form" onClick={e => e.stopPropagation()}>
                {/* Title */}
                <input
                    className="keep-title-input"
                    type="text"
                    placeholder="Tiêu đề công việc..."
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    onKeyDown={handleTitleKeyDown}
                    autoFocus
                />

                {/* Checklist items */}
                {checklistItems.length > 0 && (
                    <div className="keep-checklist">
                        {checklistItems.map((item, i) => (
                            <div key={item.id} className="keep-checklist-item">
                                <span className="keep-check-icon">☐</span>
                                <span className="keep-check-text">{item.text}</span>
                                <button type="button" className="keep-check-remove" onClick={() => removeChecklistItem(i)}>✕</button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add checklist item */}
                <div className="keep-add-item">
                    <span className="keep-add-icon">+</span>
                    <input
                        type="text"
                        placeholder="Thêm mục công việc..."
                        value={newItem}
                        onChange={e => setNewItem(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                </div>

                {/* Bottom toolbar */}
                <div className="keep-toolbar">
                    <select
                        className="keep-group-select"
                        value={group}
                        onChange={e => setGroup(e.target.value)}
                    >
                        <option value="">🏷️ Nhóm/Phòng ban</option>
                        {groups.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>

                    <div className="keep-actions">
                        <button type="button" className="keep-btn-cancel" onClick={onClose}>Hủy</button>
                        <button
                            type="button"
                            className="keep-btn-submit"
                            onClick={handleSubmit}
                            disabled={submitting || !title.trim()}
                        >
                            {submitting ? '...' : 'Tạo'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

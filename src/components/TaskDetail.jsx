import { useState, useEffect, useRef } from 'react';
import { getComments, createComment, getInitials, timeAgo, getRoleLabel, formatDate } from '../services/pb';
import { useAuth } from '../hooks/useAuth';

const STATUS_LABEL = {
    todo: 'Chờ làm',
    in_progress: 'Đang làm',
    done: 'Hoàn thành',
    overdue: 'Quá hạn',
};

export default function TaskDetail({ task, onClose, onUpdate }) {
    const { user } = useAuth();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [sending, setSending] = useState(false);
    const [checklist, setChecklist] = useState(task.checklist || []);
    const commentsEndRef = useRef(null);

    useEffect(() => {
        loadComments();
    }, [task.id]);

    useEffect(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [comments]);

    async function loadComments() {
        try {
            const data = await getComments(task.id);
            setComments(data);
        } catch (err) {
            console.error('Failed to load comments:', err);
        }
    }

    async function handleSendComment(e) {
        e.preventDefault();
        if (!newComment.trim() || !user) return;
        setSending(true);
        try {
            await createComment(task.id, user.id, newComment.trim());
            setNewComment('');
            await loadComments();
        } catch (err) {
            console.error('Failed to send comment:', err);
        } finally {
            setSending(false);
        }
    }

    async function handleToggleChecklist(index) {
        const updated = [...checklist];
        updated[index] = { ...updated[index], checked: !updated[index].checked };
        setChecklist(updated);
        try {
            await onUpdate(task.id, { checklist: updated });
        } catch (err) {
            // Revert on error
            setChecklist(task.checklist || []);
        }
    }

    async function handleStatusChange(newStatus) {
        try {
            await onUpdate(task.id, { status: newStatus });
        } catch (err) {
            console.error('Failed to update status:', err);
        }
    }

    const assignedBy = task.expand?.assigned_by;
    const assignedTo = task.expand?.assigned_to;
    const assignees = Array.isArray(assignedTo) ? assignedTo : assignedTo ? [assignedTo] : [];
    const checkedCount = checklist.filter(c => c.checked).length;
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <div className="modal-header-top">
                        <h2 className="modal-title">{task.title}</h2>
                        <button className="modal-close" onClick={onClose}>✕</button>
                    </div>
                    <div className="modal-meta">
                        <span className={`badge ${task.status === 'done' ? 'badge-done' : isOverdue ? 'badge-overdue' : `badge-${task.status === 'in_progress' ? 'progress' : task.status}`}`}>
                            {isOverdue ? 'Quá hạn' : STATUS_LABEL[task.status]}
                        </span>
                        {task.priority && (
                            <span className={`badge badge-${task.priority}`}>
                                {task.priority === 'urgent' ? '🔥 Gấp' : task.priority === 'high' ? 'Ưu tiên cao' : task.priority === 'medium' ? 'Trung bình' : 'Thấp'}
                            </span>
                        )}
                        {task.due_date && (
                            <div className="modal-meta-item">
                                📅 <strong>{formatDate(task.due_date)}</strong>
                            </div>
                        )}
                        {assignedBy && (
                            <div className="modal-meta-item">
                                Giao bởi: <strong>{assignedBy.name}</strong> ({getRoleLabel(assignedBy.role)})
                            </div>
                        )}
                    </div>

                    {/* Quick status buttons */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                        {['todo', 'in_progress', 'done'].map(s => (
                            <button
                                key={s}
                                onClick={() => handleStatusChange(s)}
                                style={{
                                    padding: '5px 12px', fontSize: 12, fontWeight: 600,
                                    borderRadius: 6, border: '1.5px solid',
                                    cursor: 'pointer', fontFamily: 'inherit',
                                    background: task.status === s ? (s === 'done' ? '#f0fdf4' : s === 'in_progress' ? '#eff6ff' : '#f8fafc') : 'white',
                                    borderColor: task.status === s ? (s === 'done' ? '#22c55e' : s === 'in_progress' ? '#3b82f6' : '#94a3b8') : 'var(--border)',
                                    color: task.status === s ? (s === 'done' ? '#22c55e' : s === 'in_progress' ? '#3b82f6' : '#64748b') : 'var(--text-muted)',
                                }}
                            >
                                {STATUS_LABEL[s]}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div className="modal-body">
                    {/* Description */}
                    {task.description && (
                        <div className="modal-description">{task.description}</div>
                    )}

                    {/* Assigned to */}
                    {assignees.length > 0 && (
                        <div className="modal-assigned">
                            <h3>Người thực hiện</h3>
                            <div className="assigned-list">
                                {assignees.map((person, i) => (
                                    <div key={i} className="assigned-person">
                                        <div className="assigned-person-avatar">{getInitials(person.name)}</div>
                                        <span>{person.name}</span>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                            {getRoleLabel(person.role)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Checklist */}
                    {checklist.length > 0 && (
                        <div className="modal-checklist">
                            <h3>Checklist ({checkedCount}/{checklist.length})</h3>
                            <div className="checklist-progress" style={{ marginBottom: 10 }}>
                                <div className="checklist-bar" style={{ height: 6 }}>
                                    <div
                                        className="checklist-bar-fill"
                                        style={{
                                            width: `${checklist.length > 0 ? (checkedCount / checklist.length) * 100 : 0}%`,
                                            background: checkedCount === checklist.length ? 'var(--status-done)' : 'var(--accent)',
                                        }}
                                    />
                                </div>
                            </div>
                            {checklist.map((item, i) => (
                                <div
                                    key={i}
                                    className={`checklist-item ${item.checked ? 'checked' : ''}`}
                                    onClick={() => handleToggleChecklist(i)}
                                >
                                    <input
                                        type="checkbox"
                                        checked={item.checked}
                                        onChange={() => handleToggleChecklist(i)}
                                        onClick={e => e.stopPropagation()}
                                    />
                                    <span>{item.text}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Comments */}
                    <div className="comments-section">
                        <h3>Trao đổi ({comments.length})</h3>
                        {comments.length === 0 && (
                            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có trao đổi nào</p>
                        )}
                        {comments.map(comment => {
                            const author = comment.expand?.author;
                            return (
                                <div key={comment.id} className="comment-item">
                                    <div className="comment-avatar">{getInitials(author?.name)}</div>
                                    <div className="comment-bubble">
                                        <div className="comment-bubble-header">
                                            <span className="name">{author?.name || 'Ẩn danh'}</span>
                                            <span className="time">{timeAgo(comment.created)}</span>
                                        </div>
                                        <div className="comment-bubble-text">{comment.content}</div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={commentsEndRef} />
                    </div>
                </div>

                {/* Comment input */}
                <form className="comment-input-area" onSubmit={handleSendComment}>
                    <input
                        type="text"
                        placeholder="Viết trao đổi..."
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        disabled={sending}
                    />
                    <button type="submit" disabled={sending || !newComment.trim()}>
                        {sending ? '...' : 'Gửi'}
                    </button>
                </form>
            </div>
        </div>
    );
}

import { getInitials, timeAgo } from '../services/pb';

const COLOR_MAP = {
    blue: 'color-blue', green: 'color-green', yellow: 'color-yellow',
    pink: 'color-pink', purple: 'color-purple', orange: 'color-orange',
};

const STATUS_LABEL = { todo: 'Chờ làm', in_progress: 'Đang làm', done: 'Hoàn thành', overdue: 'Quá hạn' };
const STATUS_CLASS = { todo: 'badge-todo', in_progress: 'badge-progress', done: 'badge-done', overdue: 'badge-overdue' };
const PRIORITY_CLASS = { low: 'badge-low', medium: 'badge-medium', high: 'badge-high', urgent: 'badge-urgent' };
const PRIORITY_LABEL = { low: 'Thấp', medium: 'TB', high: 'Cao', urgent: '🔥 Gấp' };
const STATUS_ICONS = { todo: '○', in_progress: '◐', done: '✓', fail: '✕' };

export default function TaskCard({ task, index, isDragOver, onClick, onDragStart, onDragOver, onDragEnd, latestComment }) {
    const checklist = task.checklist || [];
    const doneCount = checklist.filter(c => c.checked || c.status === 'done').length;
    const totalCount = checklist.length;
    const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
    const hasUrgent = checklist.some(c => c.urgent);

    const assignedTo = task.expand?.assigned_to;
    const assignees = Array.isArray(assignedTo) ? assignedTo : assignedTo ? [assignedTo] : [];
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

    return (
        <div
            className={`task-card ${COLOR_MAP[task.color] || ''} ${isDragOver ? 'drag-over' : ''}`}
            draggable
            onDragStart={e => onDragStart?.(e, index)}
            onDragOver={e => onDragOver?.(e, index)}
            onDragEnd={e => onDragEnd?.(e)}
            onClick={() => onClick?.(task)}
        >
            {/* Header */}
            <div className="task-card-header">
                <div className="task-card-title">{task.title}</div>
                <div className="task-card-badges">
                    {hasUrgent && <span className="badge badge-urgent-flag">🔴 Khẩn</span>}
                    <span className={`badge ${STATUS_CLASS[isOverdue ? 'overdue' : task.status]}`}>
                        {isOverdue ? 'Quá hạn' : STATUS_LABEL[task.status]}
                    </span>
                </div>
            </div>

            {/* Priority */}
            {task.priority && task.priority !== 'low' && (
                <span className={`badge ${PRIORITY_CLASS[task.priority]}`} style={{ marginBottom: 8 }}>
                    {PRIORITY_LABEL[task.priority]}
                </span>
            )}

            {/* Enhanced checklist preview with status icons & comment indicators */}
            {totalCount > 0 && (
                <div className="task-card-checklist">
                    <div className="checklist-progress">
                        <span>✓ {doneCount}/{totalCount}</span>
                        <div className="checklist-bar">
                            <div className="checklist-bar-fill" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                    <div style={{ marginTop: 6 }}>
                        {checklist.slice(0, 4).map((item, i) => {
                            const isDone = item.checked || item.status === 'done';
                            return (
                                <div
                                    key={i}
                                    className="ecl-preview-item"
                                    data-level={item.level || 0}
                                    data-status={isDone ? 'done' : (item.status || 'todo')}
                                >
                                    <span className="ecl-preview-status" data-status={isDone ? 'done' : (item.status || 'todo')}>
                                        {isDone ? '✅' : STATUS_ICONS[item.status || 'todo']}
                                    </span>
                                    <span className={`ecl-preview-text ${isDone ? 'ecl-done' : ''}`}>{item.text}</span>
                                    <span className="ecl-preview-icons">
                                        {item.urgent && <span className="ecl-urgent" title="Khẩn cấp">🔴</span>}
                                        {(item.comments?.length > 0) && <span className="has-cmt" title={`${item.comments.length} trao đổi`}>💬</span>}
                                    </span>
                                </div>
                            );
                        })}
                        {checklist.length > 4 && (
                            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', paddingTop: 2 }}>
                                +{checklist.length - 4} mục nữa...
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="task-card-footer">
                <div className="task-card-assignees">
                    {assignees.slice(0, 3).map((person, i) => (
                        <div key={i} className="task-card-assignee" title={person.name}>{getInitials(person.name)}</div>
                    ))}
                    {assignees.length > 3 && <div className="task-card-assignee" style={{ background: '#94a3b8' }}>+{assignees.length - 3}</div>}
                </div>
                {task.due_date && (
                    <div className={`task-card-due ${isOverdue ? 'overdue' : ''}`}>
                        📅 {new Date(task.due_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                    </div>
                )}
            </div>

            {/* Latest comment */}
            {latestComment && (
                <div className="task-card-comment">
                    <div>
                        <span className="comment-author">{latestComment.expand?.author?.name || 'Ẩn danh'}:</span>
                        <span className="comment-text">{latestComment.content}</span>
                    </div>
                    <div className="comment-time">{timeAgo(latestComment.created)}</div>
                </div>
            )}
        </div>
    );
}

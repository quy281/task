import { useState, useEffect, useRef, useCallback } from 'react';
import { getComments, createComment, getInitials, timeAgo, getRoleLabel, formatDate } from '../services/pb';
import { useAuth } from '../hooks/useAuth';

const STATUS_LABEL = {
    todo: 'Chờ làm', in_progress: 'Đang làm', done: 'Hoàn thành', overdue: 'Quá hạn',
};

export default function TaskDetail({ task, onClose, onUpdate }) {
    const { user } = useAuth();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [sending, setSending] = useState(false);
    const [checklist, setChecklist] = useState(task.checklist || []);
    const [newItemText, setNewItemText] = useState('');
    const [expandedItem, setExpandedItem] = useState(null); // id of item whose comments are open
    const [itemComment, setItemComment] = useState('');
    const commentsEndRef = useRef(null);

    // Drag state
    const dragItemRef = useRef(null);
    const dragOverItemRef = useRef(null);
    const dragStartX = useRef(0);
    const [draggingIdx, setDraggingIdx] = useState(null);
    const [dragOverIdx, setDragOverIdx] = useState(null);
    const [indentPreview, setIndentPreview] = useState(null);
    const touchStartPos = useRef({ x: 0, y: 0 });
    const touchCurrentItem = useRef(null);
    const touchMode = useRef(null);
    const listRef = useRef(null);

    useEffect(() => { loadComments(); }, [task.id]);
    useEffect(() => { commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [comments]);
    useEffect(() => { setChecklist(task.checklist || []); }, [task.id, task.checklist]);

    async function loadComments() {
        try { setComments(await getComments(task.id)); } catch (err) { console.error(err); }
    }

    async function handleSendComment(e) {
        e.preventDefault();
        if (!newComment.trim() || !user) return;
        setSending(true);
        try { await createComment(task.id, user.id, newComment.trim()); setNewComment(''); await loadComments(); }
        catch (err) { console.error(err); }
        finally { setSending(false); }
    }

    // Persist checklist helper
    function persistChecklist(updated) {
        setChecklist(updated);
        onUpdate(task.id, { checklist: updated }).catch(() => setChecklist(task.checklist || []));
    }

    function handleToggleChecklist(index) {
        const updated = [...checklist];
        const newChecked = !updated[index].checked;
        updated[index] = { ...updated[index], checked: newChecked, status: newChecked ? 'done' : 'todo' };
        persistChecklist(updated);
    }

    function handleStatusChange(newStatus) {
        onUpdate(task.id, { status: newStatus }).catch(err => console.error(err));
    }

    // Toggle urgent flag on checklist item
    function handleToggleUrgent(index) {
        const updated = [...checklist];
        updated[index] = { ...updated[index], urgent: !updated[index].urgent };
        persistChecklist(updated);
    }

    // Add comment to checklist item
    function handleAddItemComment(index) {
        if (!itemComment.trim() || !user) return;
        const updated = [...checklist];
        const item = updated[index];
        const newCmt = {
            id: 'ic_' + Date.now(),
            author: user.id,
            authorName: user.name,
            content: itemComment.trim(),
            created: new Date().toISOString(),
        };
        updated[index] = { ...item, comments: [...(item.comments || []), newCmt] };
        setItemComment('');
        persistChecklist(updated);
    }

    // Add new checklist item
    function handleAddItem() {
        if (!newItemText.trim()) return;
        const newItem = { id: Date.now().toString(), text: newItemText.trim(), checked: false, status: 'todo', level: 0, comments: [], urgent: false };
        persistChecklist([...checklist, newItem]);
        setNewItemText('');
    }

    function handleItemKeyDown(e) {
        if (e.key === 'Enter') { e.preventDefault(); handleAddItem(); }
    }

    // ===== DRAG: vertical reorder + horizontal indent =====
    const handleDragStart = useCallback((e, index) => {
        dragItemRef.current = index; dragStartX.current = e.clientX; setDraggingIdx(index);
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleDragOver = useCallback((e, index) => {
        e.preventDefault(); e.dataTransfer.dropEffect = 'move';
        dragOverItemRef.current = index; setDragOverIdx(index);
        const dx = e.clientX - dragStartX.current;
        setIndentPreview(dx > 40 ? 'indent' : dx < -40 ? 'outdent' : null);
    }, []);

    const handleDragEnd = useCallback(() => {
        const from = dragItemRef.current;
        const to = dragOverItemRef.current;
        if (from !== null) {
            let newList = [...checklist];
            if (indentPreview === 'indent') {
                newList[from] = { ...newList[from], level: Math.min((newList[from].level || 0) + 1, 2) };
            } else if (indentPreview === 'outdent') {
                newList[from] = { ...newList[from], level: Math.max((newList[from].level || 0) - 1, 0) };
            } else if (to !== null && from !== to) {
                const [moved] = newList.splice(from, 1); newList.splice(to, 0, moved);
            }
            persistChecklist(newList);
        }
        dragItemRef.current = null; dragOverItemRef.current = null;
        setDraggingIdx(null); setDragOverIdx(null); setIndentPreview(null);
    }, [checklist, indentPreview]);

    const handleTouchStart = useCallback((e, index) => {
        touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        touchCurrentItem.current = index; touchMode.current = null; setDraggingIdx(index);
    }, []);

    const handleTouchMove = useCallback((e) => {
        if (touchCurrentItem.current === null) return;
        const dx = e.touches[0].clientX - touchStartPos.current.x;
        const dy = e.touches[0].clientY - touchStartPos.current.y;
        if (!touchMode.current && (Math.abs(dx) > 15 || Math.abs(dy) > 15)) {
            touchMode.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
        }
        if (touchMode.current === 'horizontal') {
            e.preventDefault();
            setIndentPreview(dx > 40 ? 'indent' : dx < -40 ? 'outdent' : null);
        } else if (touchMode.current === 'vertical') {
            const listEl = listRef.current; if (!listEl) return;
            const items = listEl.querySelectorAll('.ck-item');
            for (let i = 0; i < items.length; i++) {
                const rect = items[i].getBoundingClientRect();
                if (e.touches[0].clientY >= rect.top && e.touches[0].clientY <= rect.bottom) {
                    setDragOverIdx(i); dragOverItemRef.current = i; break;
                }
            }
        }
    }, []);

    const handleTouchEnd = useCallback(() => {
        const from = touchCurrentItem.current;
        if (from !== null) {
            let newList = [...checklist];
            if (touchMode.current === 'horizontal' && indentPreview) {
                const item = newList[from];
                newList[from] = { ...item, level: indentPreview === 'indent' ? Math.min((item.level || 0) + 1, 2) : Math.max((item.level || 0) - 1, 0) };
            } else if (touchMode.current === 'vertical') {
                const to = dragOverItemRef.current;
                if (to !== null && from !== to) { const [moved] = newList.splice(from, 1); newList.splice(to, 0, moved); }
            }
            persistChecklist(newList);
        }
        touchCurrentItem.current = null; dragOverItemRef.current = null; touchMode.current = null;
        setDraggingIdx(null); setDragOverIdx(null); setIndentPreview(null);
    }, [checklist, indentPreview]);

    const assignedBy = task.expand?.assigned_by;
    const assignedTo = task.expand?.assigned_to;
    const assignees = Array.isArray(assignedTo) ? assignedTo : assignedTo ? [assignedTo] : [];
    const checkedCount = checklist.filter(c => c.checked).length;
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content task-detail-modal" onClick={e => e.stopPropagation()}>
                {/* Header - simplified */}
                <div className="modal-header">
                    <div className="modal-header-top">
                        <h2 className="modal-title">{task.title}</h2>
                        <button className="modal-close" onClick={onClose}>✕</button>
                    </div>
                    {task.group && <span className="badge badge-group" style={{ marginTop: 6, display: 'inline-block' }}>🏷️ {task.group}</span>}
                </div>

                {/* Body - straight to checklist */}
                <div className="modal-body">

                    {/* ===== CHECKLIST with comments per item ===== */}
                    <div className="modal-checklist">
                        <h3>Checklist ({checkedCount}/{checklist.length})</h3>
                        {checklist.length > 0 && (
                            <div className="checklist-progress" style={{ marginBottom: 10 }}>
                                <div className="checklist-bar" style={{ height: 6 }}>
                                    <div className="checklist-bar-fill" style={{
                                        width: `${(checkedCount / checklist.length) * 100}%`,
                                        background: checkedCount === checklist.length ? 'var(--status-done)' : 'var(--accent)',
                                    }} />
                                </div>
                            </div>
                        )}

                        {indentPreview && (
                            <div className="ck-indent-hint">
                                {indentPreview === 'indent' ? '→ Thụt vào (sub-task)' : '← Lùi ra'}
                            </div>
                        )}

                        <div className="ck-list" ref={listRef}>
                            {checklist.map((item, i) => {
                                const cmtCount = (item.comments || []).length;
                                const isExpanded = expandedItem === (item.id || i);

                                return (
                                    <div key={item.id || i} className="ck-item-wrapper">
                                        <div
                                            className={`ck-item ${draggingIdx === i ? 'ck-dragging' : ''} ${dragOverIdx === i ? 'ck-drag-over' : ''} ${item.urgent ? 'ck-urgent' : ''}`}
                                            data-level={item.level || 0}
                                            draggable
                                            onDragStart={e => handleDragStart(e, i)}
                                            onDragOver={e => handleDragOver(e, i)}
                                            onDragEnd={handleDragEnd}
                                            onTouchStart={e => handleTouchStart(e, i)}
                                            onTouchMove={e => handleTouchMove(e, i)}
                                            onTouchEnd={handleTouchEnd}
                                        >
                                            <span className="ck-drag-handle">⠿</span>
                                            <input type="checkbox" checked={item.checked} onChange={() => handleToggleChecklist(i)} onClick={e => e.stopPropagation()} />
                                            <span className={`ck-text ${item.checked ? 'ck-done' : ''}`}>{item.text}</span>

                                            {/* Icons row */}
                                            <div className="ck-icons">
                                                {item.urgent && <span className="ck-icon-urgent" title="Khẩn cấp">🔴</span>}
                                                <button className={`ck-icon-btn ${item.urgent ? 'active' : ''}`} onClick={e => { e.stopPropagation(); handleToggleUrgent(i); }} title="Đánh dấu khẩn cấp">
                                                    ⚡
                                                </button>
                                                <button className={`ck-icon-btn ${cmtCount > 0 ? 'has-comments' : ''}`} onClick={e => { e.stopPropagation(); setExpandedItem(isExpanded ? null : (item.id || i)); setItemComment(''); }} title={`${cmtCount} trao đổi`}>
                                                    💬 {cmtCount > 0 && <span className="ck-cmt-count">{cmtCount}</span>}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Inline comments for this item */}
                                        {isExpanded && (
                                            <div className="ck-comments" data-level={item.level || 0}>
                                                {(item.comments || []).length === 0 && (
                                                    <div className="ck-cmt-empty">Chưa có trao đổi</div>
                                                )}
                                                {(item.comments || []).map(cmt => (
                                                    <div key={cmt.id} className="ck-cmt">
                                                        <span className="ck-cmt-avatar">{getInitials(cmt.authorName || 'U')}</span>
                                                        <div className="ck-cmt-body">
                                                            <span className="ck-cmt-name">{cmt.authorName || 'Ẩn danh'}</span>
                                                            <span className="ck-cmt-text">{cmt.content}</span>
                                                            <span className="ck-cmt-time">{timeAgo(cmt.created)}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                                <div className="ck-cmt-input">
                                                    <input
                                                        type="text"
                                                        placeholder="Viết trao đổi..."
                                                        value={itemComment}
                                                        onChange={e => setItemComment(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddItemComment(i); } }}
                                                    />
                                                    <button onClick={() => handleAddItemComment(i)} disabled={!itemComment.trim()}>Gửi</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Add item */}
                        <div className="ck-add-item">
                            <span className="ck-add-icon">+</span>
                            <input type="text" placeholder="Thêm mục..." value={newItemText} onChange={e => setNewItemText(e.target.value)} onKeyDown={handleItemKeyDown} />
                        </div>
                    </div>

                    {/* Task-level comments */}
                    <div className="comments-section">
                        <h3>Trao đổi ({comments.length})</h3>
                        {comments.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có trao đổi nào</p>}
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
                    <input type="text" placeholder="Viết trao đổi..." value={newComment} onChange={e => setNewComment(e.target.value)} disabled={sending} />
                    <button type="submit" disabled={sending || !newComment.trim()}>{sending ? '...' : 'Gửi'}</button>
                </form>
            </div>
        </div>
    );
}

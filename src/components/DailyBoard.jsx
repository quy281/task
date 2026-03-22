import { useState, useMemo, useCallback, useRef } from 'react';
import { IconCheck, IconAlertCircle, IconClipboard, IconSend, IconPlus } from './Icons';
import { getInitials } from '../services/pb';
import { useAuth } from '../hooks/useAuth';

/**
 * DailyBoard - Bảng Phân Công Theo Đội
 * 
 * Flow thực tế:
 * 1. Sáng: GĐ list CV chưa sắp xếp (nháp riêng) → kéo thả vào các đội
 * 2. Trợ lý bổ sung thêm việc để theo dõi nhân viên
 * 3. Nút "Hoãn" để chuyển CV sang ngày mai
 * 4. Tối: Xem báo cáo tổng hợp theo đội
 * 
 * Quy tắc:
 * - CV chưa sắp xếp = nháp riêng, chỉ người tạo/người được giao thấy
 * - Khi đưa vào đội = công khai, ai cũng thấy
 */

function getTomorrow() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(8, 0, 0, 0);
    return d;
}

export default function DailyBoard({ tasks, onUpdateTask, allUsers = [], onSelectTask, departments = [] }) {
    const { user } = useAuth();
    const [draggedTaskId, setDraggedTaskId] = useState(null);
    const [dragOverCol, setDragOverCol] = useState(null);
    const [showReport, setShowReport] = useState(false);
    const [touchDragging, setTouchDragging] = useState(null);
    const boardRef = useRef(null);
    const colRefs = useRef({});

    // Active tasks only (not done)
    const activeTasks = useMemo(() => tasks.filter(t => t.status !== 'done'), [tasks]);

    // Group tasks by department/team
    const tasksByGroup = useMemo(() => {
        const map = { _unassigned: [] };
        departments.forEach(dept => { map[dept] = []; });

        activeTasks.forEach(task => {
            if (!task.group || !departments.includes(task.group)) {
                map._unassigned.push(task);
            } else {
                map[task.group].push(task);
            }
        });

        return map;
    }, [activeTasks, departments]);

    // Filter unassigned: only show user's own tasks (drafts)
    const myDrafts = useMemo(() => {
        if (!user) return [];
        return tasksByGroup._unassigned.filter(task => {
            // Show if user created this task
            if (task.assigned_by === user.id) return true;
            // Show if user is assigned to this task
            const to = task.assigned_to;
            if (Array.isArray(to) && to.includes(user.id)) return true;
            if (to === user.id) return true;
            return false;
        });
    }, [tasksByGroup._unassigned, user]);

    // Report data - summary per team (only assigned/public tasks)
    const reportData = useMemo(() => {
        const teamReports = departments.map(dept => {
            const teamTasks = tasksByGroup[dept] || [];
            const completed = teamTasks.filter(t => {
                const cl = t.checklist || [];
                return cl.length > 0 && cl.every(c => c.checked);
            });
            const inProgress = teamTasks.filter(t => {
                const cl = t.checklist || [];
                return cl.length > 0 && cl.some(c => c.checked) && !cl.every(c => c.checked);
            });
            const notStarted = teamTasks.filter(t => {
                const cl = t.checklist || [];
                return cl.length === 0 || cl.every(c => !c.checked);
            });
            return { dept, total: teamTasks.length, completed, inProgress, notStarted, tasks: teamTasks };
        });

        const totalAssigned = departments.reduce((sum, d) => sum + (tasksByGroup[d] || []).length, 0);
        return { teamReports, totalTasks: totalAssigned };
    }, [tasksByGroup, departments]);

    // === DRAG HANDLERS (Mouse) ===
    const handleDragStart = useCallback((e, taskId) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', taskId);
        requestAnimationFrame(() => {
            e.target.classList.add('dragging');
        });
    }, []);

    const handleDragOver = useCallback((e, colKey) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverCol(colKey);
    }, []);

    const handleDragLeave = useCallback((e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const { clientX, clientY } = e;
        if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
            setDragOverCol(null);
        }
    }, []);

    const handleDrop = useCallback((e, colKey) => {
        e.preventDefault();
        setDragOverCol(null);
        const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
        if (!taskId) return;

        if (colKey === '_unassigned') {
            onUpdateTask(taskId, { group: '' });
        } else {
            onUpdateTask(taskId, { group: colKey });
        }
        setDraggedTaskId(null);
    }, [draggedTaskId, onUpdateTask]);

    const handleDragEnd = useCallback((e) => {
        e.target.classList.remove('dragging');
        setDraggedTaskId(null);
        setDragOverCol(null);
    }, []);

    // === TOUCH HANDLERS (Mobile) ===
    const handleTouchStart = useCallback((e, taskId) => {
        const touch = e.touches[0];
        setTouchDragging({
            taskId,
            startX: touch.clientX,
            startY: touch.clientY,
            currentX: touch.clientX,
            currentY: touch.clientY,
            active: false,
        });
    }, []);

    const handleTouchMove = useCallback((e) => {
        if (!touchDragging) return;
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - touchDragging.startX);
        const dy = Math.abs(touch.clientY - touchDragging.startY);

        if (!touchDragging.active && (dx > 10 || dy > 10)) {
            setTouchDragging(prev => ({ ...prev, active: true }));
        }

        if (touchDragging.active) {
            e.preventDefault();
            setTouchDragging(prev => ({
                ...prev,
                currentX: touch.clientX,
                currentY: touch.clientY,
            }));

            const colKeys = ['_unassigned', ...departments];
            for (const key of colKeys) {
                const el = colRefs.current[key];
                if (el) {
                    const rect = el.getBoundingClientRect();
                    if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
                        touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
                        setDragOverCol(key);
                        return;
                    }
                }
            }
            setDragOverCol(null);
        }
    }, [touchDragging, departments]);

    const handleTouchEnd = useCallback(() => {
        if (touchDragging?.active && dragOverCol) {
            const taskId = touchDragging.taskId;
            if (dragOverCol === '_unassigned') {
                onUpdateTask(taskId, { group: '' });
            } else {
                onUpdateTask(taskId, { group: dragOverCol });
            }
        }
        setTouchDragging(null);
        setDragOverCol(null);
    }, [touchDragging, dragOverCol, onUpdateTask]);

    // Postpone task to tomorrow
    const handlePostpone = useCallback((e, taskId) => {
        e.stopPropagation();
        e.preventDefault();
        const tomorrow = getTomorrow();
        onUpdateTask(taskId, { due_date: tomorrow.toISOString() });
    }, [onUpdateTask]);

    // Copy report to clipboard
    function handleCopyReport() {
        const lines = [];
        const now = new Date();
        const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
        lines.push(`📋 BÁO CÁO PHÂN CÔNG NGÀY ${dateStr}`);
        lines.push('━'.repeat(40));

        reportData.teamReports.forEach(({ dept, total, completed, inProgress, notStarted }) => {
            if (total === 0) return;
            lines.push('');
            lines.push(`👥 ${dept} (${total} việc)`);
            if (completed.length) {
                completed.forEach(t => lines.push(`  ✅ ${t.title}`));
            }
            if (inProgress.length) {
                inProgress.forEach(t => {
                    const cl = t.checklist || [];
                    const done = cl.filter(c => c.checked).length;
                    lines.push(`  🔄 ${t.title} (${done}/${cl.length})`);
                });
            }
            if (notStarted.length) {
                notStarted.forEach(t => lines.push(`  ⬜ ${t.title}`));
            }
        });

        lines.push('');
        lines.push('━'.repeat(40));
        lines.push(`Tổng: ${reportData.totalTasks} việc đã phân công`);

        navigator.clipboard.writeText(lines.join('\n')).then(() => {
            alert('✅ Đã copy báo cáo!');
        }).catch(() => {
            prompt('Copy báo cáo:', lines.join('\n'));
        });
    }

    // Get user name helper
    const getUserName = useCallback((userId) => {
        const u = allUsers.find(u => u.id === userId);
        return u ? u.name || u.username : '';
    }, [allUsers]);

    // Team column colors
    const teamColors = [
        { bg: '#e8f4fd', border: '#4A90D9', header: '#4A90D9' },
        { bg: '#fef3e2', border: '#f59e0b', header: '#d97706' },
        { bg: '#f0fdf4', border: '#22c55e', header: '#16a34a' },
        { bg: '#fdf2f8', border: '#ec4899', header: '#db2777' },
        { bg: '#f5f3ff', border: '#8b5cf6', header: '#7c3aed' },
        { bg: '#fef2f2', border: '#ef4444', header: '#dc2626' },
    ];

    const getTeamColor = (index) => teamColors[index % teamColors.length];

    return (
        <div
            className="team-board"
            ref={boardRef}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Header */}
            <div className="team-board-header">
                <div className="team-board-title-row">
                    <h2>📋 Bảng phân công theo đội</h2>
                    <div className="team-board-actions">
                        <button className="btn-report" onClick={() => setShowReport(!showReport)}>
                            <IconClipboard /> {showReport ? 'Ẩn báo cáo' : 'Xem báo cáo'}
                        </button>
                    </div>
                </div>
                <p className="team-board-hint">Kéo CV từ bản nháp vào đội để phân công • Nháp chỉ bạn thấy</p>
            </div>

            {/* Report panel */}
            {showReport && (
                <div className="team-report">
                    <div className="team-report-header">
                        <h3>📊 Báo cáo phân công</h3>
                        <button className="btn-copy-report" onClick={handleCopyReport}>
                            📎 Copy báo cáo
                        </button>
                    </div>
                    <div className="team-report-grid">
                        {reportData.teamReports.map(({ dept, total, completed, inProgress, notStarted }) => (
                            <div key={dept} className="team-report-card">
                                <div className="team-report-card-header">
                                    <span className="team-report-name">{dept}</span>
                                    <span className="team-report-total">{total}</span>
                                </div>
                                <div className="team-report-stats">
                                    <span className="stat-done">✅ {completed.length}</span>
                                    <span className="stat-progress">🔄 {inProgress.length}</span>
                                    <span className="stat-todo">⬜ {notStarted.length}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Board columns */}
            <div className="team-board-columns">
                {/* Unassigned / Drafts column */}
                <div
                    className={`team-col team-col-unassigned ${dragOverCol === '_unassigned' ? 'drag-over' : ''}`}
                    ref={el => colRefs.current['_unassigned'] = el}
                    onDragOver={(e) => handleDragOver(e, '_unassigned')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, '_unassigned')}
                >
                    <div className="team-col-header" style={{ borderColor: '#94a3b8' }}>
                        <span className="team-col-icon">📝</span>
                        <span className="team-col-title">Nháp của tôi</span>
                        <span className="team-col-count">{myDrafts.length}</span>
                    </div>
                    <div className="team-col-body">
                        {myDrafts.map(task => (
                            <MiniTaskCard
                                key={task.id}
                                task={task}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                onTouchStart={handleTouchStart}
                                isDragging={draggedTaskId === task.id || touchDragging?.taskId === task.id}
                                getUserName={getUserName}
                                onPostpone={handlePostpone}
                                isDraft
                                onClick={() => onSelectTask?.(task)}
                            />
                        ))}
                        {myDrafts.length === 0 && (
                            <div className="team-col-empty">
                                <span>✨</span>
                                <span>Không có CV nháp</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Team columns */}
                {departments.map((dept, idx) => {
                    const color = getTeamColor(idx);
                    const deptTasks = tasksByGroup[dept] || [];
                    return (
                        <div
                            key={dept}
                            className={`team-col ${dragOverCol === dept ? 'drag-over' : ''}`}
                            ref={el => colRefs.current[dept] = el}
                            onDragOver={(e) => handleDragOver(e, dept)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, dept)}
                            style={{ '--team-color': color.border, '--team-bg': color.bg }}
                        >
                            <div className="team-col-header" style={{ borderColor: color.header }}>
                                <span className="team-col-icon">{getTeamIcon(dept)}</span>
                                <span className="team-col-title">{dept}</span>
                                <span className="team-col-count" style={{ background: color.header }}>{deptTasks.length}</span>
                            </div>
                            <div className="team-col-body">
                                {deptTasks.map(task => (
                                    <MiniTaskCard
                                        key={task.id}
                                        task={task}
                                        onDragStart={handleDragStart}
                                        onDragEnd={handleDragEnd}
                                        onTouchStart={handleTouchStart}
                                        isDragging={draggedTaskId === task.id || touchDragging?.taskId === task.id}
                                        getUserName={getUserName}
                                        onPostpone={handlePostpone}
                                        onClick={() => onSelectTask?.(task)}
                                    />
                                ))}
                                {deptTasks.length === 0 && (
                                    <div className="team-col-empty">
                                        <span>📥</span>
                                        <span>Kéo thả vào đây</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Touch drag ghost */}
            {touchDragging?.active && (
                <div
                    className="touch-drag-ghost"
                    style={{
                        left: touchDragging.currentX - 80,
                        top: touchDragging.currentY - 30,
                    }}
                >
                    {activeTasks.find(t => t.id === touchDragging.taskId)?.title || '...'}
                </div>
            )}
        </div>
    );
}

function getTeamIcon(dept) {
    const lower = dept.toLowerCase();
    if (lower.includes('thợ') || lower.includes('hùng') || lower.includes('ngọc')) return '👷';
    if (lower.includes('thiết kế') || lower.includes('giám sát')) return '🎨';
    if (lower.includes('kinh doanh')) return '💼';
    if (lower.includes('marketing')) return '📢';
    if (lower.includes('giám đốc')) return '🏢';
    if (lower.includes('phần mềm') || lower.includes('phát triển')) return '💻';
    return '👥';
}

function MiniTaskCard({ task, onDragStart, onDragEnd, onTouchStart, isDragging, getUserName, onPostpone, isDraft, onClick }) {
    const checklist = task.checklist || [];
    const done = checklist.filter(c => c.checked).length;
    const total = checklist.length;
    const hasUrgent = checklist.some(c => c.urgent && !c.checked);
    const isAllDone = total > 0 && done === total;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    return (
        <div
            className={`team-task-card ${isDragging ? 'dragging' : ''} ${isAllDone ? 'all-done' : ''} ${hasUrgent ? 'has-urgent' : ''} ${isDraft ? 'is-draft' : ''}`}
            draggable
            onDragStart={(e) => { e.stopPropagation(); onDragStart(e, task.id); }}
            onDragEnd={onDragEnd}
            onTouchStart={(e) => onTouchStart(e, task.id)}
            onClick={(e) => { if (!e.defaultPrevented) onClick?.(); }}
        >
            <div className="team-task-top">
                {hasUrgent && <span className="team-urgent-dot" />}
                {isAllDone && <IconCheck style={{ width: 14, height: 14, color: '#22c55e', flexShrink: 0 }} />}
                <span className={`team-task-title ${isAllDone ? 'line-through' : ''}`}>{task.title}</span>
            </div>
            {total > 0 && (
                <div className="team-task-progress">
                    <div className="team-progress-bar">
                        <div
                            className="team-progress-fill"
                            style={{
                                width: `${pct}%`,
                                background: isAllDone ? '#22c55e' : undefined,
                            }}
                        />
                    </div>
                    <span className="team-progress-text">{done}/{total}</span>
                </div>
            )}
            <div className="team-task-bottom">
                {task.due_date && (
                    <span className="team-task-due">
                        📅 {new Date(task.due_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                    </span>
                )}
                <button
                    className="btn-postpone"
                    onClick={(e) => onPostpone(e, task.id)}
                    title="Hoãn sang ngày mai"
                >
                    ⏭ Hoãn
                </button>
            </div>
        </div>
    );
}

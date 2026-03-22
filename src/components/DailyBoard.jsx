import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { IconCheck, IconClipboard } from './Icons';
import { useAuth } from '../hooks/useAuth';

/**
 * DailyBoard – Bảng Phân Công Theo Đội
 *
 * Mobile:
 *   - Tab bar sticky để nhảy nhanh đến từng đội
 *   - TẤT CẢ cột hiển thị dọc, scroll xuống thấy hết
 *   - Kéo thả task qua các đội (touch-based, target column auto-detected)
 *
 * Desktop:
 *   - Nhiều cột ngang, kéo drag handle ⠿ để đổi thứ tự đội
 *   - Kéo task qua các cột
 */

function getTomorrow() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(8, 0, 0, 0);
    return d;
}

const TEAM_COLORS = [
    { bg: '#e8f4fd', border: '#4A90D9', header: '#4A90D9' },
    { bg: '#fef3e2', border: '#f59e0b', header: '#d97706' },
    { bg: '#f0fdf4', border: '#22c55e', header: '#16a34a' },
    { bg: '#fdf2f8', border: '#ec4899', header: '#db2777' },
    { bg: '#f5f3ff', border: '#8b5cf6', header: '#7c3aed' },
    { bg: '#fef2f2', border: '#ef4444', header: '#dc2626' },
];

const getTeamColor = (i) => TEAM_COLORS[i % TEAM_COLORS.length];

function getTeamIcon(dept) {
    const l = dept.toLowerCase();
    if (l.includes('thợ') || l.includes('hùng') || l.includes('ngọc')) return '👷';
    if (l.includes('thiết kế') || l.includes('giám sát')) return '🎨';
    if (l.includes('kinh doanh')) return '💼';
    if (l.includes('marketing')) return '📢';
    if (l.includes('giám đốc')) return '🏢';
    if (l.includes('phần mềm') || l.includes('phát triển')) return '💻';
    return '👥';
}

export default function DailyBoard({ tasks, onUpdateTask, allUsers = [], onSelectTask, departments = [], onReorderDepts }) {
    const { user } = useAuth();

    // Task drag state (HTML5 + touch)
    const [draggedTaskId, setDraggedTaskId] = useState(null);
    const [dragOverCol, setDragOverCol] = useState(null);
    const [touchDragging, setTouchDragging] = useState(null);

    // Report toggle
    const [showReport, setShowReport] = useState(false);

    // Local dept order (supports reorder)
    const [localDepts, setLocalDepts] = useState(departments);
    useEffect(() => { setLocalDepts(departments); }, [departments]);

    // Dept reorder drag state (desktop)
    const [deptDragIdx, setDeptDragIdx] = useState(null);
    const [deptDragOverIdx, setDeptDragOverIdx] = useState(null);

    // Refs
    const boardRef = useRef(null);
    const colRefs = useRef({});      // for task drag-over detection
    const sectionRefs = useRef({});  // for mobile quick-jump scroll

    // ── Derived data ────────────────────────────────────────────────
    const activeTasks = useMemo(() => tasks.filter(t => t.status !== 'done'), [tasks]);

    const tasksByGroup = useMemo(() => {
        const map = { _unassigned: [] };
        localDepts.forEach(d => { map[d] = []; });
        activeTasks.forEach(task => {
            if (!task.group || !localDepts.includes(task.group)) {
                map._unassigned.push(task);
            } else {
                map[task.group].push(task);
            }
        });
        return map;
    }, [activeTasks, localDepts]);

    const myDrafts = useMemo(() => {
        if (!user) return [];
        return tasksByGroup._unassigned.filter(task => {
            if (task.assigned_by === user.id) return true;
            const to = task.assigned_to;
            return Array.isArray(to) ? to.includes(user.id) : to === user.id;
        });
    }, [tasksByGroup._unassigned, user]);

    const reportData = useMemo(() => {
        const teamReports = localDepts.map(dept => {
            const ts = tasksByGroup[dept] || [];
            const completed = ts.filter(t => { const c = t.checklist || []; return c.length > 0 && c.every(x => x.checked); });
            const inProgress = ts.filter(t => { const c = t.checklist || []; return c.length > 0 && c.some(x => x.checked) && !c.every(x => x.checked); });
            const notStarted = ts.filter(t => { const c = t.checklist || []; return c.length === 0 || c.every(x => !x.checked); });
            return { dept, total: ts.length, completed, inProgress, notStarted };
        });
        return { teamReports, totalTasks: localDepts.reduce((s, d) => s + (tasksByGroup[d] || []).length, 0) };
    }, [tasksByGroup, localDepts]);

    // ── Task Drag (Mouse / HTML5) ───────────────────────────────────
    const handleTaskDragStart = useCallback((e, taskId) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('task-id', taskId);
        requestAnimationFrame(() => e.target.classList.add('dragging'));
    }, []);

    const handleColDragOver = useCallback((e, colKey) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverCol(colKey);
    }, []);

    const handleColDragLeave = useCallback((e) => {
        const r = e.currentTarget.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
            setDragOverCol(null);
        }
    }, []);

    const handleColDrop = useCallback((e, colKey) => {
        e.preventDefault();
        setDragOverCol(null);
        const taskId = e.dataTransfer.getData('task-id') || draggedTaskId;
        if (!taskId) return;
        onUpdateTask(taskId, { group: colKey === '_unassigned' ? '' : colKey });
        setDraggedTaskId(null);
    }, [draggedTaskId, onUpdateTask]);

    const handleTaskDragEnd = useCallback((e) => {
        e.target.classList.remove('dragging');
        setDraggedTaskId(null);
        setDragOverCol(null);
    }, []);

    // ── Task Touch Drag (Mobile) ────────────────────────────────────
    const handleTouchStart = useCallback((e, taskId) => {
        const t = e.touches[0];
        setTouchDragging({ taskId, startX: t.clientX, startY: t.clientY, currentX: t.clientX, currentY: t.clientY, active: false });
    }, []);

    const handleTouchMove = useCallback((e) => {
        if (!touchDragging) return;
        const t = e.touches[0];
        const dx = Math.abs(t.clientX - touchDragging.startX);
        const dy = Math.abs(t.clientY - touchDragging.startY);
        if (!touchDragging.active && (dx > 8 || dy > 8)) {
            setTouchDragging(prev => ({ ...prev, active: true }));
        }
        if (touchDragging.active) {
            e.preventDefault();
            setTouchDragging(prev => ({ ...prev, currentX: t.clientX, currentY: t.clientY }));
            // Detect which column the finger is over
            const allKeys = ['_unassigned', ...localDepts];
            for (const key of allKeys) {
                const el = colRefs.current[key];
                if (el) {
                    const r = el.getBoundingClientRect();
                    if (t.clientX >= r.left && t.clientX <= r.right && t.clientY >= r.top && t.clientY <= r.bottom) {
                        setDragOverCol(key);
                        return;
                    }
                }
            }
            setDragOverCol(null);
        }
    }, [touchDragging, localDepts]);

    const handleTouchEnd = useCallback(() => {
        if (touchDragging?.active && dragOverCol) {
            onUpdateTask(touchDragging.taskId, { group: dragOverCol === '_unassigned' ? '' : dragOverCol });
        }
        setTouchDragging(null);
        setDragOverCol(null);
    }, [touchDragging, dragOverCol, onUpdateTask]);

    // ── Dept Reorder (Desktop drag) ────────────────────────────────
    const handleDeptDragStart = useCallback((e, idx) => {
        e.stopPropagation();
        setDeptDragIdx(idx);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('dept-drag', String(idx));
    }, []);

    const handleDeptColDragOver = useCallback((e, idx) => {
        if (!e.dataTransfer.types.includes('dept-drag')) return;
        e.preventDefault();
        e.stopPropagation();
        setDeptDragOverIdx(idx);
    }, []);

    const handleDeptColDrop = useCallback((e, toIdx) => {
        if (!e.dataTransfer.types.includes('dept-drag')) return;
        e.preventDefault();
        e.stopPropagation();
        const fromIdx = deptDragIdx;
        if (fromIdx === null || fromIdx === toIdx) {
            setDeptDragIdx(null); setDeptDragOverIdx(null);
            return;
        }
        const next = [...localDepts];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, moved);
        setLocalDepts(next);
        onReorderDepts?.(next);
        setDeptDragIdx(null); setDeptDragOverIdx(null);
    }, [deptDragIdx, localDepts, onReorderDepts]);

    const handleDeptDragEnd = useCallback(() => {
        setDeptDragIdx(null); setDeptDragOverIdx(null);
    }, []);

    // ── Postpone ───────────────────────────────────────────────────
    const handlePostpone = useCallback((e, taskId) => {
        e.stopPropagation(); e.preventDefault();
        onUpdateTask(taskId, { due_date: getTomorrow().toISOString() });
    }, [onUpdateTask]);

    // ── Copy report ────────────────────────────────────────────────
    function handleCopyReport() {
        const now = new Date();
        const lines = [`📋 BÁO CÁO PHÂN CÔNG NGÀY ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`, '━'.repeat(40)];
        reportData.teamReports.forEach(({ dept, total, completed, inProgress, notStarted }) => {
            if (!total) return;
            lines.push('', `👥 ${dept} (${total} việc)`);
            completed.forEach(t => lines.push(`  ✅ ${t.title}`));
            inProgress.forEach(t => {
                const cl = t.checklist || [];
                lines.push(`  🔄 ${t.title} (${cl.filter(c => c.checked).length}/${cl.length})`);
            });
            notStarted.forEach(t => lines.push(`  ⬜ ${t.title}`));
        });
        lines.push('', '━'.repeat(40), `Tổng: ${reportData.totalTasks} việc đã phân công`);
        navigator.clipboard.writeText(lines.join('\n'))
            .then(() => alert('✅ Đã copy báo cáo!'))
            .catch(() => prompt('Copy báo cáo:', lines.join('\n')));
    }

    // ── Mobile quick-jump ──────────────────────────────────────────
    const handleMobileJump = useCallback((key) => {
        const el = sectionRefs.current[key];
        if (!el) return;
        const y = el.getBoundingClientRect().top + window.pageYOffset - 120;
        window.scrollTo({ top: y, behavior: 'smooth' });
    }, []);

    // ── Column renderer (shared desktop+mobile) ────────────────────
    const renderUnassignedCol = (isMobile = false) => (
        <div
            key="_unassigned"
            id="board-col-_unassigned"
            ref={el => {
                colRefs.current['_unassigned'] = el;
                if (isMobile) sectionRefs.current['_unassigned'] = el;
            }}
            className={`team-col team-col-unassigned${isMobile ? ' team-col-mobile' : ''} ${dragOverCol === '_unassigned' ? 'drag-over' : ''}`}
            onDragOver={(e) => { if (!e.dataTransfer.types.includes('dept-drag')) handleColDragOver(e, '_unassigned'); }}
            onDragLeave={handleColDragLeave}
            onDrop={(e) => { if (!e.dataTransfer.types.includes('dept-drag')) handleColDrop(e, '_unassigned'); }}
        >
            <div className="team-col-header" style={{ borderColor: '#94a3b8' }}>
                <span className="team-col-icon">📝</span>
                <span className="team-col-title">Nháp của tôi</span>
                <span className="team-col-count">{myDrafts.length}</span>
            </div>
            <div className="team-col-body">
                {myDrafts.map(task => (
                    <MiniTaskCard key={task.id} task={task}
                        onDragStart={handleTaskDragStart} onDragEnd={handleTaskDragEnd}
                        onTouchStart={handleTouchStart}
                        isDragging={draggedTaskId === task.id || touchDragging?.taskId === task.id}
                        onPostpone={handlePostpone} isDraft
                        onClick={() => onSelectTask?.(task)} />
                ))}
                {!myDrafts.length && <div className="team-col-empty"><span>✨</span><span>Không có CV nháp</span></div>}
            </div>
        </div>
    );

    const renderDeptCol = (dept, idx, isMobile = false) => {
        const color = getTeamColor(idx);
        const deptTasks = tasksByGroup[dept] || [];
        const isReorderOver = !isMobile && deptDragOverIdx === idx;
        const isReorderDragging = !isMobile && deptDragIdx === idx;
        return (
            <div
                key={dept}
                id={`board-col-${dept}`}
                ref={el => {
                    colRefs.current[dept] = el;
                    if (isMobile) sectionRefs.current[dept] = el;
                }}
                className={`team-col${isMobile ? ' team-col-mobile' : ''} ${dragOverCol === dept ? 'drag-over' : ''} ${isReorderOver ? 'dept-reorder-over' : ''} ${isReorderDragging ? 'dept-reorder-dragging' : ''}`}
                style={{ '--team-color': color.border, '--team-bg': color.bg }}
                onDragOver={(e) => {
                    if (e.dataTransfer.types.includes('dept-drag')) handleDeptColDragOver(e, idx);
                    else handleColDragOver(e, dept);
                }}
                onDragLeave={(e) => {
                    handleColDragLeave(e);
                    setDeptDragOverIdx(null);
                }}
                onDrop={(e) => {
                    if (e.dataTransfer.types.includes('dept-drag')) handleDeptColDrop(e, idx);
                    else handleColDrop(e, dept);
                }}
            >
                <div
                    className="team-col-header"
                    style={{ borderColor: color.header }}
                    draggable={!isMobile}
                    onDragStart={isMobile ? undefined : (e) => handleDeptDragStart(e, idx)}
                    onDragEnd={isMobile ? undefined : handleDeptDragEnd}
                >
                    {!isMobile && <span className="dept-drag-handle" title="Kéo để đổi thứ tự">⠿</span>}
                    <span className="team-col-icon">{getTeamIcon(dept)}</span>
                    <span className="team-col-title">{dept}</span>
                    <span className="team-col-count" style={{ background: color.header }}>{deptTasks.length}</span>
                </div>
                <div className="team-col-body">
                    {deptTasks.map(task => (
                        <MiniTaskCard key={task.id} task={task}
                            onDragStart={handleTaskDragStart} onDragEnd={handleTaskDragEnd}
                            onTouchStart={handleTouchStart}
                            isDragging={draggedTaskId === task.id || touchDragging?.taskId === task.id}
                            onPostpone={handlePostpone}
                            onClick={() => onSelectTask?.(task)} />
                    ))}
                    {!deptTasks.length && <div className="team-col-empty"><span>📥</span><span>Kéo thả vào đây</span></div>}
                </div>
            </div>
        );
    };

    // ── Render ────────────────────────────────────────────────────
    return (
        <div className="team-board" ref={boardRef} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>

            {/* Header */}
            <div className="team-board-header">
                <div className="team-board-title-row">
                    <h2>📋 Bảng phân công theo đội</h2>
                    <button className="btn-report" onClick={() => setShowReport(!showReport)}>
                        <IconClipboard /> {showReport ? 'Ẩn' : 'Báo cáo'}
                    </button>
                </div>
                <p className="team-board-hint">Kéo CV từ nháp vào đội • Desktop: kéo ⠿ đổi thứ tự đội</p>
            </div>

            {/* Report */}
            {showReport && (
                <div className="team-report">
                    <div className="team-report-header">
                        <h3>📊 Báo cáo phân công</h3>
                        <button className="btn-copy-report" onClick={handleCopyReport}>📎 Copy</button>
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

            {/* ═══ DESKTOP: Horizontal columns ═══ */}
            <div className="team-board-columns team-board-desktop">
                {renderUnassignedCol(false)}
                {localDepts.map((dept, idx) => renderDeptCol(dept, idx, false))}
            </div>

            {/* ═══ MOBILE: Sticky tab bar + all columns stacked ═══ */}
            <div className="team-board-mobile">

                {/* Quick-jump tab bar */}
                <div className="board-dept-tabs">
                    <div className="board-dept-tabs-inner">
                        <button
                            className="board-dept-tab"
                            onClick={() => handleMobileJump('_unassigned')}
                        >
                            <span className="board-dept-tab-icon">📝</span>
                            <span className="board-dept-tab-label">Nháp</span>
                            {myDrafts.length > 0 && <span className="board-dept-tab-count">{myDrafts.length}</span>}
                        </button>
                        {localDepts.map((dept, idx) => {
                            const color = getTeamColor(idx);
                            const count = (tasksByGroup[dept] || []).length;
                            return (
                                <button
                                    key={dept}
                                    className="board-dept-tab"
                                    style={{ borderColor: color.header, color: color.header, background: color.bg }}
                                    onClick={() => handleMobileJump(dept)}
                                >
                                    <span className="board-dept-tab-icon">{getTeamIcon(dept)}</span>
                                    <span className="board-dept-tab-label">{dept}</span>
                                    {count > 0 && (
                                        <span className="board-dept-tab-count" style={{ background: color.header, color: '#fff' }}>
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* All columns stacked vertically */}
                <div className="team-board-mobile-cols">
                    {renderUnassignedCol(true)}
                    {localDepts.map((dept, idx) => renderDeptCol(dept, idx, true))}
                </div>
            </div>

            {/* Touch drag ghost */}
            {touchDragging?.active && (
                <div className="touch-drag-ghost" style={{ left: touchDragging.currentX - 80, top: touchDragging.currentY - 30 }}>
                    {activeTasks.find(t => t.id === touchDragging.taskId)?.title || '...'}
                </div>
            )}
        </div>
    );
}

// ── MiniTaskCard ───────────────────────────────────────────────────
function MiniTaskCard({ task, onDragStart, onDragEnd, onTouchStart, isDragging, onPostpone, isDraft, onClick }) {
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
                        <div className="team-progress-fill" style={{ width: `${pct}%`, background: isAllDone ? '#22c55e' : undefined }} />
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
                <button className="btn-postpone" onClick={(e) => onPostpone(e, task.id)} title="Hoãn sang ngày mai">
                    ⏭ Hoãn
                </button>
            </div>
        </div>
    );
}

import { useState, useMemo, useCallback } from 'react';
import { IconCalendar, IconCheck, IconAlertCircle, IconClipboard, IconSend } from './Icons';
import { getInitials } from '../services/pb';

/**
 * DailyBoard - Bảng Báo Cáo & Phân Công Ngày
 * 
 * Flow thực tế:
 * 1. Sáng: Giám đốc/Quản lý giao việc (task có due_date = hôm nay)
 * 2. Tối: Nhân viên gạch đi (check) các checklist item đã làm
 * 3. Việc chưa xong → kéo sang ngày mai (update due_date)
 * 4. Trợ lý xuất báo cáo tổng hợp → gửi giám đốc
 */

function fmtKey(date) {
    return date.toISOString().split('T')[0];
}

function fmtDisplay(date) {
    return `${date.getDate()}/${date.getMonth() + 1}`;
}

function getToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

export default function DailyBoard({ tasks, onUpdateTask, allUsers = [], onSelectTask }) {
    const [draggedTaskId, setDraggedTaskId] = useState(null);
    const [dragOverCol, setDragOverCol] = useState(null);
    const [showReport, setShowReport] = useState(false);

    const today = useMemo(() => getToday(), []);
    const todayKey = fmtKey(today);

    const yesterday = useMemo(() => {
        const d = new Date(today);
        d.setDate(d.getDate() - 1);
        return d;
    }, [today]);

    const tomorrow = useMemo(() => {
        const d = new Date(today);
        d.setDate(d.getDate() + 1);
        return d;
    }, [today]);

    // Build columns: Yesterday, Today, Tomorrow, +2 days
    const columns = useMemo(() => {
        const cols = [];
        const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

        // Yesterday
        cols.push({ date: yesterday, label: 'Hôm qua', key: fmtKey(yesterday), type: 'past' });
        // Today
        cols.push({ date: new Date(today), label: 'Hôm nay', key: todayKey, type: 'today' });
        // Tomorrow
        cols.push({ date: tomorrow, label: 'Ngày mai', key: fmtKey(tomorrow), type: 'future' });
        // +2 days
        for (let i = 2; i <= 3; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            cols.push({ date: d, label: `${dayNames[d.getDay()]} ${fmtDisplay(d)}`, key: fmtKey(d), type: 'future' });
        }

        return cols;
    }, [today, todayKey, yesterday, tomorrow]);

    // Group active tasks by date
    const tasksByDate = useMemo(() => {
        const map = { _backlog: [] };
        columns.forEach(col => { map[col.key] = []; });

        tasks.forEach(task => {
            if (task.status === 'done') return;
            if (!task.due_date) {
                map._backlog.push(task);
                return;
            }
            const key = fmtKey(new Date(task.due_date));
            if (map[key] !== undefined) {
                map[key].push(task);
            }
            // Tasks outside our range are not shown on this board
        });

        return map;
    }, [tasks, columns]);

    // === REPORT DATA ===
    const reportData = useMemo(() => {
        const todayTasks = tasksByDate[todayKey] || [];
        const completed = [];
        const incomplete = [];

        todayTasks.forEach(task => {
            const checklist = task.checklist || [];
            const total = checklist.length;
            const done = checklist.filter(c => c.checked).length;

            if (total === 0 || done === total) {
                completed.push(task);
            } else {
                const undoneItems = checklist.filter(c => !c.checked).map(c => c.text);
                incomplete.push({ task, done, total, undoneItems });
            }
        });

        return { todayTasks, completed, incomplete };
    }, [tasksByDate, todayKey]);

    // === DRAG HANDLERS ===
    const handleDragStart = useCallback((e, taskId) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', taskId);
    }, []);

    const handleDragOver = useCallback((e, colKey) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverCol(colKey);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragOverCol(null);
    }, []);

    const handleDrop = useCallback((e, colKey) => {
        e.preventDefault();
        setDragOverCol(null);
        const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
        if (!taskId) return;

        if (colKey === '_backlog') {
            onUpdateTask(taskId, { due_date: null });
        } else {
            const col = columns.find(c => c.key === colKey);
            if (col) {
                onUpdateTask(taskId, { due_date: col.date.toISOString() });
            }
        }
        setDraggedTaskId(null);
    }, [draggedTaskId, columns, onUpdateTask]);

    const handleDragEnd = useCallback(() => {
        setDraggedTaskId(null);
        setDragOverCol(null);
    }, []);

    // Move all incomplete tasks from today to tomorrow
    function handleCarryOver() {
        if (!confirm('Chuyển tất cả việc chưa xong sang ngày mai?')) return;
        reportData.incomplete.forEach(({ task }) => {
            onUpdateTask(task.id, { due_date: tomorrow.toISOString() });
        });
    }

    // Copy report to clipboard
    function handleCopyReport() {
        const lines = [];
        const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
        lines.push(`📋 BÁO CÁO CÔNG VIỆC NGÀY ${dateStr}`);
        lines.push('━'.repeat(40));

        if (reportData.completed.length > 0) {
            lines.push('');
            lines.push(`✅ ĐÃ HOÀN THÀNH (${reportData.completed.length})`);
            reportData.completed.forEach(t => {
                const group = t.group ? ` [${t.group}]` : '';
                lines.push(`  • ${t.title}${group}`);
            });
        }

        if (reportData.incomplete.length > 0) {
            lines.push('');
            lines.push(`❌ CHƯA HOÀN THÀNH (${reportData.incomplete.length})`);
            reportData.incomplete.forEach(({ task: t, done, total, undoneItems }) => {
                const group = t.group ? ` [${t.group}]` : '';
                lines.push(`  • ${t.title}${group} (${done}/${total})`);
                undoneItems.forEach(item => {
                    lines.push(`    ◦ ${item}`);
                });
            });
        }

        if (reportData.todayTasks.length === 0) {
            lines.push('');
            lines.push('Không có công việc nào được giao hôm nay.');
        }

        lines.push('');
        lines.push('━'.repeat(40));
        lines.push(`Tổng: ${reportData.todayTasks.length} việc | Xong: ${reportData.completed.length} | Chưa xong: ${reportData.incomplete.length}`);

        navigator.clipboard.writeText(lines.join('\n')).then(() => {
            alert('✅ Đã copy báo cáo vào clipboard!');
        }).catch(() => {
            // Fallback: show in prompt
            prompt('Copy báo cáo:', lines.join('\n'));
        });
    }

    // Get user name by id
    const getUserName = useCallback((userId) => {
        const u = allUsers.find(u => u.id === userId);
        return u ? u.name || u.username : '';
    }, [allUsers]);

    return (
        <div className="daily-board">
            {/* Header */}
            <div className="daily-board-header">
                <div className="daily-board-title-row">
                    <h2><IconCalendar /> Bảng phân công & báo cáo</h2>
                    <div className="daily-board-actions">
                        {reportData.incomplete.length > 0 && (
                            <button className="btn-carry-over" onClick={handleCarryOver}>
                                <IconSend /> Chuyển {reportData.incomplete.length} việc → Ngày mai
                            </button>
                        )}
                        <button className="btn-report" onClick={() => setShowReport(!showReport)}>
                            <IconClipboard /> {showReport ? 'Ẩn báo cáo' : 'Xem báo cáo'}
                        </button>
                    </div>
                </div>
                <p className="daily-board-hint">Kéo thả công việc giữa các ngày • Việc chưa xong sẽ highlight đỏ</p>
            </div>

            {/* Report panel */}
            {showReport && (
                <div className="daily-report">
                    <div className="daily-report-header">
                        <h3>📋 Báo cáo ngày {fmtDisplay(today)}</h3>
                        <button className="btn-copy-report" onClick={handleCopyReport}>
                            📎 Copy báo cáo
                        </button>
                    </div>

                    <div className="daily-report-grid">
                        {/* Completed */}
                        <div className="report-section report-done">
                            <div className="report-section-header">
                                <span className="report-section-icon done">✅</span>
                                <h4>Đã hoàn thành</h4>
                                <span className="report-section-count">{reportData.completed.length}</span>
                            </div>
                            {reportData.completed.length === 0 ? (
                                <p className="report-empty">Chưa có việc nào hoàn thành</p>
                            ) : reportData.completed.map(t => (
                                <div key={t.id} className="report-task-item done" onClick={() => onSelectTask?.(t)}>
                                    <span className="report-task-name">{t.title}</span>
                                    {t.group && <span className="report-task-dept">{t.group}</span>}
                                </div>
                            ))}
                        </div>

                        {/* Incomplete */}
                        <div className="report-section report-incomplete">
                            <div className="report-section-header">
                                <span className="report-section-icon incomplete">❌</span>
                                <h4>Chưa hoàn thành</h4>
                                <span className="report-section-count">{reportData.incomplete.length}</span>
                            </div>
                            {reportData.incomplete.length === 0 ? (
                                <p className="report-empty">Tất cả đã hoàn thành! 🎉</p>
                            ) : reportData.incomplete.map(({ task: t, done, total, undoneItems }) => (
                                <div key={t.id} className="report-task-item incomplete" onClick={() => onSelectTask?.(t)}>
                                    <div className="report-task-top">
                                        <span className="report-task-name">{t.title}</span>
                                        <span className="report-progress-text">{done}/{total}</span>
                                    </div>
                                    {t.group && <span className="report-task-dept">{t.group}</span>}
                                    <ul className="report-undone-list">
                                        {undoneItems.map((item, i) => (
                                            <li key={i}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Day columns */}
            <div className="daily-board-columns">
                {/* Backlog column */}
                <div
                    className={`daily-col daily-col-backlog ${dragOverCol === '_backlog' ? 'drag-over' : ''}`}
                    onDragOver={(e) => handleDragOver(e, '_backlog')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, '_backlog')}
                >
                    <div className="daily-col-header">
                        <span className="daily-col-title">Chưa lên lịch</span>
                        <span className="daily-col-count">{tasksByDate._backlog.length}</span>
                    </div>
                    <div className="daily-col-body">
                        {tasksByDate._backlog.map(task => (
                            <MiniTaskCard
                                key={task.id}
                                task={task}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                isDragging={draggedTaskId === task.id}
                                getUserName={getUserName}
                                onClick={() => onSelectTask?.(task)}
                            />
                        ))}
                        {tasksByDate._backlog.length === 0 && (
                            <div className="daily-col-empty">Kéo vào đây</div>
                        )}
                    </div>
                </div>

                {/* Day columns */}
                {columns.map(col => {
                    const colTasks = tasksByDate[col.key] || [];
                    return (
                        <div
                            key={col.key}
                            className={`daily-col ${col.type === 'today' ? 'daily-col-today' : ''} ${col.type === 'past' ? 'daily-col-past' : ''} ${dragOverCol === col.key ? 'drag-over' : ''}`}
                            onDragOver={(e) => handleDragOver(e, col.key)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, col.key)}
                        >
                            <div className="daily-col-header">
                                <span className="daily-col-title">{col.label}</span>
                                <span className="daily-col-count">{colTasks.length}</span>
                            </div>
                            <div className="daily-col-body">
                                {colTasks.map(task => (
                                    <MiniTaskCard
                                        key={task.id}
                                        task={task}
                                        onDragStart={handleDragStart}
                                        onDragEnd={handleDragEnd}
                                        isDragging={draggedTaskId === task.id}
                                        getUserName={getUserName}
                                        isToday={col.type === 'today'}
                                        onClick={() => onSelectTask?.(task)}
                                    />
                                ))}
                                {colTasks.length === 0 && (
                                    <div className="daily-col-empty">Kéo thả vào đây</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function MiniTaskCard({ task, onDragStart, onDragEnd, isDragging, getUserName, isToday, onClick }) {
    const checklist = task.checklist || [];
    const done = checklist.filter(c => c.checked).length;
    const total = checklist.length;
    const hasUrgent = checklist.some(c => c.urgent);
    const isAllDone = total > 0 && done === total;
    const hasUndone = total > 0 && done < total;

    return (
        <div
            className={`daily-task-card ${isDragging ? 'dragging' : ''} ${isAllDone ? 'all-done' : ''} ${hasUndone && isToday ? 'has-undone' : ''} ${task.color && task.color !== 'default' ? `color-${task.color}` : ''}`}
            draggable
            onDragStart={(e) => { e.stopPropagation(); onDragStart(e, task.id); }}
            onDragEnd={onDragEnd}
            onClick={(e) => { if (!e.defaultPrevented) onClick?.(); }}
        >
            <div className="daily-task-title">
                {hasUrgent && <span className="daily-urgent-dot" />}
                {isAllDone && <IconCheck style={{ width: 14, height: 14, color: '#22c55e', flexShrink: 0 }} />}
                <span className={isAllDone ? 'line-through' : ''}>{task.title}</span>
            </div>
            {total > 0 && (
                <div className="daily-task-progress">
                    <span>{done}/{total}</span>
                    <div className="daily-progress-bar">
                        <div className="daily-progress-fill" style={{ width: `${(done / total) * 100}%`, background: isAllDone ? '#22c55e' : undefined }} />
                    </div>
                </div>
            )}
            {task.group && <span className="daily-task-group">{task.group}</span>}
        </div>
    );
}

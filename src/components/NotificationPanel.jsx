import { useState, useRef, useEffect } from 'react';
import { timeAgo } from '../services/pb';

export default function NotificationPanel({ notifications, unreadCount, onMarkAllRead, onMarkRead, onClearAll, onClickNotif }) {
    const [open, setOpen] = useState(false);
    const panelRef = useRef(null);

    // Close when clicking outside
    useEffect(() => {
        function handleClick(e) {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        if (open) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    return (
        <div className="notif-wrapper" ref={panelRef}>
            <button className="notif-bell" onClick={() => setOpen(!open)} title="Thông báo">
                🔔
                {unreadCount > 0 && (
                    <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
            </button>

            {open && (
                <div className="notif-panel">
                    <div className="notif-panel-header">
                        <h4>Thông báo</h4>
                        <div className="notif-panel-actions">
                            {unreadCount > 0 && (
                                <button onClick={() => { onMarkAllRead(); }} className="notif-action-btn">
                                    Đọc hết
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button onClick={() => { onClearAll(); setOpen(false); }} className="notif-action-btn danger">
                                    Xóa hết
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="notif-list">
                        {notifications.length === 0 ? (
                            <div className="notif-empty">Chưa có thông báo nào</div>
                        ) : notifications.map(n => (
                            <div
                                key={n.id}
                                className={`notif-item ${n.read ? '' : 'unread'}`}
                                onClick={() => {
                                    onMarkRead(n.id);
                                    if (onClickNotif) onClickNotif(n.taskId);
                                    setOpen(false);
                                }}
                            >
                                <span className="notif-icon">
                                    {n.type === 'assigned' ? '📋' : '🔄'}
                                </span>
                                <div className="notif-content">
                                    <span className="notif-message">{n.message}</span>
                                    <span className="notif-time">{timeAgo(n.time)}</span>
                                </div>
                                {!n.read && <span className="notif-dot" />}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

import { useState } from 'react';
import { useAuth } from '../App';
import { getInitials, getRoleLabel } from '../services/pb';

export default function Layout({ children, filter, onFilterChange, taskCounts }) {
    const { user, logout, roleLabel } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const filters = [
        { key: 'all', label: 'Tất cả', icon: '📋', count: taskCounts?.all || 0 },
        { key: 'assigned_to_me', label: 'Việc của tôi', icon: '👤', count: taskCounts?.assignedToMe || 0 },
        { key: 'assigned_by_me', label: 'Việc đã giao', icon: '📤', count: taskCounts?.assignedByMe || 0 },
    ];

    const statusFilters = [
        { key: 'todo', label: 'Chờ làm', icon: '⏳', count: taskCounts?.todo || 0 },
        { key: 'in_progress', label: 'Đang làm', icon: '🔄', count: taskCounts?.inProgress || 0 },
        { key: 'done', label: 'Hoàn thành', icon: '✅', count: taskCounts?.done || 0 },
        { key: 'overdue', label: 'Quá hạn', icon: '⚠️', count: taskCounts?.overdue || 0 },
    ];

    return (
        <div className="app-layout">
            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-user">
                        <div className="sidebar-avatar">{getInitials(user?.name)}</div>
                        <div className="sidebar-user-info">
                            <h3>{user?.name || 'User'}</h3>
                            <span className="role-text">{roleLabel}</span>
                        </div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <div className="nav-section">
                        <div className="nav-section-title">Bộ lọc</div>
                        {filters.map(f => (
                            <button
                                key={f.key}
                                className={`nav-item ${filter === f.key ? 'active' : ''}`}
                                onClick={() => { onFilterChange(f.key); setSidebarOpen(false); }}
                            >
                                <span>{f.icon}</span>
                                <span>{f.label}</span>
                                <span className="count">{f.count}</span>
                            </button>
                        ))}
                    </div>

                    <div className="nav-section">
                        <div className="nav-section-title">Trạng thái</div>
                        {statusFilters.map(f => (
                            <button
                                key={f.key}
                                className={`nav-item ${filter === f.key ? 'active' : ''}`}
                                onClick={() => { onFilterChange(f.key); setSidebarOpen(false); }}
                            >
                                <span>{f.icon}</span>
                                <span>{f.label}</span>
                                <span className="count">{f.count}</span>
                            </button>
                        ))}
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <button className="btn-logout" onClick={logout}>
                        <span>🚪</span> Đăng xuất
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className="main-content">
                {children}
            </main>

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
                        zIndex: 99, display: 'none',
                    }}
                    className="sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
}

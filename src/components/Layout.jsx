import { useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getInitials, getRoleLabel } from '../services/pb';
import { IconClipboard, IconUser, IconSend, IconAlertCircle, IconArchive, IconSettings, IconLogout, IconMenu, getDeptIcon } from './Icons';

export default function Layout({ children, filter, onFilterChange, taskCounts, departments = [], onShowAdmin }) {
    const { user, logout, roleLabel, isDirector } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Build department filters dynamically
    const departmentFilters = useMemo(() => {
        return departments.map((dept) => {
            const key = 'group_' + dept.toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/g, 'd').replace(/Đ/g, 'D')
                .replace(/\s+/g, '_');
            return { key, label: dept, IconComp: getDeptIcon(dept) };
        });
    }, [departments]);

    const mainFilters = [
        { key: 'all', label: 'Tất cả', IconComp: IconClipboard, count: taskCounts?.all || 0 },
        { key: 'assigned_to_me', label: 'Việc của tôi', IconComp: IconUser, count: taskCounts?.assignedToMe || 0 },
        { key: 'assigned_by_me', label: 'Việc đã giao', IconComp: IconSend, count: taskCounts?.assignedByMe || 0 },
        { key: 'urgent', label: 'Khẩn cấp', IconComp: IconAlertCircle, count: taskCounts?.urgent || 0 },
        { key: 'archived', label: 'Lưu trữ', IconComp: IconArchive, count: taskCounts?.archived || 0 },
    ];

    // Bottom nav tabs (mobile)
    const bottomTabs = [
        { key: 'all', label: 'Tất cả', IconComp: IconClipboard },
        { key: 'assigned_to_me', label: 'Của tôi', IconComp: IconUser },
        { key: 'urgent', label: 'Khẩn cấp', IconComp: IconAlertCircle },
        { key: 'archived', label: 'Lưu trữ', IconComp: IconArchive },
        { key: '_menu', label: 'Menu', IconComp: IconMenu },
    ];

    function handleBottomTab(key) {
        if (key === '_menu') {
            setSidebarOpen(prev => !prev);
        } else {
            onFilterChange(key);
            setSidebarOpen(false);
        }
    }

    function handleFilterClick(key) {
        onFilterChange(key);
        setSidebarOpen(false);
    }

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
                        {mainFilters.map(f => (
                            <button
                                key={f.key}
                                className={`nav-item ${filter === f.key ? 'active' : ''}`}
                                onClick={() => handleFilterClick(f.key)}
                            >
                                <span className="nav-icon"><f.IconComp /></span>
                                <span>{f.label}</span>
                                {f.count > 0 && <span className="count">{f.count}</span>}
                            </button>
                        ))}
                    </div>

                    <div className="nav-section">
                        <div className="nav-section-title">Phòng ban / Đội</div>
                        {departmentFilters.map(f => (
                            <button
                                key={f.key}
                                className={`nav-item ${filter === f.key ? 'active' : ''}`}
                                onClick={() => handleFilterClick(f.key)}
                            >
                                <span className="nav-icon"><f.IconComp /></span>
                                <span>{f.label}</span>
                                {(taskCounts?.groups?.[f.label] || 0) > 0 && (
                                    <span className="count">{taskCounts.groups[f.label]}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </nav>

                <div className="sidebar-footer">
                    {(isDirector || user?.role === 'hr') && onShowAdmin && (
                        <button className="btn-admin" onClick={() => { onShowAdmin(); setSidebarOpen(false); }}>
                            <IconSettings /> Quản lý
                        </button>
                    )}
                    <button className="btn-logout" onClick={logout}>
                        <IconLogout /> Đăng xuất
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className="main-content">
                {children}
            </main>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Bottom Navigation (mobile) */}
            <nav className="bottom-nav">
                {bottomTabs.map(tab => (
                    <button
                        key={tab.key}
                        className={`bottom-nav-item ${filter === tab.key ? 'active' : ''} ${tab.key === '_menu' && sidebarOpen ? 'active' : ''}`}
                        onClick={() => handleBottomTab(tab.key)}
                    >
                        <span className="bottom-nav-icon"><tab.IconComp /></span>
                        <span className="bottom-nav-label">{tab.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
}
